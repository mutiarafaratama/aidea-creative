import { pgTable, uuid, text, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const chatKbTable = pgTable("chat_kb", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  kategori: text("kategori").notNull(),
  pertanyaan: text("pertanyaan").notNull(),
  jawaban: text("jawaban").notNull(),
  keywords: jsonb("keywords").$type<string[]>().default([]),
  prioritas: integer("prioritas").notNull().default(0),
  isAktif: boolean("is_aktif").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type ChatKb = typeof chatKbTable.$inferSelect;
