import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const pengaturanSitusTable = pgTable("pengaturan_situs", {
  key: text("key").primaryKey(),
  value: jsonb("value"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type PengaturanSitus = typeof pengaturanSitusTable.$inferSelect;
