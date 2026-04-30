import { Router } from "express";
import { db } from "@workspace/db";
import { promoTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";

const router = Router();

const formatPromo = (r: typeof promoTable.$inferSelect) => ({
  id: r.id,
  judul: r.judul,
  deskripsi: r.deskripsi,
  badge: r.badge,
  gambarUrl: r.gambarUrl,
  link: r.link,
  ctaLabel: r.ctaLabel,
  warna: r.warna,
  tampilMarquee: r.tampilMarquee,
  tampilCard: r.tampilCard,
  tanggalMulai: r.tanggalMulai ? r.tanggalMulai.toISOString() : null,
  tanggalBerakhir: r.tanggalBerakhir ? r.tanggalBerakhir.toISOString() : null,
  isAktif: r.isAktif,
  urutan: r.urutan,
  createdAt: r.createdAt.toISOString(),
});

router.get("/promo", async (req, res) => {
  try {
    const rows = await db.select().from(promoTable).orderBy(asc(promoTable.urutan), asc(promoTable.createdAt));
    res.json(rows.map(formatPromo));
  } catch (err) {
    req.log.error({ err }, "Failed to list promo");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/promo", async (req, res) => {
  try {
    const body = req.body;
    const [row] = await db
      .insert(promoTable)
      .values({
        judul: body.judul,
        deskripsi: body.deskripsi,
        badge: body.badge ?? null,
        gambarUrl: body.gambarUrl ?? null,
        link: body.link ?? null,
        ctaLabel: body.ctaLabel ?? null,
        warna: body.warna ?? "primary",
        tampilMarquee: body.tampilMarquee ?? true,
        tampilCard: body.tampilCard ?? true,
        tanggalMulai: body.tanggalMulai ? new Date(body.tanggalMulai) : null,
        tanggalBerakhir: body.tanggalBerakhir ? new Date(body.tanggalBerakhir) : null,
        isAktif: body.isAktif ?? true,
        urutan: body.urutan ?? 0,
      })
      .returning();
    res.status(201).json(formatPromo(row));
  } catch (err) {
    req.log.error({ err }, "Failed to create promo");
    res.status(400).json({ error: "Bad request" });
  }
});

router.put("/promo/:id", async (req, res) => {
  try {
    const body = req.body;
    const [row] = await db
      .update(promoTable)
      .set({
        judul: body.judul,
        deskripsi: body.deskripsi,
        badge: body.badge ?? null,
        gambarUrl: body.gambarUrl ?? null,
        link: body.link ?? null,
        ctaLabel: body.ctaLabel ?? null,
        warna: body.warna ?? "primary",
        tampilMarquee: body.tampilMarquee ?? true,
        tampilCard: body.tampilCard ?? true,
        tanggalMulai: body.tanggalMulai ? new Date(body.tanggalMulai) : null,
        tanggalBerakhir: body.tanggalBerakhir ? new Date(body.tanggalBerakhir) : null,
        isAktif: body.isAktif,
        urutan: body.urutan ?? 0,
      })
      .where(eq(promoTable.id, req.params.id))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(formatPromo(row));
  } catch (err) {
    req.log.error({ err }, "Failed to update promo");
    res.status(400).json({ error: "Bad request" });
  }
});

router.delete("/promo/:id", async (req, res) => {
  try {
    await db.delete(promoTable).where(eq(promoTable.id, req.params.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete promo");
    res.status(400).json({ error: "Bad request" });
  }
});

export default router;
