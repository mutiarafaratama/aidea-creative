# AideaCreative Studio Foto - Smart Web E-Commerce

## Latest Updates (Apr 30, 2026 — pm)
- **Upload limit raised to 20MB** in `<SupabaseMultiUploader />` and new single-image `<SupabaseUploader />`. Express body limit on `/api/upload/supabase` raised to 30MB; Supabase bucket file size limit set to 25MB. Existing buckets are auto-updated via `updateBucket` on first use.
- **AI swapped to pio.codes / qwen-turbo.** `artifacts/api-server/src/routes/ai.ts` now uses `AI_INTEGRATIONS_OPENAI_BASE_URL` + `AI_INTEGRATIONS_OPENAI_API_KEY` + optional `AI_MODEL` (default `qwen-turbo`). Removed `response_format: json_object` (qwen doesn't support it) and added `extractJson()` helper for tolerant JSON parsing in `/api/ai/recommend`.
- **Jadwal: per-date rows replaced with weekly recurring rules.** Stored as JSON in `pengaturan_situs` under key `jadwalAturan`. New endpoints:
  - `GET  /api/jadwal/aturan` — public read of weekly rules
  - `PUT  /api/admin/jadwal/aturan` — admin save
  - `GET  /api/jadwal?tanggal=YYYY-MM-DD` — derives slots for a single date
  - `GET  /api/jadwal` (no params) — derives next 30 days of slots (kept for backward-compat with the legacy `useListJadwal` hook on the booking page)
  - `GET  /api/jadwal?all=true` — returns rows from the legacy `jadwal_tersedia` table
  - Admin UI at `/admin/jadwal` rewritten as a 7-day rule editor with presets, switch toggles, and live slot preview.
- **Toko produk: clickable cards open detail modal** with image carousel (prev/next + thumbnails + counter), description, stock badge, and "Pesan via WhatsApp" CTA. Whole card clicks; "Beli" button opens the same modal without bubbling. Mobile grid is now 2-column with compact paddings.
- **Cloudinary uploads → Supabase Storage** for portfolio (`portfolio` bucket), landing hero/login bg (`landing` bucket, folders `hero`/`login`), and promo banners (`promo` bucket). Old Cloudinary URLs are still cleaned up via the legacy destroy endpoint.
- **Responsiveness pass.** Smaller mobile typography (hero h1 4xl on phones), reduced section paddings on `/paket` and home final CTA, mobile-friendly toko grid, and disabled-day support on the booking calendar (off-days from rules grey out).

## Latest Updates (Apr 30, 2026)
- **FIX: queries hanging forever on admin pages.** `customFetch` always awaited the auth token getter (which calls `supabase.auth.getSession()`); a stalled token-refresh would freeze every query indefinitely (skeleton never resolves). Wrapped the getter in a 1.5s timeout in `lib/api-client-react/src/custom-fetch.ts` and added similar timeouts around `getSession()` in `artifacts/aidea-creative/src/lib/auth.tsx` (loadProfile + bootstrap). Public endpoints proceed without a token; private ones now surface a real error.
- **Better admin error UX.** Added `<QueryError />` with retry button, wired into admin produk / portfolio / bookings / beranda pages so failed loads are visible (no more endless skeletons).
- **Cleanup.** Removed redundant `query: { queryKey: ... }` overrides across all `useList*` calls in admin & public pages — generated hooks already supply the default key.
- **Fix: image upload 413.** Bumped Express body limit to 12mb in `artifacts/api-server/src/app.ts` (raw image cap is 10MB, base64 inflates ~1.37x).

## Latest Updates (Apr 2026)
- Admin dashboard expanded: **Kelola Pengguna**, **Kelola Konten Landing Page** (incl. login bg image), **Kelola Banner Promo** (split into its own page).
- Cloudinary signed direct uploads via `/api/upload/cloudinary/sign` + reusable `<CloudinaryUploader />` component.
- Site settings (`pengaturan_situs` table) — public GET `/api/settings`, admin PUT `/api/admin/settings`. Wired into Home (hero badge/subtitle) and AuthCard (login bg image) without altering layout.
- Chat AI v2: per-session persistence (`chat_session` + status enum `ai|menunggu_admin|admin|selesai`), Knowledge Base (`chat_kb`) auto-injected into AI prompt. Customer chatbot has "Bicara dengan Admin" handoff + 5s polling. Admin Inbox supports live takeover and reply.
- DB additions: enum value `pengirim='admin'`, new tables `pengaturan_situs`, `chat_kb`, `chat_session` (pushed via drizzle).
- Optional secret `SUPABASE_SERVICE_ROLE_KEY` enables full users management (email enrichment + delete auth user). Without it, users page works but emails appear empty.

## Overview

pnpm workspace monorepo — Smart Web E-Commerce platform for **AideaCreative Studio Foto**, located in Pujodadi, Pringsewu. Combines a photography booking system with an online product store and AI-powered features.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/aidea-creative)
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: Replit PostgreSQL (Neon-backed) + Drizzle ORM via `DATABASE_URL` (falls back to `SUPABASE_DATABASE_URL` if set)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec in lib/api-spec/openapi.yaml)
- **Build**: esbuild (CJS bundle)
- **UI**: shadcn/ui + Tailwind CSS + Framer Motion
- **AI**: OpenAI GPT-4o-mini (via Replit AI proxy) for chatbot & recommendations
- **State**: @tanstack/react-query
- **Forms**: react-hook-form + zod
- **Auth**: Supabase Auth (email/password + Google OAuth) with Supabase Storage avatars

## Features

- **Halaman Beranda**: Hero cinematic, fitur studio, paket populer, portfolio preview, AI promo, testimoni, footer
- **Portfolio**: Galeri foto profesional
- **Paket**: Daftar paket foto dengan filter kategori + AI recommendation sidebar
- **Toko**: Produk foto online (cetak, album, frame, photobook, merchandise)
- **Booking**: Form booking lengkap dengan jam sesi, konsep foto, kode booking otomatis (IDC-YYYYMMDD-XXXX)
- **Testimoni**: Ulasan pelanggan + form tambah testimoni
- **Dashboard Admin**: Statistik real-time, kelola booking (konfirmasi/selesai/batal), daftar paket
- **AI Chatbot**: Widget chat floating untuk konsultasi paket (bottom-right)
- **AI Rekomendasi**: Saran paket foto berdasarkan kebutuhan user
- **Autentikasi Supabase**: Login, register, email verification, Google OAuth, protected profil, protected admin dashboard
- **Profil User**: Edit nama, foto profil, no telepon, alamat; lihat riwayat booking, pesanan produk, dan testimoni

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/aidea-creative run dev` — run frontend locally

## Database Schema (Supabase, 11 Tables + 6 Enums, UUID PKs)

### Enums
- `status_booking`: menunggu, dikonfirmasi, selesai, dibatalkan, ditolak
- `status_pembayaran`: belum_bayar, dp_diterima, lunas, dikembalikan
- `metode_pembayaran`: transfer, midtrans, tunai
- `kategori_produk`: cetak_foto, frame, album, photobook, merchandise
- `role_profil`: admin, fotografer, pelanggan
- `status_testimoni`: menunggu, disetujui, ditolak

### Tables
- `profiles` — User profiles (FK to Supabase auth.users)
- `kategori_layanan` — Kategori paket foto (Portrait, Wedding, dll.)
- `paket_layanan` — Paket foto (namaPaket, harga, durasiSesi, jumlahFoto, fasilitas[], isPopuler)
- `jadwal_tersedia` — Jadwal sesi tersedia (tanggal, jamMulai, jamSelesai)
- `portfolio` — Foto portofolio studio
- `produk` — Produk toko (namaProduk, harga, stok, gambarUrl[], kategori)
- `booking` — Reservasi sesi foto (kodeBooking, namaPemesan, tanggalSesi, jamSesi, status, totalHarga)
- `testimoni` — Ulasan pelanggan (namaTampil, rating, komentar, fotoUrl, statusTestimoni)
- `pesanan_produk` — Order produk dari toko
- `item_pesanan` — Item dalam order produk
- `chat_history` — Riwayat chat AI

## Artifacts

- `artifacts/aidea-creative` — React + Vite frontend (preview path: `/`)
- `artifacts/api-server` — Express API server (preview path: `/api`)
- `supabase/auth-rls-policies.sql` — SQL setup untuk RLS policy profiles, booking, pesanan produk, testimoni, dan bucket avatars

## API Routes

- `GET /api/kategori` — Daftar kategori layanan
- `GET /api/paket` — Daftar paket foto
- `GET /api/produk` — Daftar produk toko
- `GET /api/portfolio` — Daftar portfolio
- `GET /api/jadwal` — Jadwal tersedia
- `GET /api/testimoni` — Ulasan pelanggan
- `POST /api/testimoni` — Tambah ulasan baru
- `GET /api/booking` — Daftar booking
- `POST /api/booking` — Buat booking baru (auto-generate kodeBooking)
- `PATCH /api/booking/:id/status` — Update status booking
- `POST /api/ai/chat` — AI chatbot
- `POST /api/ai/recommend` — AI rekomendasi paket
- `GET /api/dashboard/stats` — Statistik admin
- `GET /api/dashboard/recent-bookings` — Booking terbaru

## Important Notes

- **Database**: Default ke `DATABASE_URL` (Replit PostgreSQL); SSL otomatis aktif jika connection string mengandung `sslmode=require` atau host `supabase.co`
- **API codegen**: `lib/api-zod/src/index.ts` hanya export dari `./generated/api` (tidak `./generated/types`)
- **UUID IDs**: Semua PK adalah UUID string (bukan integer/serial)
- **Status Bahasa Indonesia**: status booking dan testimoni dalam Bahasa Indonesia (menunggu, dikonfirmasi, dll.)
- **Booking code format**: `IDC-YYYYMMDD-XXXX` (auto-generated di server)
- AI uses OpenAI GPT-4o-mini with Replit AI proxy (`REPLIT_AI_KEY`) or fallback to OPENAI_API_KEY
- All UI text is in Bahasa Indonesia
- Supabase Auth frontend requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Supabase Auth API verification uses `SUPABASE_URL`/`SUPABASE_ANON_KEY` or the matching `VITE_` variables
- Route paths are React/Vite routes (`/login`, `/register`, `/profil`, `/dashboard`), not Next.js `/app/...` routes
