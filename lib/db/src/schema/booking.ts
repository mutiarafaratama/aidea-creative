import { pgTable, uuid, text, integer, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { bookingStatusEnum, paymentStatusEnum } from "./enums";
import { profilesTable } from "./profiles";
import { paketLayananTable } from "./paket_layanan";

export const bookingTable = pgTable("booking", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  kodeBooking: text("kode_booking").notNull().unique(),
  pelangganId: uuid("pelanggan_id").references(() => profilesTable.id),
  paketId: uuid("paket_id").notNull().references(() => paketLayananTable.id),
  namaPemesan: text("nama_pemesan").notNull(),
  email: text("email").notNull(),
  telepon: text("telepon").notNull(),
  tanggalSesi: text("tanggal_sesi").notNull(),
  jamSesi: text("jam_sesi").notNull(),
  catatanPelanggan: text("catatan_pelanggan"),
  konsepFoto: text("konsep_foto"),
  status: bookingStatusEnum("status").notNull().default("menunggu"),
  totalHarga: integer("total_harga").notNull(),
  statusPembayaran: paymentStatusEnum("status_pembayaran").notNull().default("belum_bayar"),
  midtransOrderId: text("midtrans_order_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBookingSchema = createInsertSchema(bookingTable).omit({ id: true, kodeBooking: true, createdAt: true, updatedAt: true });
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookingTable.$inferSelect;
