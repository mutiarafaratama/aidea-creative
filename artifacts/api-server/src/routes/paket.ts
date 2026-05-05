import { Router } from "express";
import { db } from "@workspace/db";
import { paketLayananTable, bookingTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

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
  fotoUrl: r.fotoUrl ?? null,
  isPopuler: r.isPopuler,
  isAktif: r.isAktif,
  createdAt: r.createdAt.toISOString(),
});

// Recommendation endpoint — sorts packages by booking frequency (ML-lite)
router.get("/paket/rekomendasi", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 4, 10);

    // Count confirmed/completed bookings per paket
    const bookingCounts = await db
      .select({
        paketId: bookingTable.paketId,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(bookingTable)
      .groupBy(bookingTable.paketId);

    const countMap = new Map(bookingCounts.map((r) => [r.paketId, r.count]));

    const pakets = await db
      .select()
      .from(paketLayananTable)
      .where(eq(paketLayananTable.isAktif, true));

    // Sort: most booked first, then isPopuler, then createdAt
    const sorted = pakets
      .map((p) => ({ ...p, bookingCount: countMap.get(p.id) ?? 0 }))
      .sort(
        (a, b) =>
          b.bookingCount - a.bookingCount ||
          Number(b.isPopuler) - Number(a.isPopuler) ||
          a.createdAt.getTime() - b.createdAt.getTime(),
      );

    res.json(
      sorted.slice(0, limit).map((p) => ({
        ...formatPaket(p),
        bookingCount: p.bookingCount,
      })),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to get paket rekomendasi");
    res.status(500).json({ error: "Internal server error" });
  }
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
        fotoUrl: body.fotoUrl ?? null,
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
        fotoUrl: body.fotoUrl ?? null,
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
