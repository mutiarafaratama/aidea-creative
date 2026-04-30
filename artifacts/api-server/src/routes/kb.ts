import { Router } from "express";
import { db } from "@workspace/db";
import { chatKbTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";

const router = Router();

const fmt = (r: typeof chatKbTable.$inferSelect) => ({
  id: r.id,
  kategori: r.kategori,
  pertanyaan: r.pertanyaan,
  jawaban: r.jawaban,
  keywords: r.keywords ?? [],
  prioritas: r.prioritas,
  isAktif: r.isAktif,
  createdAt: r.createdAt.toISOString(),
});

router.get("/admin/kb", requireAdmin, async (_req, res) => {
  try {
    const rows = await db.select().from(chatKbTable).orderBy(desc(chatKbTable.prioritas), desc(chatKbTable.createdAt));
    res.json(rows.map(fmt));
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/kb", requireAdmin, async (req, res) => {
  try {
    const b = req.body;
    const [row] = await db
      .insert(chatKbTable)
      .values({
        kategori: b.kategori,
        pertanyaan: b.pertanyaan,
        jawaban: b.jawaban,
        keywords: Array.isArray(b.keywords) ? b.keywords : [],
        prioritas: Number(b.prioritas) || 0,
        isAktif: b.isAktif !== false,
      })
      .returning();
    res.status(201).json(fmt(row));
  } catch {
    res.status(400).json({ error: "Bad request" });
  }
});

router.put("/admin/kb/:id", requireAdmin, async (req, res) => {
  try {
    const b = req.body;
    const [row] = await db
      .update(chatKbTable)
      .set({
        kategori: b.kategori,
        pertanyaan: b.pertanyaan,
        jawaban: b.jawaban,
        keywords: Array.isArray(b.keywords) ? b.keywords : [],
        prioritas: Number(b.prioritas) || 0,
        isAktif: b.isAktif !== false,
        updatedAt: new Date(),
      })
      .where(eq(chatKbTable.id, req.params.id))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(fmt(row));
  } catch {
    res.status(400).json({ error: "Bad request" });
  }
});

router.delete("/admin/kb/:id", requireAdmin, async (req, res) => {
  try {
    await db.delete(chatKbTable).where(eq(chatKbTable.id, req.params.id));
    res.status(204).send();
  } catch {
    res.status(400).json({ error: "Bad request" });
  }
});

export default router;
