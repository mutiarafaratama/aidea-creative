import { Router } from "express";
import { db } from "@workspace/db";
import { paketLayananTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const formatPaket = (r: typeof paketLayananTable.$inferSelect) => ({
  id: r.id,
  kategoriId: r.kategoriId,
  namaPaket: r.namaPaket,
  deskripsi: r.deskripsi,
  harga: r.harga,
  durasiSesi: r.durasiSesi,
  jumlahFoto: r.jumlahFoto,
  fasilitas: Array.isArray(r.fasilitas) ? (r.fasilitas as string[]) : [],
  isPopuler: r.isPopuler,
  isAktif: r.isAktif,
  createdAt: r.createdAt.toISOString(),
});

router.get("/paket", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(paketLayananTable)
      .orderBy(paketLayananTable.createdAt);
    res.json(rows.map(formatPaket));
  } catch (err) {
    req.log.error({ err }, "Failed to list paket");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/paket", async (req, res) => {
  try {
    const body = req.body;
    const [row] = await db
      .insert(paketLayananTable)
      .values({
        kategoriId: body.kategoriId ?? null,
        namaPaket: body.namaPaket,
        deskripsi: body.deskripsi,
        harga: body.harga,
        durasiSesi: body.durasiSesi ?? 60,
        jumlahFoto: body.jumlahFoto ?? 20,
        fasilitas: body.fasilitas ?? [],
        isPopuler: body.isPopuler ?? false,
        isAktif: body.isAktif ?? true,
      })
      .returning();
    res.status(201).json(formatPaket(row));
  } catch (err) {
    req.log.error({ err }, "Failed to create paket");
    res.status(400).json({ error: "Bad request" });
  }
});

router.get("/paket/:id", async (req, res) => {
  try {
    const [row] = await db
      .select()
      .from(paketLayananTable)
      .where(eq(paketLayananTable.id, req.params.id));
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(formatPaket(row));
  } catch (err) {
    req.log.error({ err }, "Failed to get paket");
    res.status(404).json({ error: "Not found" });
  }
});

router.put("/paket/:id", async (req, res) => {
  try {
    const body = req.body;
    const [row] = await db
      .update(paketLayananTable)
      .set({
        kategoriId: body.kategoriId ?? null,
        namaPaket: body.namaPaket,
        deskripsi: body.deskripsi,
        harga: body.harga,
        durasiSesi: body.durasiSesi,
        jumlahFoto: body.jumlahFoto,
        fasilitas: body.fasilitas,
        isPopuler: body.isPopuler,
        isAktif: body.isAktif,
      })
      .where(eq(paketLayananTable.id, req.params.id))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(formatPaket(row));
  } catch (err) {
    req.log.error({ err }, "Failed to update paket");
    res.status(400).json({ error: "Bad request" });
  }
});

router.delete("/paket/:id", async (req, res) => {
  try {
    await db.delete(paketLayananTable).where(eq(paketLayananTable.id, req.params.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete paket");
    res.status(400).json({ error: "Bad request" });
  }
});

export default router;
