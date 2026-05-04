import { Router } from "express";
import { db } from "@workspace/db";
import { bookingTable, paketLayananTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { attachAuth, requireAdmin } from "../middlewares/auth";

const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim();
const clientKey = process.env.VITE_MIDTRANS_CLIENT_KEY?.trim();

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
  statusPembayaran: r.statusPembayaran,
  alasanPembatalan: r.alasanPembatalan ?? null,
  dibatalkanOleh: r.dibatalkanOleh ?? null,
  createdAt: r.createdAt.toISOString(),
});

router.get("/booking/me", attachAuth, async (req, res) => {
  try {
    if (!req.authUser) return res.status(401).json({ error: "Unauthorized" });
    const rows = await db
      .select({ booking: bookingTable, namaPaket: paketLayananTable.namaPaket })
      .from(bookingTable)
      .leftJoin(paketLayananTable, eq(bookingTable.paketId, paketLayananTable.id))
      .where(eq(bookingTable.pelangganId, req.authUser.id))
      .orderBy(desc(bookingTable.createdAt));
    res.json(rows.map((r) => formatBooking(r.booking, r.namaPaket)));
  } catch (err) {
    req.log.error({ err }, "Failed to list my bookings");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/booking", async (req, res) => {
  try {
    const rows = await db
      .select({ booking: bookingTable, namaPaket: paketLayananTable.namaPaket })
      .from(bookingTable)
      .leftJoin(paketLayananTable, eq(bookingTable.paketId, paketLayananTable.id))
      .orderBy(desc(bookingTable.createdAt));
    res.json(rows.map((r) => formatBooking(r.booking, r.namaPaket)));
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
    res.status(201).json(formatBooking(row, paket.namaPaket));
  } catch (err) {
    req.log.error({ err }, "Failed to create booking");
    res.status(400).json({ error: "Bad request" });
  }
});

router.get("/booking/:id", async (req, res) => {
  try {
    const rows = await db
      .select({ booking: bookingTable, namaPaket: paketLayananTable.namaPaket })
      .from(bookingTable)
      .leftJoin(paketLayananTable, eq(bookingTable.paketId, paketLayananTable.id))
      .where(eq(bookingTable.id, req.params.id));
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    const { booking, namaPaket } = rows[0];
    res.json(formatBooking(booking, namaPaket));
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

    const [paketRow] = await db
      .select({ namaPaket: paketLayananTable.namaPaket })
      .from(paketLayananTable)
      .where(eq(paketLayananTable.id, row.paketId));

    res.json(formatBooking(row, paketRow?.namaPaket));
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

    const [paketRow] = await db
      .select({ namaPaket: paketLayananTable.namaPaket })
      .from(paketLayananTable)
      .where(eq(paketLayananTable.id, row.paketId));

    res.json(formatBooking(row, paketRow?.namaPaket));
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
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete booking");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /booking/:id/payment — buat snap token Midtrans untuk booking
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

    res.json({ snapToken, kodeBooking: booking.kodeBooking });
  } catch (err) {
    req.log.error({ err }, "Failed to create booking payment");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /booking/:id/verify-payment — verifikasi status pembayaran
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
    const [paketRow] = await db
      .select({ namaPaket: paketLayananTable.namaPaket })
      .from(paketLayananTable)
      .where(eq(paketLayananTable.id, updated.paketId));

    res.json(formatBooking(updated, paketRow?.namaPaket));
  } catch (err) {
    req.log.error({ err }, "Failed to verify booking payment");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
