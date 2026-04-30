import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { pengirimEnum } from "./enums";

export const chatHistoryTable = pgTable("chat_history", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id").notNull(),
  userId: uuid("user_id"),
  pesan: text("pesan").notNull(),
  pengirim: pengirimEnum("pengirim").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertChatHistorySchema = createInsertSchema(chatHistoryTable).omit({ id: true, createdAt: true });
export type InsertChatHistory = z.infer<typeof insertChatHistorySchema>;
export type ChatHistory = typeof chatHistoryTable.$inferSelect;
