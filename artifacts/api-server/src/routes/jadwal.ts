import { Router } from "express";
import { db } from "@workspace/db";
import { jadwalTersediaTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";

const router = Router();

const format = (r: typeof jadwalTersediaTable.$inferSelect) => ({
  id: r.id,
  tanggal: r.tanggal,
  jamMulai: r.jamMulai,
  jamSelesai: r.jamSelesai,
  isTersedia: r.isTersedia,
  createdAt: r.createdAt.toISOString(),
});

router.get("/jadwal", async (req, res) => {
  try {
    const { all } = req.query;
    const q = db.select().from(jadwalTersediaTable).orderBy(jadwalTersediaTable.tanggal);
    const rows = all === "true" ? await q : await q.where(eq(jadwalTersediaTable.isTersedia, true));
    res.json(rows.map(format));
  } catch (err) {
    req.log.error({ err }, "Failed to list jadwal");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/jadwal", requireAdmin, async (req, res) => {
  try {
    const { tanggal, jamMulai, jamSelesai, isTersedia = true } = req.body;
    const [row] = await db.insert(jadwalTersediaTable).values({ tanggal, jamMulai, jamSelesai, isTersedia }).returning();
    res.status(201).json(format(row));
  } catch (err) {
    req.log.error({ err }, "Failed to create jadwal");
    res.status(400).json({ error: "Bad request" });
  }
});

router.patch("/jadwal/:id", requireAdmin, async (req, res) => {
  try {
    const [row] = await db.update(jadwalTersediaTable).set(req.body).where(eq(jadwalTersediaTable.id, req.params.id)).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(format(row));
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
