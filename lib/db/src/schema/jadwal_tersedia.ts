import { pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const jadwalTersediaTable = pgTable("jadwal_tersedia", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tanggal: text("tanggal").notNull(),
  jamMulai: text("jam_mulai").notNull(),
  jamSelesai: text("jam_selesai").notNull(),
  isTersedia: boolean("is_tersedia").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertJadwalTersediaSchema = createInsertSchema(jadwalTersediaTable).omit({ id: true, createdAt: true });
export type InsertJadwalTersedia = z.infer<typeof insertJadwalTersediaSchema>;
export type JadwalTersedia = typeof jadwalTersediaTable.$inferSelect;
