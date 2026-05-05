CREATE TYPE "public"."booking_status" AS ENUM('menunggu', 'dikonfirmasi', 'selesai', 'dibatalkan');--> statement-breakpoint
CREATE TYPE "public"."chat_session_status" AS ENUM('ai', 'menunggu_admin', 'admin', 'selesai');--> statement-breakpoint
CREATE TYPE "public"."kategori_produk" AS ENUM('cetak_foto', 'frame', 'album', 'photobook', 'merchandise');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('belum_bayar', 'dp', 'lunas');--> statement-breakpoint
CREATE TYPE "public"."pengirim" AS ENUM('user', 'bot', 'admin');--> statement-breakpoint
CREATE TYPE "public"."pesanan_status" AS ENUM('diproses', 'dikerjakan', 'selesai', 'dikirim', 'dibatalkan');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('admin', 'pelanggan');--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nama_lengkap" text NOT NULL,
	"no_telepon" text,
	"alamat" text,
	"foto_profil" text,
	"role" "role" DEFAULT 'pelanggan' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users_auth" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"provider" text DEFAULT 'email' NOT NULL,
	"provider_id" text,
	"email_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_auth_profile_id_unique" UNIQUE("profile_id"),
	CONSTRAINT "users_auth_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "kategori_layanan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nama" text NOT NULL,
	"deskripsi" text,
	"icon" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paket_layanan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kategori_id" uuid,
	"nama_paket" text NOT NULL,
	"deskripsi" text NOT NULL,
	"harga" integer NOT NULL,
	"durasi_sesi" integer DEFAULT 60 NOT NULL,
	"jumlah_foto" integer DEFAULT 20 NOT NULL,
	"fasilitas" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"foto_url" text,
	"is_populer" boolean DEFAULT false NOT NULL,
	"is_aktif" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jadwal_tersedia" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tanggal" text NOT NULL,
	"jam_mulai" text NOT NULL,
	"jam_selesai" text NOT NULL,
	"is_tersedia" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "produk" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nama_produk" text NOT NULL,
	"deskripsi" text NOT NULL,
	"harga" integer NOT NULL,
	"stok" integer DEFAULT 0 NOT NULL,
	"kategori" "kategori_produk" NOT NULL,
	"ukuran" text,
	"gambar_url" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_aktif" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pesanan_produk" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kode_pesanan" text NOT NULL,
	"pelanggan_id" uuid,
	"nama_pemesan" text NOT NULL,
	"email" text NOT NULL,
	"telepon" text NOT NULL,
	"status" "pesanan_status" DEFAULT 'diproses' NOT NULL,
	"total_harga" integer NOT NULL,
	"alamat_pengiriman" text,
	"catatan" text,
	"status_pembayaran" "payment_status" DEFAULT 'belum_bayar' NOT NULL,
	"alasan_pembatalan" text,
	"midtrans_order_id" text,
	"midtrans_snap_token" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pesanan_produk_kode_pesanan_unique" UNIQUE("kode_pesanan")
);
--> statement-breakpoint
CREATE TABLE "item_pesanan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pesanan_id" uuid NOT NULL,
	"produk_id" uuid NOT NULL,
	"nama_produk" text DEFAULT '' NOT NULL,
	"jumlah" integer NOT NULL,
	"harga_satuan" integer NOT NULL,
	"subtotal" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"judul" text NOT NULL,
	"deskripsi" text,
	"kategori" text NOT NULL,
	"gambar_url" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kode_booking" text NOT NULL,
	"pelanggan_id" uuid,
	"paket_id" uuid NOT NULL,
	"nama_pemesan" text NOT NULL,
	"email" text NOT NULL,
	"telepon" text NOT NULL,
	"tanggal_sesi" text NOT NULL,
	"jam_sesi" text NOT NULL,
	"catatan_pelanggan" text,
	"konsep_foto" text,
	"status" "booking_status" DEFAULT 'menunggu' NOT NULL,
	"total_harga" integer NOT NULL,
	"status_pembayaran" "payment_status" DEFAULT 'belum_bayar' NOT NULL,
	"alasan_pembatalan" text,
	"dibatalkan_oleh" text,
	"midtrans_order_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "booking_kode_booking_unique" UNIQUE("kode_booking")
);
--> statement-breakpoint
CREATE TABLE "testimoni" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pelanggan_id" uuid,
	"booking_id" uuid,
	"pesanan_id" uuid,
	"rating" integer NOT NULL,
	"komentar" text NOT NULL,
	"nama_tampil" text NOT NULL,
	"foto_url" text,
	"is_approved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" text NOT NULL,
	"user_id" uuid,
	"pesan" text NOT NULL,
	"pengirim" "pengirim" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_session" (
	"session_id" text PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"nama_tamu" text,
	"status" "chat_session_status" DEFAULT 'ai' NOT NULL,
	"needs_admin" boolean DEFAULT false NOT NULL,
	"assigned_admin_id" uuid,
	"last_message_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_kb" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kategori" text NOT NULL,
	"pertanyaan" text NOT NULL,
	"jawaban" text NOT NULL,
	"keywords" jsonb DEFAULT '[]'::jsonb,
	"prioritas" integer DEFAULT 0 NOT NULL,
	"is_aktif" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pengaturan_situs" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"judul" text NOT NULL,
	"deskripsi" text NOT NULL,
	"badge" text,
	"gambar_url" text,
	"link" text,
	"cta_label" text,
	"warna" text DEFAULT 'primary',
	"tampil_marquee" boolean DEFAULT true NOT NULL,
	"tampil_card" boolean DEFAULT true NOT NULL,
	"tanggal_mulai" timestamp,
	"tanggal_berakhir" timestamp,
	"is_aktif" boolean DEFAULT true NOT NULL,
	"urutan" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users_auth" ADD CONSTRAINT "users_auth_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paket_layanan" ADD CONSTRAINT "paket_layanan_kategori_id_kategori_layanan_id_fk" FOREIGN KEY ("kategori_id") REFERENCES "public"."kategori_layanan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pesanan_produk" ADD CONSTRAINT "pesanan_produk_pelanggan_id_profiles_id_fk" FOREIGN KEY ("pelanggan_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_pesanan" ADD CONSTRAINT "item_pesanan_pesanan_id_pesanan_produk_id_fk" FOREIGN KEY ("pesanan_id") REFERENCES "public"."pesanan_produk"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_pesanan" ADD CONSTRAINT "item_pesanan_produk_id_produk_id_fk" FOREIGN KEY ("produk_id") REFERENCES "public"."produk"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_pelanggan_id_profiles_id_fk" FOREIGN KEY ("pelanggan_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_paket_id_paket_layanan_id_fk" FOREIGN KEY ("paket_id") REFERENCES "public"."paket_layanan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "testimoni" ADD CONSTRAINT "testimoni_pelanggan_id_profiles_id_fk" FOREIGN KEY ("pelanggan_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "testimoni" ADD CONSTRAINT "testimoni_booking_id_booking_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."booking"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "testimoni" ADD CONSTRAINT "testimoni_pesanan_id_pesanan_produk_id_fk" FOREIGN KEY ("pesanan_id") REFERENCES "public"."pesanan_produk"("id") ON DELETE no action ON UPDATE no action;