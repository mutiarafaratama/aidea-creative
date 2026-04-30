import { Router } from "express";
import { db } from "@workspace/db";
import { bookingTable, produkTable, testimoniTable } from "@workspace/db";
import { sql, desc, eq } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";

const router = Router();

router.use("/dashboard", requireAdmin);

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

router.get("/dashboard/stats", async (req, res) => {
  try {
    const [bookingStats] = await db
      .select({
        totalBooking: sql<number>`count(*)::int`,
        bookingBulanIni: sql<number>`count(case when date_trunc('month', created_at) = date_trunc('month', now()) then 1 end)::int`,
        totalPendapatan: sql<number>`coalesce(sum(total_harga), 0)`,
        pendapatanBulanIni: sql<number>`coalesce(sum(case when date_trunc('month', created_at) = date_trunc('month', now()) then total_harga else 0 end), 0)`,
      })
      .from(bookingTable);

    const [produkStats] = await db
      .select({ totalProduk: sql<number>`count(*)::int` })
      .from(produkTable);

    const [testimoniStats] = await db
      .select({
        ratingRataRata: sql<number>`coalesce(avg(rating), 0)`,
        totalTestimoni: sql<number>`count(*)::int`,
      })
      .from(testimoniTable)
      .where(eq(testimoniTable.isApproved, true));

    res.json({
      totalBooking: bookingStats?.totalBooking ?? 0,
      bookingBulanIni: bookingStats?.bookingBulanIni ?? 0,
      totalPendapatan: Number(bookingStats?.totalPendapatan ?? 0),
      pendapatanBulanIni: Number(bookingStats?.pendapatanBulanIni ?? 0),
      totalProduk: produkStats?.totalProduk ?? 0,
      ratingRataRata: Number(Number(testimoniStats?.ratingRataRata ?? 0).toFixed(1)),
      totalTestimoni: testimoniStats?.totalTestimoni ?? 0,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/recent-bookings", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(bookingTable)
      .orderBy(desc(bookingTable.createdAt))
      .limit(10);
    res.json(rows.map(formatBooking));
  } catch (err) {
    req.log.error({ err }, "Failed to get recent bookings");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/booking-by-status", async (req, res) => {
  try {
    const rows = await db
      .select({
        status: bookingTable.status,
        count: sql<number>`count(*)::int`,
      })
      .from(bookingTable)
      .groupBy(bookingTable.status);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Failed to get booking by status");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
