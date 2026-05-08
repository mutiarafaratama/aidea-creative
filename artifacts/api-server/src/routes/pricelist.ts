import { Router } from "express";
import { db } from "@workspace/db";
import { pricelistTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAdmin } from "./admin";

const router = Router();

router.get("/pricelist", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(pricelistTable)
      .orderBy(asc(pricelistTable.kategori), asc(pricelistTable.urutan), asc(pricelistTable.createdAt));
    res.json(rows.map((r) => ({
      id: r.id,
      kategori: r.kategori,
      gambarUrl: r.gambarUrl,
      urutan: r.urutan,
      createdAt: r.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to list pricelist");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/pricelist", requireAdmin, async (req, res) => {
  try {
    const { kategori, gambarUrl, urutan } = req.body;
    if (!kategori || !gambarUrl) return res.status(400).json({ error: "kategori dan gambarUrl wajib diisi" });
    const [row] = await db
      .insert(pricelistTable)
      .values({ kategori: kategori.trim(), gambarUrl, urutan: urutan ?? 0 })
      .returning();
    res.status(201).json({ id: row.id, kategori: row.kategori, gambarUrl: row.gambarUrl, urutan: row.urutan, createdAt: row.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create pricelist");
    res.status(400).json({ error: "Bad request" });
  }
});

router.put("/pricelist/:id", requireAdmin, async (req, res) => {
  try {
    const { kategori, gambarUrl, urutan } = req.body;
    const [row] = await db
      .update(pricelistTable)
      .set({ kategori: kategori?.trim(), gambarUrl, urutan: urutan ?? 0 })
      .where(eq(pricelistTable.id, req.params.id))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json({ id: row.id, kategori: row.kategori, gambarUrl: row.gambarUrl, urutan: row.urutan, createdAt: row.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to update pricelist");
    res.status(400).json({ error: "Bad request" });
  }
});

router.delete("/pricelist/:id", requireAdmin, async (req, res) => {
  try {
    await db.delete(pricelistTable).where(eq(pricelistTable.id, req.params.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete pricelist");
    res.status(400).json({ error: "Bad request" });
  }
});

export default router;
