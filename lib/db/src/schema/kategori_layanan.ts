import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const kategoriLayananTable = pgTable("kategori_layanan", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  nama: text("nama").notNull(),
  deskripsi: text("deskripsi"),
  icon: text("icon"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertKategoriLayananSchema = createInsertSchema(kategoriLayananTable).omit({ id: true, createdAt: true });
export type InsertKategoriLayanan = z.infer<typeof insertKategoriLayananSchema>;
export type KategoriLayanan = typeof kategoriLayananTable.$inferSelect;
