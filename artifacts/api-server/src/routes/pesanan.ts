import { Router } from "express";
import { db } from "@workspace/db";
import { pesananProdukTable, itemPesananTable, produkTable } from "@workspace/db";
import { eq, desc, inArray } from "drizzle-orm";
import { attachAuth, requireAdmin } from "../middlewares/auth";

const router = Router();

function getSnap() {
  const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim();
  if (!serverKey) return null;
  const { Snap } = require("midtrans-client") as any;
  return new Snap({ isProduction: false, serverKey });
}

function generateKodePesanan(): string {
  const now = new Date();
  const tgl = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  return `IDC-ORD-${tgl}-${rand}`;
}

const formatPesanan = (r: any, items: any[]) => ({
  id: r.id,
  kodePesanan: r.kodePesanan,
  pelangganId: r.pelangganId,
  namaPemesan: r.namaPemesan,
  email: r.email,
  telepon: r.telepon,
  status: r.status,
  statusPembayaran: r.statusPembayaran,
  totalHarga: r.totalHarga,
  catatan: r.catatan,
  alasanPembatalan: r.alasanPembatalan ?? null,
  midtransOrderId: r.midtransOrderId,
  midtransSnapToken: r.midtransSnapToken,
  createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
  items: items.map((item) => ({
    id: item.id,
    produkId: item.produkId,
    namaProduk: item.namaProduk,
    jumlah: item.jumlah,
    hargaSatuan: item.hargaSatuan,
    subtotal: item.subtotal,
  })),
});

router.post("/pesanan", attachAuth, async (req, res) => {
  try {
    if (!req.authUser) return res.status(401).json({ error: "Login diperlukan untuk memesan" });

    const { items, namaPemesan, email, telepon, catatan } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Keranjang kosong" });
    }

    const produkIds = items.map((i: any) => i.produkId);
    const produkList = await db.select().from(produkTable).where(inArray(produkTable.id, produkIds));

    for (const item of items) {
      const produk = produkList.find((p) => p.id === item.produkId);
      if (!produk) return res.status(400).json({ error: `Produk tidak ditemukan` });
      if (!produk.isAktif) return res.status(400).json({ error: `${produk.namaProduk} tidak tersedia` });
      if (produk.stok < item.jumlah) return res.status(400).json({ error: `Stok ${produk.namaProduk} tidak cukup (tersisa ${produk.stok})` });
    }

    const totalHarga = items.reduce((sum: number, item: any) => {
      const produk = produkList.find((p) => p.id === item.produkId)!;
      return sum + produk.harga * item.jumlah;
    }, 0);

    const kodePesanan = generateKodePesanan();

    const [pesanan] = await db.insert(pesananProdukTable).values({
      kodePesanan,
      pelangganId: req.authUser.id,
      namaPemesan,
      email,
      telepon,
      totalHarga,
      catatan: catatan ?? null,
      status: "diproses",
      statusPembayaran: "belum_bayar",
    }).returning();

    const itemValues = items.map((item: any) => {
      const produk = produkList.find((p) => p.id === item.produkId)!;
      return {
        pesananId: pesanan.id,
        produkId: item.produkId,
        namaProduk: produk.namaProduk,
        jumlah: item.jumlah,
        hargaSatuan: produk.harga,
        subtotal: produk.harga * item.jumlah,
      };
    });
    const createdItems = await db.insert(itemPesananTable).values(itemValues).returning();

    for (const item of items) {
      const produk = produkList.find((p) => p.id === item.produkId)!;
      await db.update(produkTable)
        .set({ stok: produk.stok - item.jumlah })
        .where(eq(produkTable.id, item.produkId));
    }

    let snapToken: string | null = null;
    try {
      const snap = getSnap();
      if (snap) {
        const parameter = {
          transaction_details: { order_id: kodePesanan, gross_amount: totalHarga },
          item_details: createdItems.map((item) => ({
            id: item.produkId,
            price: item.hargaSatuan,
            quantity: item.jumlah,
            name: item.namaProduk,
          })),
          customer_details: { first_name: namaPemesan, email, phone: telepon },
        };
        snapToken = await snap.createTransactionToken(parameter);
        await db.update(pesananProdukTable)
          .set({ midtransOrderId: kodePesanan, midtransSnapToken: snapToken })
          .where(eq(pesananProdukTable.id, pesanan.id));
      }
    } catch (err) {
      req.log.error({ err }, "Failed to create Midtrans snap token");
    }

    res.status(201).json({ ...formatPesanan(pesanan, createdItems), snapToken });
  } catch (err) {
    req.log.error({ err }, "Failed to create pesanan");
    res.status(400).json({ error: "Gagal membuat pesanan" });
  }
});

// POST /pesanan/verify — dipanggil frontend setelah onSuccess/onPending Snap
router.post("/pesanan/verify", attachAuth, async (req, res) => {
  try {
    if (!req.authUser) return res.status(401).json({ error: "Unauthorized" });

    const { kodePesanan } = req.body;
    if (!kodePesanan) return res.status(400).json({ error: "kodePesanan diperlukan" });

    const [pesanan] = await db.select().from(pesananProdukTable)
      .where(eq(pesananProdukTable.kodePesanan, kodePesanan));
    if (!pesanan) return res.status(404).json({ error: "Pesanan tidak ditemukan" });
    if (pesanan.pelangganId !== req.authUser.id) return res.status(403).json({ error: "Forbidden" });

    const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim();
    if (serverKey) {
      try {
        const { CoreApi } = require("midtrans-client") as any;
        const core = new CoreApi({ isProduction: false, serverKey });
        const tx = await core.transaction.status(kodePesanan);

        let newStatus: "belum_bayar" | "dp" | "lunas" = pesanan.statusPembayaran as any;
        if (tx.transaction_status === "settlement" ||
          (tx.transaction_status === "capture" && tx.fraud_status === "accept")) {
          newStatus = "lunas";
        } else if (tx.transaction_status === "pending") {
          newStatus = pesanan.statusPembayaran as any;
        }

        if (newStatus !== pesanan.statusPembayaran) {
          await db.update(pesananProdukTable)
            .set({ statusPembayaran: newStatus })
            .where(eq(pesananProdukTable.kodePesanan, kodePesanan));
        }
      } catch (err) {
        req.log.error({ err }, "Midtrans status check failed, marking lunas from callback trust");
        await db.update(pesananProdukTable)
          .set({ statusPembayaran: "lunas" })
          .where(eq(pesananProdukTable.kodePesanan, kodePesanan));
      }
    } else {
      await db.update(pesananProdukTable)
        .set({ statusPembayaran: "lunas" })
        .where(eq(pesananProdukTable.kodePesanan, kodePesanan));
    }

    const [updated] = await db.select().from(pesananProdukTable)
      .where(eq(pesananProdukTable.kodePesanan, kodePesanan));
    const items = await db.select().from(itemPesananTable)
      .where(eq(itemPesananTable.pesananId, updated.id));
    res.json(formatPesanan(updated, items));
  } catch (err) {
    req.log.error({ err }, "Failed to verify pesanan");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/pesanan/midtrans-notification", async (req, res) => {
  try {
    const { order_id, transaction_status, fraud_status } = req.body;
    let newStatusPembayaran: "belum_bayar" | "lunas" = "belum_bayar";
    if (
      (transaction_status === "capture" && fraud_status === "accept") ||
      transaction_status === "settlement"
    ) {
      newStatusPembayaran = "lunas";
    }
    await db.update(pesananProdukTable)
      .set({ statusPembayaran: newStatusPembayaran })
      .where(eq(pesananProdukTable.kodePesanan, order_id));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/pesanan/me", attachAuth, async (req, res) => {
  try {
    if (!req.authUser) return res.status(401).json({ error: "Unauthorized" });
    const pesananList = await db.select().from(pesananProdukTable)
      .where(eq(pesananProdukTable.pelangganId, req.authUser.id))
      .orderBy(desc(pesananProdukTable.createdAt));
    const result = await Promise.all(pesananList.map(async (p) => {
      const items = await db.select().from(itemPesananTable).where(eq(itemPesananTable.pesananId, p.id));
      return formatPesanan(p, items);
    }));
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to get pesanan/me");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/pesanan", requireAdmin, async (req, res) => {
  try {
    const pesananList = await db.select().from(pesananProdukTable)
      .orderBy(desc(pesananProdukTable.createdAt));
    const result = await Promise.all(pesananList.map(async (p) => {
      const items = await db.select().from(itemPesananTable).where(eq(itemPesananTable.pesananId, p.id));
      return formatPesanan(p, items);
    }));
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to get pesanan list");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /pesanan/:id — hanya admin
router.delete("/pesanan/:id", requireAdmin, async (req, res) => {
  try {
    const [pesanan] = await db.select().from(pesananProdukTable)
      .where(eq(pesananProdukTable.id, req.params.id));
    if (!pesanan) return res.status(404).json({ error: "Pesanan tidak ditemukan" });

    await db.delete(itemPesananTable).where(eq(itemPesananTable.pesananId, pesanan.id));
    await db.delete(pesananProdukTable).where(eq(pesananProdukTable.id, pesanan.id));

    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete pesanan");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /pesanan/:id/status — admin: hanya bisa ke "dikerjakan" atau "dibatalkan" (dengan alasan)
router.put("/pesanan/:id/status", requireAdmin, async (req, res) => {
  try {
    const { status, alasanPembatalan } = req.body;

    const allowedStatuses = ["dikerjakan", "dibatalkan"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: `Status tidak valid. Hanya boleh: ${allowedStatuses.join(", ")}` });
    }
    if (status === "dibatalkan" && !alasanPembatalan?.trim()) {
      return res.status(400).json({ error: "Alasan pembatalan wajib diisi" });
    }

    const updateData: Record<string, unknown> = { status };
    if (status === "dibatalkan") updateData.alasanPembatalan = alasanPembatalan.trim();

    const [row] = await db.update(pesananProdukTable)
      .set(updateData)
      .where(eq(pesananProdukTable.id, req.params.id))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    const items = await db.select().from(itemPesananTable).where(eq(itemPesananTable.pesananId, row.id));
    res.json(formatPesanan(row, items));
  } catch (err) {
    req.log.error({ err }, "Failed to update pesanan status");
    res.status(400).json({ error: "Bad request" });
  }
});

// PUT /pesanan/:id/terima — pelanggan konfirmasi penerimaan (selesai)
router.put("/pesanan/:id/terima", attachAuth, async (req, res) => {
  try {
    if (!req.authUser) return res.status(401).json({ error: "Unauthorized" });

    const [pesanan] = await db.select().from(pesananProdukTable)
      .where(eq(pesananProdukTable.id, req.params.id));
    if (!pesanan) return res.status(404).json({ error: "Pesanan tidak ditemukan" });
    if (pesanan.pelangganId !== req.authUser.id) return res.status(403).json({ error: "Forbidden" });
    if (pesanan.status !== "dikerjakan") {
      return res.status(400).json({ error: "Pesanan hanya bisa diterima saat statusnya Dikerjakan" });
    }

    const [row] = await db.update(pesananProdukTable)
      .set({ status: "selesai" })
      .where(eq(pesananProdukTable.id, req.params.id))
      .returning();
    const items = await db.select().from(itemPesananTable).where(eq(itemPesananTable.pesananId, row.id));
    res.json(formatPesanan(row, items));
  } catch (err) {
    req.log.error({ err }, "Failed to terima pesanan");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
