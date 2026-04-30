import { pgTable, uuid, text, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { kategoriLayananTable } from "./kategori_layanan";

export const paketLayananTable = pgTable("paket_layanan", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  kategoriId: uuid("kategori_id").references(() => kategoriLayananTable.id),
  namaPaket: text("nama_paket").notNull(),
  deskripsi: text("deskripsi").notNull(),
  harga: integer("harga").notNull(),
  durasiSesi: integer("durasi_sesi").notNull().default(60),
  jumlahFoto: integer("jumlah_foto").notNull().default(20),
  fasilitas: jsonb("fasilitas").$type<string[]>().notNull().default([]),
  isPopuler: boolean("is_populer").notNull().default(false),
  isAktif: boolean("is_aktif").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPaketLayananSchema = createInsertSchema(paketLayananTable).omit({ id: true, createdAt: true });
export type InsertPaketLayanan = z.infer<typeof insertPaketLayananSchema>;
export type PaketLayanan = typeof paketLayananTable.$inferSelect;
