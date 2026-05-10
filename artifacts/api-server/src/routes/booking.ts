import { Router } from "express";
import { db } from "@workspace/db";
import { bookingTable, paketLayananTable, promoTable, pengaturanSitusTable } from "@workspace/db";
import { eq, desc, and, ne, sql } from "drizzle-orm";
import { attachAuth, requireAdmin } from "../middlewares/auth";
import { sendPushToUser } from "./push";

const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim();
const clientKey = process.env.VITE_MIDTRANS_CLIENT_KEY?.trim();

async function getAdminWa(): Promise<string> {
  try {
    const [row] = await db
      .select()
      .from(pengaturanSitusTable)
      .where(eq(pengaturanSitusTable.key, "contactWhatsapp"));
    if (row?.value && typeof row.value === "string") {
      return row.value.replace(/\D/g, "").replace(/^0/, "62");
    }
    return "";
  } catch {
    return "";
  }
}

function getSnap() {
  if (!serverKey) return null;
  try {
    const { Snap } = require("midtrans-client") as any;
    return new Snap({ isProduction: false, serverKey, clientKey });
  } catch { return null; }
}

const router = Router();

function generateKodeBooking(): string {
  const now = new Date();
  const tgl = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  return `IDC-${tgl}-${rand}`;
}

const formatBooking = (
  r: typeof bookingTable.$inferSelect,
  namaPaket?: string | null,
  namaPromo?: string | null,
  adminWa?: string,
) => ({
  id: r.id,
  kodeBooking: r.kodeBooking,
  pelangganId: r.pelangganId,
  paketId: r.paketId,
  namaPaket: namaPaket ?? null,
  namaPemesan: r.namaPemesan,
  email: r.email,
  telepon: r.telepon,
  tanggalSesi: r.tanggalSesi,
  jamSesi: r.jamSesi,
  catatanPelanggan: r.catatanPelanggan,
  konsepFoto: r.konsepFoto,
  status: r.status,
  totalHarga: r.totalHarga,
  hargaAsli: r.hargaAsli ?? r.totalHarga,
  diskonAmount: r.diskonAmount ?? 0,
  promoId: r.promoId ?? null,
  namaPromo: namaPromo ?? null,
  statusPembayaran: r.statusPembayaran,
  alasanPembatalan: r.alasanPembatalan ?? null,
  dibatalkanOleh: r.dibatalkanOleh ?? null,
  createdAt: r.createdAt.toISOString(),
  adminWa: adminWa ?? "",
});

// Helper: cek apakah slot sudah terisi
async function isSlotBooked(tanggalSesi: string, jamSesi: string, excludeBookingId?: string): Promise<boolean> {
  const conditions = [
    eq(bookingTable.tanggalSesi, tanggalSesi),
    eq(bookingTable.jamSesi, jamSesi),
  ];
  if (excludeBookingId) {
    conditions.push(ne(bookingTable.id, excludeBookingId));
  }

  const rows = await db
    .select({ id: bookingTable.id, status: bookingTable.status })
    .from(bookingTable)
    .where(and(...conditions));

  return rows.some((r) => r.status === "menunggu" || r.status === "dikonfirmasi");
}

router.get("/booking/me", attachAuth, async (req, res) => {
  try {
    if (!req.authUser) return res.status(401).json({ error: "Unauthorized" });
    const [rows, adminWa] = await Promise.all([
      db
        .select({ booking: bookingTable, namaPaket: paketLayananTable.namaPaket, namaPromo: promoTable.judul })
        .from(bookingTable)
        .leftJoin(paketLayananTable, eq(bookingTable.paketId, paketLayananTable.id))
        .leftJoin(promoTable, eq(bookingTable.promoId, promoTable.id))
        .where(eq(bookingTable.pelangganId, req.authUser.id))
        .orderBy(desc(bookingTable.createdAt)),
      getAdminWa(),
    ]);
    res.json(rows.map((r) => formatBooking(r.booking, r.namaPaket, r.namaPromo, adminWa)));
  } catch (err) {
    req.log.error({ err }, "Failed to list my bookings");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/booking", async (req, res) => {
  try {
    const [rows, adminWa] = await Promise.all([
      db
        .select({ booking: bookingTable, namaPaket: paketLayananTable.namaPaket, namaPromo: promoTable.judul })
        .from(bookingTable)
        .leftJoin(paketLayananTable, eq(bookingTable.paketId, paketLayananTable.id))
        .leftJoin(promoTable, eq(bookingTable.promoId, promoTable.id))
        .orderBy(desc(bookingTable.createdAt)),
      getAdminWa(),
    ]);
    res.json(rows.map((r) => formatBooking(r.booking, r.namaPaket, r.namaPromo, adminWa)));
  } catch (err) {
    req.log.error({ err }, "Failed to list booking");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/booking", attachAuth, async (req, res) => {
  try {
    const body = req.body;

    // 1. Validasi paket
    const [paket] = await db
      .select()
      .from(paketLayananTable)
      .where(eq(paketLayananTable.id, body.paketId));
    if (!paket) return res.status(400).json({ error: "Paket tidak ditemukan" });

    // 2. CEK KONFLIK JADWAL — slot yang sama tidak boleh double booking
    const konflikt = await isSlotBooked(body.tanggalSesi, body.jamSesi);
    if (konflikt) {
      return res.status(409).json({
        error: "Jadwal sudah dipesan orang lain. Silakan pilih tanggal atau jam yang lain.",
      });
    }

    // 3. Hitung diskon dari promo (jika ada)
    let hargaAsli = paket.harga;
    let diskonAmount = 0;
    let totalHarga = paket.harga;
    let promoId: string | null = null;
    let promoRow: typeof promoTable.$inferSelect | null = null;

    if (body.promoId) {
      const [promo] = await db.select().from(promoTable).where(eq(promoTable.id, body.promoId));
      if (promo && promo.isAktif) {
        // Validasi periode
        const now = new Date();
        if (promo.tanggalMulai && now < promo.tanggalMulai) {
          return res.status(400).json({ error: "Promo belum berlaku." });
        }
        if (promo.tanggalBerakhir && now > promo.tanggalBerakhir) {
          return res.status(400).json({ error: "Promo sudah berakhir." });
        }
        // Validasi paket (jika promo hanya untuk paket tertentu)
        if (promo.paketId && promo.paketId !== body.paketId) {
          return res.status(400).json({ error: "Promo ini tidak berlaku untuk paket yang dipilih." });
        }
        // Validasi kuota
        if (promo.kuota != null && promo.terpakai >= promo.kuota) {
          return res.status(400).json({ error: "Kuota promo sudah habis." });
        }
        // Hitung diskon
        if (promo.tipeDiskon === "persen" && promo.nilaiDiskon) {
          diskonAmount = Math.floor(paket.harga * promo.nilaiDiskon / 100);
        } else if (promo.tipeDiskon === "nominal" && promo.nilaiDiskon) {
          diskonAmount = Math.min(promo.nilaiDiskon, paket.harga);
        }
        totalHarga = paket.harga - diskonAmount;
        promoId = promo.id;
        promoRow = promo;
      }
    }

    // 4. Buat booking
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
        totalHarga,
        hargaAsli,
        diskonAmount,
        promoId,
        statusPembayaran: "belum_bayar",
      })
      .returning();

    // 5. Increment terpakai pada promo jika digunakan
    if (promoId) {
      await db
        .update(promoTable)
        .set({ terpakai: sql`${promoTable.terpakai} + 1` })
        .where(eq(promoTable.id, promoId));
    }

    const adminWa = await getAdminWa();
    res.status(201).json(formatBooking(row, paket.namaPaket, promoRow?.judul ?? null, adminWa));
  } catch (err) {
    req.log.error({ err }, "Failed to create booking");
    res.status(400).json({ error: "Gagal membuat booking." });
  }
});

router.get("/booking/:id", async (req, res) => {
  try {
    const rows = await db
      .select({ booking: bookingTable, namaPaket: paketLayananTable.namaPaket, namaPromo: promoTable.judul })
      .from(bookingTable)
      .leftJoin(paketLayananTable, eq(bookingTable.paketId, paketLayananTable.id))
      .leftJoin(promoTable, eq(bookingTable.promoId, promoTable.id))
      .where(eq(bookingTable.id, req.params.id));
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    const { booking, namaPaket, namaPromo } = rows[0];
    const adminWa = await getAdminWa();
    res.json(formatBooking(booking, namaPaket, namaPromo, adminWa));
  } catch (err) {
    req.log.error({ err }, "Failed to get booking");
    res.status(404).json({ error: "Not found" });
  }
});

router.put("/booking/:id", requireAdmin, async (req, res) => {
  try {
    const body = req.body;
    const updateData: Record<string, unknown> = {};
    if (body.status) updateData.status = body.status;
    if (body.statusPembayaran) updateData.statusPembayaran = body.statusPembayaran;
    if (body.status === "dibatalkan") {
      updateData.dibatalkanOleh = "admin";
      updateData.alasanPembatalan = body.alasanPembatalan ?? null;
    }

    const [row] = await db
      .update(bookingTable)
      .set(updateData)
      .where(eq(bookingTable.id, req.params.id))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });

    const [paketRow, adminWa] = await Promise.all([
      db.select({ namaPaket: paketLayananTable.namaPaket }).from(paketLayananTable).where(eq(paketLayananTable.id, row.paketId)).then((r) => r[0]),
      getAdminWa(),
    ]);

    let namaPromo: string | null = null;
    if (row.promoId) {
      const [promoRow] = await db.select({ judul: promoTable.judul }).from(promoTable).where(eq(promoTable.id, row.promoId));
      namaPromo = promoRow?.judul ?? null;
    }

    if (row.pelangganId) {
      const STATUS_LABEL: Record<string, string> = { dikonfirmasi: "Dikonfirmasi", selesai: "Selesai", dibatalkan: "Dibatalkan", menunggu: "Menunggu Konfirmasi" };
      const BAYAR_LABEL: Record<string, string> = { lunas: "Lunas", dp: "DP diterima", belum_bayar: "Belum Bayar" };
      if (body.status && body.status !== "menunggu") {
        sendPushToUser(row.pelangganId, {
          title: "Status booking diperbarui",
          body: `${row.kodeBooking}: ${STATUS_LABEL[row.status] ?? row.status}`,
          url: "/profil",
        });
      } else if (body.statusPembayaran) {
        sendPushToUser(row.pelangganId, {
          title: "Status pembayaran booking diperbarui",
          body: `${row.kodeBooking}: ${BAYAR_LABEL[row.statusPembayaran] ?? row.statusPembayaran}`,
          url: "/profil",
        });
      }
    }

    res.json(formatBooking(row, paketRow?.namaPaket, namaPromo, adminWa));
  } catch (err) {
    req.log.error({ err }, "Failed to update booking status");
    res.status(400).json({ error: "Bad request" });
  }
});

router.post("/booking/:id/cancel", attachAuth, async (req, res) => {
  try {
    if (!req.authUser) return res.status(401).json({ error: "Unauthorized" });

    const [existing] = await db
      .select()
      .from(bookingTable)
      .where(eq(bookingTable.id, req.params.id));

    if (!existing) return res.status(404).json({ error: "Booking tidak ditemukan" });
    if (existing.pelangganId !== req.authUser.id) return res.status(403).json({ error: "Forbidden" });
    if (existing.status === "selesai" || existing.status === "dibatalkan") {
      return res.status(400).json({ error: "Booking tidak dapat dibatalkan" });
    }

    const alasan: string | null = req.body.alasan ?? null;

    const [row] = await db
      .update(bookingTable)
      .set({ status: "dibatalkan", alasanPembatalan: alasan, dibatalkanOleh: "pelanggan", updatedAt: new Date() })
      .where(eq(bookingTable.id, req.params.id))
      .returning();

    // Kembalikan kuota promo jika ada
    if (row.promoId) {
      await db
        .update(promoTable)
        .set({ terpakai: sql`GREATEST(0, ${promoTable.terpakai} - 1)` })
        .where(eq(promoTable.id, row.promoId));
    }

    const [[paketRow], adminWa] = await Promise.all([
      db.select({ namaPaket: paketLayananTable.namaPaket }).from(paketLayananTable).where(eq(paketLayananTable.id, row.paketId)),
      getAdminWa(),
    ]);

    res.json(formatBooking(row, paketRow?.namaPaket, null, adminWa));
  } catch (err) {
    req.log.error({ err }, "Failed to cancel booking");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/booking/:id", requireAdmin, async (req, res) => {
  try {
    const [row] = await db
      .delete(bookingTable)
      .where(eq(bookingTable.id, req.params.id))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    // Kembalikan kuota promo jika ada
    if (row.promoId) {
      await db
        .update(promoTable)
        .set({ terpakai: sql`GREATEST(0, ${promoTable.terpakai} - 1)` })
        .where(eq(promoTable.id, row.promoId));
    }
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete booking");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /booking/:id/payment — buat snap token Midtrans
router.post("/booking/:id/payment", attachAuth, async (req, res) => {
  try {
    if (!req.authUser) return res.status(401).json({ error: "Unauthorized" });

    const rows = await db
      .select({ booking: bookingTable, namaPaket: paketLayananTable.namaPaket })
      .from(bookingTable)
      .leftJoin(paketLayananTable, eq(bookingTable.paketId, paketLayananTable.id))
      .where(eq(bookingTable.id, req.params.id));
    if (!rows.length) return res.status(404).json({ error: "Booking tidak ditemukan" });
    const { booking, namaPaket } = rows[0];
    if (booking.pelangganId !== req.authUser.id) return res.status(403).json({ error: "Forbidden" });
    if (booking.statusPembayaran === "lunas") return res.status(400).json({ error: "Booking sudah lunas" });
    if (booking.status !== "dikonfirmasi") return res.status(400).json({ error: "Pembayaran hanya dapat dilakukan setelah booking dikonfirmasi oleh admin" });

    let snapToken: string | null = null;
    const snap = getSnap();
    if (snap) {
      try {
        const parameter = {
          transaction_details: {
            order_id: `${booking.kodeBooking}-${Date.now()}`,
            gross_amount: booking.totalHarga,
          },
          item_details: [{ id: booking.paketId, price: booking.totalHarga, quantity: 1, name: namaPaket ?? "Paket Foto" }],
          customer_details: {
            first_name: booking.namaPemesan,
            email: booking.email,
            phone: booking.telepon,
          },
        };
        snapToken = await snap.createTransactionToken(parameter);
        await db.update(bookingTable)
          .set({ midtransOrderId: parameter.transaction_details.order_id })
          .where(eq(bookingTable.id, booking.id));
      } catch (err) {
        req.log.error({ err }, "Failed to create Midtrans snap token for booking");
      }
    }

    const adminWa = await getAdminWa();
    res.json({ snapToken, kodeBooking: booking.kodeBooking, adminWa });
  } catch (err) {
    req.log.error({ err }, "Failed to create booking payment");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /booking/:id/verify-payment
router.post("/booking/:id/verify-payment", attachAuth, async (req, res) => {
  try {
    if (!req.authUser) return res.status(401).json({ error: "Unauthorized" });

    const [booking] = await db.select().from(bookingTable).where(eq(bookingTable.id, req.params.id));
    if (!booking) return res.status(404).json({ error: "Booking tidak ditemukan" });
    if (booking.pelangganId !== req.authUser.id) return res.status(403).json({ error: "Forbidden" });

    if (serverKey && booking.midtransOrderId) {
      try {
        const { CoreApi } = require("midtrans-client") as any;
        const core = new CoreApi({ isProduction: false, serverKey });
        const tx = await core.transaction.status(booking.midtransOrderId);
        if (
          tx.transaction_status === "settlement" ||
          (tx.transaction_status === "capture" && tx.fraud_status === "accept")
        ) {
          await db.update(bookingTable).set({ statusPembayaran: "lunas" }).where(eq(bookingTable.id, booking.id));
        }
      } catch {
        await db.update(bookingTable).set({ statusPembayaran: "lunas" }).where(eq(bookingTable.id, booking.id));
      }
    } else {
      await db.update(bookingTable).set({ statusPembayaran: "lunas" }).where(eq(bookingTable.id, booking.id));
    }

    const [updated] = await db.select().from(bookingTable).where(eq(bookingTable.id, booking.id));
    const [[paketRow], adminWa] = await Promise.all([
      db.select({ namaPaket: paketLayananTable.namaPaket }).from(paketLayananTable).where(eq(paketLayananTable.id, updated.paketId)),
      getAdminWa(),
    ]);

    res.json(formatBooking(updated, paketRow?.namaPaket, null, adminWa));
  } catch (err) {
    req.log.error({ err }, "Failed to verify booking payment");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /booking/check-slot — cek ketersediaan slot
router.get("/booking/check-slot", async (req, res) => {
  try {
    const { tanggal, jam } = req.query as { tanggal?: string; jam?: string };
    if (!tanggal || !jam) return res.status(400).json({ error: "tanggal dan jam diperlukan" });
    const booked = await isSlotBooked(tanggal, jam);
    res.json({ tersedia: !booked });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
