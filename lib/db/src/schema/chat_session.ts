import { pgTable, uuid, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { chatSessionStatusEnum } from "./enums";

export const chatSessionTable = pgTable("chat_session", {
  sessionId: text("session_id").primaryKey(),
  userId: uuid("user_id"),
  namaTamu: text("nama_tamu"),
  status: chatSessionStatusEnum("status").notNull().default("ai"),
  needsAdmin: boolean("needs_admin").notNull().default(false),
  assignedAdminId: uuid("assigned_admin_id"),
  lastMessageAt: timestamp("last_message_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ChatSession = typeof chatSessionTable.$inferSelect;
