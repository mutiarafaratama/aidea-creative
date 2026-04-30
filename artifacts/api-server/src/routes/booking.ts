import { Router } from "express";
import { db } from "@workspace/db";
import { bookingTable, paketLayananTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { attachAuth } from "../middlewares/auth";

const router = Router();

function generateKodeBooking(): string {
  const now = new Date();
  const tgl = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  return `IDC-${tgl}-${rand}`;
}

const formatBooking = (r: typeof bookingTable.$inferSelect) => ({
  id: r.id,
  kodeBooking: r.kodeBooking,
  pelangganId: r.pelangganId,
  paketId: r.paketId,
  namaPemesan: r.namaPemesan,
  email: r.email,
  telepon: r.telepon,
  tanggalSesi: r.tanggalSesi,
  jamSesi: r.jamSesi,
  catatanPelanggan: r.catatanPelanggan,
  konsepFoto: r.konsepFoto,
  status: r.status,
  totalHarga: r.totalHarga,
  statusPembayaran: r.statusPembayaran,
  createdAt: r.createdAt.toISOString(),
});

router.get("/booking", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(bookingTable)
      .orderBy(desc(bookingTable.createdAt));
    res.json(rows.map(formatBooking));
  } catch (err) {
    req.log.error({ err }, "Failed to list booking");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/booking", attachAuth, async (req, res) => {
  try {
    const body = req.body;
    const [paket] = await db
      .select()
      .from(paketLayananTable)
      .where(eq(paketLayananTable.id, body.paketId));
    if (!paket) return res.status(400).json({ error: "Paket tidak ditemukan" });

    const [row] = await db
      .insert(bookingTable)
      .values({
        kodeBooking: generateKodeBooking(),
        pelangganId: req.authUser?.id ?? null,
        paketId: body.paketId,
        namaPemesan: body.namaPemesan,
        email: body.email,
        telepon: body.telepon,
        tanggalSesi: body.tanggalSesi,
        jamSesi: body.jamSesi,
        catatanPelanggan: body.catatanPelanggan ?? null,
        konsepFoto: body.konsepFoto ?? null,
        status: "menunggu",
        totalHarga: paket.harga,
        statusPembayaran: "belum_bayar",
      })
      .returning();
    res.status(201).json(formatBooking(row));
  } catch (err) {
    req.log.error({ err }, "Failed to create booking");
    res.status(400).json({ error: "Bad request" });
  }
});

router.get("/booking/:id", async (req, res) => {
  try {
    const [row] = await db
      .select()
      .from(bookingTable)
      .where(eq(bookingTable.id, req.params.id));
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(formatBooking(row));
  } catch (err) {
    req.log.error({ err }, "Failed to get booking");
    res.status(404).json({ error: "Not found" });
  }
});

router.put("/booking/:id", async (req, res) => {
  try {
    const body = req.body;
    const updateData: Record<string, unknown> = {};
    if (body.status) updateData.status = body.status;
    if (body.statusPembayaran) updateData.statusPembayaran = body.statusPembayaran;

    const [row] = await db
      .update(bookingTable)
      .set(updateData)
      .where(eq(bookingTable.id, req.params.id))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(formatBooking(row));
  } catch (err) {
    req.log.error({ err }, "Failed to update booking status");
    res.status(400).json({ error: "Bad request" });
  }
});

export default router;
