import { pgTable, uuid, text, integer, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const pricelistTable = pgTable("pricelist", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  kategori: text("kategori").notNull(),
  gambarUrl: text("gambar_url").notNull(),
  urutan: integer("urutan").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Pricelist = typeof pricelistTable.$inferSelect;
