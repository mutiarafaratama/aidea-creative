import { Router } from "express";
import { db } from "@workspace/db";
import { testimoniTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { attachAuth, requireAuth, requireAdmin } from "../middlewares/auth";

const router = Router();

const formatTestimoni = (r: typeof testimoniTable.$inferSelect) => ({
  id: r.id,
  pelangganId: r.pelangganId,
  bookingId: r.bookingId,
  pesananId: r.pesananId,
  rating: r.rating,
  komentar: r.komentar,
  namaTampil: r.namaTampil,
  fotoUrl: r.fotoUrl,
  isApproved: r.isApproved,
  createdAt: r.createdAt.toISOString(),
});

router.get("/testimoni", async (req, res) => {
  try {
    const { all } = req.query;
    const q = db.select().from(testimoniTable).orderBy(desc(testimoniTable.createdAt));
    const rows = all === "true" ? await q : await q.where(eq(testimoniTable.isApproved, true));
    res.json(rows.map(formatTestimoni));
  } catch (err) {
    req.log.error({ err }, "Failed to list testimoni");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/testimoni/me", requireAuth, async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(testimoniTable)
      .where(eq(testimoniTable.pelangganId, req.authUser!.id))
      .orderBy(desc(testimoniTable.createdAt));
    res.json(rows.map(formatTestimoni));
  } catch (err) {
    req.log.error({ err }, "Failed to list my testimoni");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/testimoni", attachAuth, async (req, res) => {
  try {
    const body = req.body;
    const [row] = await db
      .insert(testimoniTable)
      .values({
        namaTampil: body.namaTampil,
        rating: body.rating,
        komentar: body.komentar,
        fotoUrl: body.fotoUrl ?? null,
        bookingId: body.bookingId ?? null,
        pesananId: body.pesananId ?? null,
        pelangganId: req.authUser?.id ?? null,
        isApproved: false,
      })
      .returning();
    res.status(201).json(formatTestimoni(row));
  } catch (err) {
    req.log.error({ err }, "Failed to create testimoni");
    res.status(400).json({ error: "Bad request" });
  }
});

router.patch("/testimoni/:id", requireAdmin, async (req, res) => {
  try {
    const [row] = await db
      .update(testimoniTable)
      .set({ isApproved: req.body.isApproved })
      .where(eq(testimoniTable.id, req.params.id))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(formatTestimoni(row));
  } catch (err) {
    req.log.error({ err }, "Failed to update testimoni");
    res.status(400).json({ error: "Bad request" });
  }
});

router.delete("/testimoni/:id", requireAdmin, async (req, res) => {
  try {
    await db.delete(testimoniTable).where(eq(testimoniTable.id, req.params.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete testimoni");
    res.status(400).json({ error: "Bad request" });
  }
});

export default router;
