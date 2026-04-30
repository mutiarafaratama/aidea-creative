import { Router } from "express";
import { db } from "@workspace/db";
import { produkTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const formatProduk = (r: typeof produkTable.$inferSelect) => ({
  id: r.id,
  namaProduk: r.namaProduk,
  deskripsi: r.deskripsi,
  harga: r.harga,
  stok: r.stok,
  kategori: r.kategori,
  ukuran: r.ukuran,
  gambarUrl: Array.isArray(r.gambarUrl) ? (r.gambarUrl as string[]) : [],
  isAktif: r.isAktif,
  createdAt: r.createdAt.toISOString(),
});

router.get("/produk", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(produkTable)
      .orderBy(produkTable.createdAt);
    res.json(rows.map(formatProduk));
  } catch (err) {
    req.log.error({ err }, "Failed to list produk");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/produk", async (req, res) => {
  try {
    const body = req.body;
    const [row] = await db
      .insert(produkTable)
      .values({
        namaProduk: body.namaProduk,
        deskripsi: body.deskripsi,
        harga: body.harga,
        stok: body.stok ?? 0,
        kategori: body.kategori,
        ukuran: body.ukuran ?? null,
        gambarUrl: body.gambarUrl ?? [],
        isAktif: body.isAktif ?? true,
      })
      .returning();
    res.status(201).json(formatProduk(row));
  } catch (err) {
    req.log.error({ err }, "Failed to create produk");
    res.status(400).json({ error: "Bad request" });
  }
});

router.get("/produk/:id", async (req, res) => {
  try {
    const [row] = await db
      .select()
      .from(produkTable)
      .where(eq(produkTable.id, req.params.id));
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(formatProduk(row));
  } catch (err) {
    req.log.error({ err }, "Failed to get produk");
    res.status(404).json({ error: "Not found" });
  }
});

router.put("/produk/:id", async (req, res) => {
  try {
    const body = req.body;
    const [row] = await db
      .update(produkTable)
      .set({
        namaProduk: body.namaProduk,
        deskripsi: body.deskripsi,
        harga: body.harga,
        stok: body.stok,
        kategori: body.kategori,
        ukuran: body.ukuran ?? null,
        gambarUrl: body.gambarUrl ?? [],
        isAktif: body.isAktif,
      })
      .where(eq(produkTable.id, req.params.id))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(formatProduk(row));
  } catch (err) {
    req.log.error({ err }, "Failed to update produk");
    res.status(400).json({ error: "Bad request" });
  }
});

router.delete("/produk/:id", async (req, res) => {
  try {
    await db.delete(produkTable).where(eq(produkTable.id, req.params.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete produk");
    res.status(400).json({ error: "Bad request" });
  }
});

export default router;
