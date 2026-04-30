import { pgTable, uuid, text, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { kategoriProdukEnum } from "./enums";

export const produkTable = pgTable("produk", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  namaProduk: text("nama_produk").notNull(),
  deskripsi: text("deskripsi").notNull(),
  harga: integer("harga").notNull(),
  stok: integer("stok").notNull().default(0),
  kategori: kategoriProdukEnum("kategori").notNull(),
  ukuran: text("ukuran"),
  gambarUrl: jsonb("gambar_url").$type<string[]>().notNull().default([]),
  isAktif: boolean("is_aktif").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertProdukSchema = createInsertSchema(produkTable).omit({ id: true, createdAt: true });
export type InsertProduk = z.infer<typeof insertProdukSchema>;
export type Produk = typeof produkTable.$inferSelect;
