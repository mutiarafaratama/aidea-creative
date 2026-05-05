import { pgEnum } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["admin", "pelanggan"]);
export const bookingStatusEnum = pgEnum("booking_status", ["menunggu", "dikonfirmasi", "selesai", "dibatalkan"]);
export const paymentStatusEnum = pgEnum("payment_status", ["belum_bayar", "dp", "lunas"]);
export const pesananStatusEnum = pgEnum("pesanan_status", ["diproses", "dikerjakan", "selesai", "dikirim", "dibatalkan", "siap_ambil"]);
export const kategoriProdukEnum = pgEnum("kategori_produk", ["cetak_foto", "frame", "album", "photobook", "merchandise"]);
export const pengirimEnum = pgEnum("pengirim", ["user", "bot", "admin"]);
export const chatSessionStatusEnum = pgEnum("chat_session_status", ["ai", "menunggu_admin", "admin", "selesai"]);
