import { pgTable, uuid, integer, text } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { pesananProdukTable } from "./pesanan_produk";
import { produkTable } from "./produk";

export const itemPesananTable = pgTable("item_pesanan", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  pesananId: uuid("pesanan_id").notNull().references(() => pesananProdukTable.id),
  produkId: uuid("produk_id").notNull().references(() => produkTable.id),
  namaProduk: text("nama_produk").notNull().default(""),
  jumlah: integer("jumlah").notNull(),
  hargaSatuan: integer("harga_satuan").notNull(),
  subtotal: integer("subtotal").notNull(),
});

export const insertItemPesananSchema = createInsertSchema(itemPesananTable).omit({ id: true });
export type InsertItemPesanan = z.infer<typeof insertItemPesananSchema>;
export type ItemPesanan = typeof itemPesananTable.$inferSelect;
