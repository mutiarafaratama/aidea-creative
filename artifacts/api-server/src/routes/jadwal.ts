import { Router } from "express";
import { db } from "@workspace/db";
import { jadwalTersediaTable, pengaturanSitusTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";

const router = Router();

// ---------- Recurring weekly rules ----------
//
// Stored in pengaturan_situs under key "jadwalAturan" as:
//   { "0": { isBuka, jamBuka, jamTutup, slotMenit }, "1": {...}, ... }
// Day index: 0=Minggu, 1=Senin, ..., 6=Sabtu (matches Date.getDay()).

type DayRule = {
  isBuka: boolean;
  jamBuka: string;   // "HH:MM"
  jamTutup: string;  // "HH:MM"
  slotMenit: number; // duration of each slot in minutes
};

type WeeklyRules = Record<string, DayRule>;

const DEFAULT_RULES: WeeklyRules = {
  "0": { isBuka: true, jamBuka: "09:00", jamTutup: "20:00", slotMenit: 120 }, // Minggu
  "1": { isBuka: true, jamBuka: "09:00", jamTutup: "17:00", slotMenit: 120 }, // Senin
  "2": { isBuka: true, jamBuka: "09:00", jamTutup: "17:00", slotMenit: 120 },
  "3": { isBuka: true, jamBuka: "09:00", jamTutup: "17:00", slotMenit: 120 },
  "4": { isBuka: true, jamBuka: "09:00", jamTutup: "17:00", slotMenit: 120 }, // Kamis
  "5": { isBuka: true, jamBuka: "09:00", jamTutup: "20:00", slotMenit: 120 }, // Jumat
  "6": { isBuka: true, jamBuka: "09:00", jamTutup: "20:00", slotMenit: 120 }, // Sabtu
};

const ATURAN_KEY = "jadwalAturan";

function normalizeRules(raw: any): WeeklyRules {
  const out: WeeklyRules = { ...DEFAULT_RULES };
  if (raw && typeof raw === "object") {
    for (let i = 0; i < 7; i++) {
      const key = String(i);
      const incoming = raw[key];
      if (incoming && typeof incoming === "object") {
        const slot = Math.max(15, Math.min(480, Number(incoming.slotMenit) || 120));
        out[key] = {
          isBuka: incoming.isBuka !== false,
          jamBuka: typeof incoming.jamBuka === "string" ? incoming.jamBuka : "09:00",
          jamTutup: typeof incoming.jamTutup === "string" ? incoming.jamTutup : "17:00",
          slotMenit: slot,
        };
      }
    }
  }
  return out;
}

async function loadRules(): Promise<WeeklyRules> {
  const [row] = await db.select().from(pengaturanSitusTable).where(eq(pengaturanSitusTable.key, ATURAN_KEY));
  return normalizeRules(row?.value);
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map((n) => Number(n));
  return (h || 0) * 60 + (m || 0);
}
function minutesToTime(m: number): string {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function buildSlots(rule: DayRule): { jamMulai: string; jamSelesai: string }[] {
  if (!rule.isBuka) return [];
  const start = timeToMinutes(rule.jamBuka);
  const end = timeToMinutes(rule.jamTutup);
  if (end <= start) return [];
  const slots: { jamMulai: string; jamSelesai: string }[] = [];
  for (let t = start; t + rule.slotMenit <= end; t += rule.slotMenit) {
    slots.push({ jamMulai: minutesToTime(t), jamSelesai: minutesToTime(t + rule.slotMenit) });
  }
  return slots;
}

function dayOfWeek(tanggal: string): number {
  // tanggal "YYYY-MM-DD" interpreted as local-noon to avoid TZ drift.
  const d = new Date(`${tanggal}T12:00:00`);
  return d.getDay();
}

// ---------- Public read endpoints ----------

const HARI_LABEL = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

router.get("/jadwal", async (req, res) => {
  try {
    const tanggal = typeof req.query.tanggal === "string" ? req.query.tanggal : null;

    // Backward-compat: when ?all=true is passed (legacy admin), still return any
    // rows from the old per-date table so existing data isn't lost.
    if (req.query.all === "true") {
      const rows = await db.select().from(jadwalTersediaTable).orderBy(jadwalTersediaTable.tanggal);
      res.json(rows.map((r) => ({
        id: r.id,
        tanggal: r.tanggal,
        jamMulai: r.jamMulai,
        jamSelesai: r.jamSelesai,
        isTersedia: r.isTersedia,
        createdAt: r.createdAt.toISOString(),
      })));
      return;
    }

    const rules = await loadRules();

    if (!tanggal || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
      // No date filter — return next 30 days of derived availability so
      // legacy callers (booking page useListJadwal hook) still work.
      const out: any[] = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      for (let i = 0; i < 30; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        const tgl = `${yyyy}-${mm}-${dd}`;
        const rule = rules[String(d.getDay())];
        if (!rule?.isBuka) continue;
        for (const slot of buildSlots(rule)) {
          out.push({
            id: `${tgl}-${slot.jamMulai}`,
            tanggal: tgl,
            jamMulai: slot.jamMulai,
            jamSelesai: slot.jamSelesai,
            isTersedia: true,
            createdAt: new Date().toISOString(),
          });
        }
      }
      res.json(out);
      return;
    }

    const dow = dayOfWeek(tanggal);
    const rule = rules[String(dow)];
    if (!rule?.isBuka) {
      res.json([]);
      return;
    }
    const slots = buildSlots(rule).map((s, i) => ({
      id: `${tanggal}-${s.jamMulai}`,
      tanggal,
      jamMulai: s.jamMulai,
      jamSelesai: s.jamSelesai,
      isTersedia: true,
      createdAt: new Date().toISOString(),
    }));
    res.json(slots);
  } catch (err) {
    req.log.error({ err }, "Failed to list jadwal");
    res.status(500).json({ error: "Internal server error" });
  }
});

// New: rules CRUD for the simplified admin UI.
router.get("/jadwal/aturan", async (_req, res) => {
  const rules = await loadRules();
  res.json({
    rules,
    hariLabel: HARI_LABEL,
  });
});

router.put("/admin/jadwal/aturan", requireAdmin, async (req, res) => {
  try {
    const incoming = req.body?.rules ?? req.body;
    const rules = normalizeRules(incoming);
    await db
      .insert(pengaturanSitusTable)
      .values({ key: ATURAN_KEY, value: rules })
      .onConflictDoUpdate({
        target: pengaturanSitusTable.key,
        set: { value: rules, updatedAt: sql`now()` },
      });
    res.json({ rules, hariLabel: HARI_LABEL });
  } catch (err) {
    req.log.error({ err }, "Failed to save jadwal aturan");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------- Legacy per-date endpoints (kept so admin bookings page that
// references existing jadwal rows still works) ----------

const formatLegacy = (r: typeof jadwalTersediaTable.$inferSelect) => ({
  id: r.id,
  tanggal: r.tanggal,
  jamMulai: r.jamMulai,
  jamSelesai: r.jamSelesai,
  isTersedia: r.isTersedia,
  createdAt: r.createdAt.toISOString(),
});

router.post("/jadwal", requireAdmin, async (req, res) => {
  try {
    const { tanggal, jamMulai, jamSelesai, isTersedia = true } = req.body;
    const [row] = await db.insert(jadwalTersediaTable).values({ tanggal, jamMulai, jamSelesai, isTersedia }).returning();
    res.status(201).json(formatLegacy(row));
  } catch (err) {
    req.log.error({ err }, "Failed to create jadwal");
    res.status(400).json({ error: "Bad request" });
  }
});

router.patch("/jadwal/:id", requireAdmin, async (req, res) => {
  try {
    const [row] = await db.update(jadwalTersediaTable).set(req.body).where(eq(jadwalTersediaTable.id, req.params.id)).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(formatLegacy(row));
  } catch (err) {
    req.log.error({ err }, "Failed to update jadwal");
    res.status(400).json({ error: "Bad request" });
  }
});

router.delete("/jadwal/:id", requireAdmin, async (req, res) => {
  try {
    await db.delete(jadwalTersediaTable).where(eq(jadwalTersediaTable.id, req.params.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete jadwal");
    res.status(400).json({ error: "Bad request" });
  }
});

export default router;
