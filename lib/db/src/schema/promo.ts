import { pgTable, uuid, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const promoTable = pgTable("promo", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  judul: text("judul").notNull(),
  deskripsi: text("deskripsi").notNull(),
  badge: text("badge"),
  gambarUrl: text("gambar_url"),
  link: text("link"),
  ctaLabel: text("cta_label"),
  warna: text("warna").default("primary"),
  tampilMarquee: boolean("tampil_marquee").notNull().default(true),
  tampilCard: boolean("tampil_card").notNull().default(true),
  tanggalMulai: timestamp("tanggal_mulai"),
  tanggalBerakhir: timestamp("tanggal_berakhir"),
  isAktif: boolean("is_aktif").notNull().default(true),
  urutan: integer("urutan").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPromoSchema = createInsertSchema(promoTable).omit({ id: true, createdAt: true });
export type InsertPromo = z.infer<typeof insertPromoSchema>;
export type Promo = typeof promoTable.$inferSelect;
