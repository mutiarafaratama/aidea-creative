import { pgTable, uuid, text, integer, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { pesananStatusEnum, paymentStatusEnum } from "./enums";
import { profilesTable } from "./profiles";

export const pesananProdukTable = pgTable("pesanan_produk", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  kodePesanan: text("kode_pesanan").notNull().unique(),
  pelangganId: uuid("pelanggan_id").references(() => profilesTable.id),
  namaPemesan: text("nama_pemesan").notNull(),
  email: text("email").notNull(),
  telepon: text("telepon").notNull(),
  status: pesananStatusEnum("status").notNull().default("diproses"),
  totalHarga: integer("total_harga").notNull(),
  alamatPengiriman: text("alamat_pengiriman"),
  catatan: text("catatan"),
  statusPembayaran: paymentStatusEnum("status_pembayaran").notNull().default("belum_bayar"),
  midtransOrderId: text("midtrans_order_id"),
  midtransSnapToken: text("midtrans_snap_token"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPesananProdukSchema = createInsertSchema(pesananProdukTable).omit({ id: true, kodePesanan: true, createdAt: true });
export type InsertPesananProduk = z.infer<typeof insertPesananProdukSchema>;
export type PesananProduk = typeof pesananProdukTable.$inferSelect;
