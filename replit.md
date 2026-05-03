# AideaCreative Studio Foto - Smart Web E-Commerce

## Latest Updates (May 3, 2026) — Replit Migration

- Migrated from Replit Agent to Replit environment
- All dependencies installed via `pnpm install`
- Database schema applied to Replit PostgreSQL (all 15 tables + 7 enums)
- All secrets already configured in Replit Secrets: Supabase Auth, AI, Midtrans, Cloudinary
- Both workflows (API Server on port 8080, Frontend on port 5000) running successfully

## Previous Updates (May 3, 2026)

- **Fitur Toko (E-Commerce) lengkap dengan Midtrans Snap:**
  - **Cart (keranjang)**: `CartProvider` (localStorage) + `CartDrawer` sidebar + `CartButton` dengan badge jumlah item. Dipasang global via App.tsx.
  - **Toko halaman**: tombol "Tambah ke Keranjang" di setiap card produk dan di detail modal (dengan qty selector). Cart icon muncul di header toko.
  - **Checkout dialog**: form nama/email/WhatsApp (auto-fill dari profil), konfirmasi item, lalu buka Midtrans Snap popup. Setelah sukses redirect ke riwayat pesanan.
  - **API `/api/pesanan`**: POST (buat pesanan + kurangi stok + buat Midtrans snap token), GET /me (riwayat user), GET / (admin), PUT /:id/status (admin), POST /midtrans-notification (webhook).
  - **Admin Pesanan Toko** (`/dashboard/pesanan`): tabel semua pesanan, filter by status, sheet detail dengan item list + kontrol status + update status pembayaran + WA link.
  - **DB**: kolom `midtrans_order_id`, `midtrans_snap_token` di `pesanan_produk`; kolom `nama_produk` di `item_pesanan` (snapshot nama saat checkout).
  - **Env vars**: `MIDTRANS_SERVER_KEY` (secret, server-side), `VITE_MIDTRANS_CLIENT_KEY` (shared env var, frontend Snap.js).

## Overview

pnpm workspace monorepo — Smart Web E-Commerce platform for **AideaCreative Studio Foto**, located in Pujodadi, Pringsewu. Combines a photography booking system with an online product store and AI-powered features.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React 19 + Vite 7 (artifacts/aidea-creative)
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: Replit PostgreSQL + Drizzle ORM via `DATABASE_URL` (also accepts `SUPABASE_DATABASE_URL`)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec in lib/api-spec/openapi.yaml)
- **Build**: esbuild (ESM bundle via build.mjs)
- **UI**: shadcn/ui (Radix UI) + Tailwind CSS 4 + Framer Motion
- **AI**: OpenAI-compatible API via `AI_INTEGRATIONS_OPENAI_BASE_URL` + `AI_INTEGRATIONS_OPENAI_API_KEY` (default model: qwen-turbo)
- **State**: @tanstack/react-query
- **Forms**: react-hook-form + zod
- **Auth**: Supabase Auth (email/password + Google OAuth) with JWT verification on server
- **Payments**: Midtrans Snap (server key secret, client key shared env var)
- **Storage**: Supabase Storage (via service role key) for image uploads

## Workflows

- **API Server**: `PORT=8080 pnpm --filter @workspace/api-server run dev` (port 8080)
- **Frontend**: `PORT=5000 BASE_PATH=/ pnpm --filter @workspace/aidea-creative exec vite ...` (port 5000)
- Frontend proxies `/api` → `http://localhost:8080`

## Features

- **Halaman Beranda**: Hero cinematic, fitur studio, paket populer, portfolio preview, AI promo, testimoni, footer
- **Portfolio**: Galeri foto profesional
- **Paket**: Daftar paket foto dengan filter kategori + AI recommendation sidebar
- **Toko**: Produk foto online (cetak, album, frame, photobook, merchandise) + Cart + Midtrans checkout
- **Booking**: Form booking lengkap dengan jam sesi, konsep foto, kode booking otomatis (IDC-YYYYMMDD-XXXX)
- **Testimoni**: Ulasan pelanggan + form tambah testimoni
- **Dashboard Admin**: Statistik real-time, kelola booking, paket, produk, portfolio, pengguna, promo, pengaturan
- **AI Chatbot**: Widget chat floating untuk konsultasi paket dengan handoff ke admin
- **AI Rekomendasi**: Saran paket foto berdasarkan kebutuhan user
- **Autentikasi**: Login, register, email verification, Google OAuth, protected profil, protected admin dashboard
- **Profil User**: Edit nama, foto profil, no telepon, alamat; lihat riwayat booking, pesanan produk, testimoni

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema (interactive) or `push-force`

## Database Schema (Replit PostgreSQL, 15 Tables + 7 Enums, UUID PKs)

### Enums
- `role`: admin, pelanggan
- `booking_status`: menunggu, dikonfirmasi, selesai, dibatalkan
- `payment_status`: belum_bayar, dp, lunas
- `pesanan_status`: diproses, dikerjakan, selesai, dikirim, dibatalkan
- `kategori_produk`: cetak_foto, frame, album, photobook, merchandise
- `pengirim`: user, bot, admin
- `chat_session_status`: ai, menunggu_admin, admin, selesai

### Tables
- `profiles` — User profiles (id matches Supabase auth user UUID)
- `kategori_layanan` — Kategori paket foto
- `paket_layanan` — Paket foto (namaPaket, harga, durasiSesi, jumlahFoto, fasilitas[], isPopuler)
- `jadwal_tersedia` — Legacy jadwal table (slot tersedia per tanggal)
- `portfolio` — Foto portofolio studio
- `produk` — Produk toko (namaProduk, harga, stok, gambarUrl[], kategori)
- `booking` — Reservasi sesi foto (kodeBooking, namaPemesan, tanggalSesi, jamSesi, status, totalHarga)
- `pesanan_produk` — Order produk dari toko (Midtrans integration)
- `item_pesanan` — Item dalam order produk
- `testimoni` — Ulasan pelanggan (namaTampil, rating, komentar, fotoUrl, isApproved)
- `chat_history` — Riwayat chat AI per session
- `chat_session` — Status session chat (ai/menunggu_admin/admin/selesai)
- `chat_kb` — Knowledge base for AI chatbot
- `pengaturan_situs` — Site settings key-value store
- `promo` — Banner promo

## Secrets Required

All configured in Replit Secrets:
- `VITE_SUPABASE_URL` — Supabase project URL (frontend)
- `VITE_SUPABASE_ANON_KEY` — Supabase anon key (frontend auth)
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (server-side upload + auth verification)
- `AI_INTEGRATIONS_OPENAI_BASE_URL` — AI API base URL
- `AI_INTEGRATIONS_OPENAI_API_KEY` — AI API key
- `MIDTRANS_SERVER_KEY` — Midtrans server key
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_UPLOAD_PRESET` — Cloudinary
- `SUPABASE_DATABASE_URL` — (optional) Supabase direct DB URL (falls back to `DATABASE_URL`)

## Env Vars (Shared, non-secret)

- `VITE_MIDTRANS_CLIENT_KEY` — Midtrans client key for frontend Snap.js

## Important Notes

- **Database**: Uses `DATABASE_URL` (Replit PostgreSQL) by default; `SUPABASE_DATABASE_URL` overrides if set
- **Auth**: Supabase Auth JWT verified server-side via `supabase.auth.getUser(token)`; profile row auto-provisioned in `profiles` table
- **Admin emails**: Hardcoded `tiarafaratama@gmail.com` + `ADMIN_EMAILS` env (comma-separated)
- **UUID IDs**: All PKs are UUID strings
- **All UI text**: Bahasa Indonesia
- **Booking code format**: `IDC-YYYYMMDD-XXXX` (auto-generated server-side)
- **Jadwal**: Weekly rules stored as JSON in `pengaturan_situs` key `jadwalAturan`; legacy `jadwal_tersedia` table preserved
- **API codegen**: `lib/api-zod/src/index.ts` exports from `./generated/api` only
