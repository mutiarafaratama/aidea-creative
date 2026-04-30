import { pgTable, uuid, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { profilesTable } from "./profiles";
import { bookingTable } from "./booking";

export const testimoniTable = pgTable("testimoni", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  pelangganId: uuid("pelanggan_id").references(() => profilesTable.id),
  bookingId: uuid("booking_id").references(() => bookingTable.id),
  rating: integer("rating").notNull(),
  komentar: text("komentar").notNull(),
  namaTampil: text("nama_tampil").notNull(),
  fotoUrl: text("foto_url"),
  isApproved: boolean("is_approved").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTestimoniSchema = createInsertSchema(testimoniTable).omit({ id: true, createdAt: true, isApproved: true });
export type InsertTestimoni = z.infer<typeof insertTestimoniSchema>;
export type Testimoni = typeof testimoniTable.$inferSelect;
