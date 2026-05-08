import { Router } from "express";
import { db } from "@workspace/db";
import { jadwalTersediaTable, pengaturanSitusTable, bookingTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";

const router = Router();

type DayRule = {
  isBuka: boolean;
  jamBuka: string;
  jamTutup: string;
  slotMenit: number;
};

type WeeklyRules = Record<string, DayRule>;

type BlacklistEntry = { tanggal: string; alasan: string };

const DEFAULT_RULES: WeeklyRules = {
  "0": { isBuka: true, jamBuka: "09:00", jamTutup: "20:00", slotMenit: 120 },
  "1": { isBuka: true, jamBuka: "09:00", jamTutup: "17:00", slotMenit: 120 },
  "2": { isBuka: true, jamBuka: "09:00", jamTutup: "17:00", slotMenit: 120 },
  "3": { isBuka: true, jamBuka: "09:00", jamTutup: "17:00", slotMenit: 120 },
  "4": { isBuka: true, jamBuka: "09:00", jamTutup: "17:00", slotMenit: 120 },
  "5": { isBuka: true, jamBuka: "09:00", jamTutup: "20:00", slotMenit: 120 },
  "6": { isBuka: true, jamBuka: "09:00", jamTutup: "20:00", slotMenit: 120 },
};

const ATURAN_KEY = "jadwalAturan";
const BLACKLIST_KEY = "jadwalBlacklist";

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

async function loadBlacklist(): Promise<BlacklistEntry[]> {
  const [row] = await db.select().from(pengaturanSitusTable).where(eq(pengaturanSitusTable.key, BLACKLIST_KEY));
  if (!row?.value) return [];
  const val = row.value as any;
  return Array.isArray(val?.dates) ? val.dates : [];
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

function buildSlots(rule: DayRule, afterMinutes?: number): { jamMulai: string; jamSelesai: string }[] {
  if (!rule.isBuka) return [];
  const start = timeToMinutes(rule.jamBuka);
  const end = timeToMinutes(rule.jamTutup);
  if (end <= start) return [];
  const slots: { jamMulai: string; jamSelesai: string }[] = [];
  for (let t = start; t + rule.slotMenit <= end; t += rule.slotMenit) {
    if (afterMinutes !== undefined && t < afterMinutes) continue;
    slots.push({ jamMulai: minutesToTime(t), jamSelesai: minutesToTime(t + rule.slotMenit) });
  }
  return slots;
}

function nowWIBMinutes(): number {
  const nowUTC = new Date();
  const nowWIB = new Date(nowUTC.getTime() + 7 * 60 * 60 * 1000);
  return nowWIB.getUTCHours() * 60 + nowWIB.getUTCMinutes();
}

function todayWIB(): Date {
  const nowUTC = new Date();
  const wibMs = nowUTC.getTime() + 7 * 60 * 60 * 1000;
  const d = new Date(wibMs);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function dayOfWeek(tanggal: string): number {
  const d = new Date(`${tanggal}T12:00:00`);
  return d.getDay();
}

const HARI_LABEL = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

// Ambil jam yang sudah dipesan pada tanggal tertentu (status aktif = menunggu/dikonfirmasi)
async function getBookedSlots(tanggal: string): Promise<Set<string>> {
  const rows = await db
    .select({ jamSesi: bookingTable.jamSesi, status: bookingTable.status })
    .from(bookingTable)
    .where(eq(bookingTable.tanggalSesi, tanggal));

  const booked = new Set<string>();
  for (const r of rows) {
    if (r.status === "menunggu" || r.status === "dikonfirmasi") {
      booked.add(r.jamSesi);
    }
  }
  return booked;
}

router.get("/jadwal/aturan", async (_req, res) => {
  const rules = await loadRules();
  res.json({ rules, hariLabel: HARI_LABEL });
});

router.get("/jadwal/blackout", async (_req, res) => {
  try {
    const dates = await loadBlacklist();
    res.json(dates);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/jadwal", async (req, res) => {
  try {
    const tanggal = typeof req.query.tanggal === "string" ? req.query.tanggal : null;

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

    const [rules, blacklist] = await Promise.all([loadRules(), loadBlacklist()]);
    const blacklistSet = new Set(blacklist.map((b) => b.tanggal));

    if (!tanggal || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
      // Kembalikan slot 30 hari ke depan — filter slot yang sudah terisi
      const out: any[] = [];
      const today = todayWIB();
      const currentMinutes = nowWIBMinutes();

      // Ambil semua booking aktif 30 hari ke depan
      const bookedByDate = new Map<string, Set<string>>();

      for (let i = 0; i < 30; i++) {
        const d = new Date(today);
        d.setUTCDate(today.getUTCDate() + i);
        const yyyy = d.getUTCFullYear();
        const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
        const dd = String(d.getUTCDate()).padStart(2, "0");
        const tgl = `${yyyy}-${mm}-${dd}`;
        if (blacklistSet.has(tgl)) continue;
        const rule = rules[String(d.getUTCDay())];
        if (!rule?.isBuka) continue;
        const afterMin = i === 0 ? currentMinutes : undefined;
        const slots = buildSlots(rule, afterMin);
        if (slots.length > 0) {
          bookedByDate.set(tgl, new Set());
        }
      }

      // Batch query semua booking aktif sekaligus
      const activeDates = Array.from(bookedByDate.keys());
      if (activeDates.length > 0) {
        const allBookings = await db
          .select({ tanggalSesi: bookingTable.tanggalSesi, jamSesi: bookingTable.jamSesi, status: bookingTable.status })
          .from(bookingTable)
          .where(sql`${bookingTable.tanggalSesi} = ANY(${sql.raw(`ARRAY[${activeDates.map((d) => `'${d}'`).join(",")}]::text[]`)}) AND ${bookingTable.status} IN ('menunggu', 'dikonfirmasi')`);

        for (const b of allBookings) {
          const set = bookedByDate.get(b.tanggalSesi);
          if (set) set.add(b.jamSesi);
        }
      }

      for (let i = 0; i < 30; i++) {
        const d = new Date(today);
        d.setUTCDate(today.getUTCDate() + i);
        const yyyy = d.getUTCFullYear();
        const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
        const dd = String(d.getUTCDate()).padStart(2, "0");
        const tgl = `${yyyy}-${mm}-${dd}`;
        if (blacklistSet.has(tgl)) continue;
        const rule = rules[String(d.getUTCDay())];
        if (!rule?.isBuka) continue;
        const afterMin = i === 0 ? currentMinutes : undefined;
        const booked = bookedByDate.get(tgl) ?? new Set<string>();

        for (const slot of buildSlots(rule, afterMin)) {
          out.push({
            id: `${tgl}-${slot.jamMulai}`,
            tanggal: tgl,
            jamMulai: slot.jamMulai,
            jamSelesai: slot.jamSelesai,
            isTersedia: !booked.has(`${slot.jamMulai} - ${slot.jamSelesai}`),
            createdAt: new Date().toISOString(),
          });
        }
      }
      res.json(out);
      return;
    }

    if (blacklistSet.has(tanggal)) {
      res.json([]);
      return;
    }

    const dow = dayOfWeek(tanggal);
    const rule = rules[String(dow)];
    if (!rule?.isBuka) {
      res.json([]);
      return;
    }

    const todayStr = (() => {
      const d = todayWIB();
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    })();
    const afterMin = tanggal === todayStr ? nowWIBMinutes() : undefined;
    const booked = await getBookedSlots(tanggal);

    const slots = buildSlots(rule, afterMin).map((s) => {
      const jamLabel = `${s.jamMulai} - ${s.jamSelesai}`;
      return {
        id: `${tanggal}-${s.jamMulai}`,
        tanggal,
        jamMulai: s.jamMulai,
        jamSelesai: s.jamSelesai,
        isTersedia: !booked.has(jamLabel),
        createdAt: new Date().toISOString(),
      };
    });

    res.json(slots);
  } catch (err) {
    req.log.error({ err }, "Failed to list jadwal");
    res.status(500).json({ error: "Internal server error" });
  }
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

router.put("/admin/jadwal/blackout", requireAdmin, async (req, res) => {
  try {
    const dates = Array.isArray(req.body?.dates) ? req.body.dates : [];
    const validated: BlacklistEntry[] = dates
      .filter((d: any) => d?.tanggal && /^\d{4}-\d{2}-\d{2}$/.test(d.tanggal))
      .map((d: any) => ({ tanggal: d.tanggal, alasan: typeof d.alasan === "string" ? d.alasan : "" }));
    await db
      .insert(pengaturanSitusTable)
      .values({ key: BLACKLIST_KEY, value: { dates: validated } })
      .onConflictDoUpdate({
        target: pengaturanSitusTable.key,
        set: { value: { dates: validated }, updatedAt: sql`now()` },
      });
    res.json(validated);
  } catch (err) {
    req.log.error({ err }, "Failed to save jadwal blackout");
    res.status(500).json({ error: "Internal server error" });
  }
});

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
