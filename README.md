# AideaCreative Studio Foto — Dokumentasi Lengkap

> Aplikasi web booking foto + e-commerce untuk **AideaCreative Studio Foto** di Pringsewu, Lampung.
> Dibuat dengan monorepo pnpm, React + Vite (frontend) dan Express + TypeScript (backend).

---

## Daftar Isi

1. [Gambaran Umum](#1-gambaran-umum)
2. [Teknologi yang Digunakan](#2-teknologi-yang-digunakan)
3. [Arsitektur Sistem](#3-arsitektur-sistem)
4. [Struktur File & Direktori](#4-struktur-file--direktori)
5. [Hubungan Antar File](#5-hubungan-antar-file)
6. [Skema Database](#6-skema-database)
7. [Daftar Lengkap API Endpoint](#7-daftar-lengkap-api-endpoint)
8. [Alur Autentikasi (Auth Flow)](#8-alur-autentikasi-auth-flow)
9. [Alur Booking & Pembayaran](#9-alur-booking--pembayaran)
10. [Alur Pesanan Produk (E-commerce)](#10-alur-pesanan-produk-e-commerce)
11. [Fitur AI Chatbot](#11-fitur-ai-chatbot)
12. [Upload File](#12-upload-file)
13. [Variabel Lingkungan (Environment Variables)](#13-variabel-lingkungan-environment-variables)
14. [Cara Menjalankan Aplikasi](#14-cara-menjalankan-aplikasi)
15. [Deployment (Produksi)](#15-deployment-produksi)

---

## 1. Gambaran Umum

AideaCreative Studio Foto adalah platform digital untuk studio foto profesional yang menyediakan:

- **Booking sesi foto online** — pelanggan memilih paket, tanggal & jam, lalu membayar via Midtrans
- **Toko produk fisik** — jual cetak foto, album, bingkai, dll. dengan keranjang belanja
- **Portfolio** — galeri karya studio
- **Testimoni** — ulasan pelanggan dengan moderasi admin
- **AI Chatbot** — asisten berbasis AI + handoff ke admin manusia
- **Photobooth Virtual** — fitur photobooth di browser dengan berbagai frame/tema
- **Dashboard Admin** — kelola semua data, chat, laporan, & pengaturan situs

---

## 2. Teknologi yang Digunakan

### Frontend
| Teknologi | Versi | Kegunaan |
|---|---|---|
| React | 19 | UI library utama |
| Vite | 7 | Build tool & dev server |
| TypeScript | 5 | Type safety |
| Tailwind CSS | 4 | Utility-first styling |
| shadcn/ui + Radix UI | latest | Komponen UI siap pakai |
| Framer Motion | latest | Animasi |
| Wouter | latest | Client-side routing (pengganti React Router) |
| TanStack Query (React Query) | v5 | Fetching data & caching |
| React Hook Form + Zod | latest | Form & validasi |
| Lucide React | latest | Ikon |
| vite-plugin-pwa | latest | PWA (Progressive Web App) |

### Backend
| Teknologi | Versi | Kegunaan |
|---|---|---|
| Express | 5 | HTTP server framework |
| TypeScript | 5 | Type safety |
| Drizzle ORM | latest | Query builder & schema DB |
| node-postgres (pg) | latest | Driver PostgreSQL |
| jsonwebtoken | latest | Buat & verifikasi JWT token |
| bcrypt | latest | Hash password |
| Midtrans | latest | Payment gateway |
| OpenAI SDK | latest | Integrasi AI chatbot |
| Pino | latest | Structured logging |
| esbuild | latest | Bundle backend ke satu file |

### Database & Infrastruktur
| Teknologi | Kegunaan |
|---|---|
| PostgreSQL | Database utama (hosted di Supabase) |
| Drizzle Kit | Migrasi & push schema ke database |
| Replit Secrets | Menyimpan env vars & API keys |
| Docker + docker-compose | Deployment ke Railway / server sendiri |

---

## 3. Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────────┐
│                         BROWSER / CLIENT                        │
│                                                                 │
│  React 19 + Vite (port 5000)                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Public Pages│  │ Admin Pages  │  │   AI Chatbot (float) │  │
│  │  /           │  │ /dashboard/* │  │   (draggable, fixed) │  │
│  │  /paket      │  │              │  └──────────────────────┘  │
│  │  /booking    │  │              │                             │
│  │  /toko       │  │              │                             │
│  │  /profil     │  │              │                             │
│  └──────────────┘  └──────────────┘                             │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP /api/* (proxy Vite → 8099)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  EXPRESS API SERVER (port 8099)                 │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │  Auth    │  │ Booking  │  │  Produk  │  │  AI / Chat    │  │
│  │  Routes  │  │  Routes  │  │  Routes  │  │  Routes       │  │
│  └──────────┘  └──────────┘  └──────────┘  └───────────────┘  │
│                                                                 │
│  Middleware: JWT verify, requireAdmin, pino logger, cors        │
└────────────────┬──────────────────────┬─────────────────────────┘
                 │                      │
                 ▼                      ▼
┌────────────────────────┐   ┌──────────────────────────────────┐
│  PostgreSQL (Supabase) │   │  External Services               │
│                        │   │  - Midtrans (payment gateway)    │
│  Drizzle ORM           │   │  - OpenAI-compatible API (AI)    │
│  (SUPABASE_DATABASE_URL│   │  - Google OAuth2                 │
└────────────────────────┘   └──────────────────────────────────┘
```

### Alur Request (Dev Mode)
```
Browser → Dev Proxy (port 3000) → Vite Dev Server (port 5000)
                                        │
                                        ├── /api/* → Express (port 8099)
                                        └── /* → React SPA
```

### Alur Request (Produksi / Docker)
```
Browser → Express (port 8080)
              │
              ├── /api/* → Route handlers Express
              ├── /uploads/* → Static files (file upload)
              └── /* → index.html (React SPA)
```

---

## 4. Struktur File & Direktori

```
workspace/
├── artifacts/
│   ├── aidea-creative/              ← FRONTEND (React + Vite)
│   │   ├── src/
│   │   │   ├── pages/               ← Halaman-halaman aplikasi
│   │   │   │   ├── home.tsx         ← Beranda
│   │   │   │   ├── paket.tsx        ← Daftar paket layanan
│   │   │   │   ├── booking.tsx      ← Form booking sesi foto
│   │   │   │   ├── toko.tsx         ← Toko produk / e-commerce
│   │   │   │   ├── portfolio.tsx    ← Galeri portfolio
│   │   │   │   ├── testimoni.tsx    ← Halaman testimoni
│   │   │   │   ├── photobooth.tsx   ← Virtual photobooth di browser
│   │   │   │   ├── profil.tsx       ← Profil & riwayat booking/pesanan
│   │   │   │   ├── login.tsx        ← Halaman login
│   │   │   │   ├── register.tsx     ← Halaman daftar akun
│   │   │   │   ├── promo-detail.tsx ← Detail promo
│   │   │   │   └── admin/           ← Semua halaman dashboard admin
│   │   │   │       ├── beranda.tsx  ← Statistik ringkasan admin
│   │   │   │       ├── bookings.tsx ← Kelola semua booking
│   │   │   │       ├── produk.tsx   ← Kelola produk toko
│   │   │   │       ├── pesanan.tsx  ← Kelola pesanan produk
│   │   │   │       ├── portfolio.tsx← Kelola portfolio
│   │   │   │       ├── testimoni.tsx← Moderasi testimoni
│   │   │   │       ├── chat.tsx     ← Admin live chat
│   │   │   │       ├── jadwal.tsx   ← Kelola jadwal tersedia
│   │   │   │       ├── landing.tsx  ← Pengaturan halaman utama
│   │   │   │       ├── paket.tsx    ← Kelola paket layanan
│   │   │   │       ├── promo.tsx    ← Kelola promo/banner
│   │   │   │       ├── laporan.tsx  ← Laporan bulanan
│   │   │   │       ├── pricelist.tsx← Kelola daftar harga
│   │   │   │       └── users.tsx    ← Kelola pengguna
│   │   │   ├── components/          ← Komponen React reusable
│   │   │   │   ├── layout.tsx       ← Layout utama (navbar + footer)
│   │   │   │   ├── ai-chatbot.tsx   ← Floating AI chatbot (draggable)
│   │   │   │   ├── install-prompt.tsx ← Prompt install PWA
│   │   │   │   ├── protected-route.tsx ← Guard rute auth/admin
│   │   │   │   └── ui/              ← Komponen shadcn/ui
│   │   │   ├── lib/                 ← Utility & hooks
│   │   │   │   ├── auth.tsx         ← AuthContext + useAuth hook
│   │   │   │   ├── settings.ts      ← useSiteSettings hook
│   │   │   │   ├── admin-api.ts     ← Fungsi fetch admin
│   │   │   │   └── utils.ts         ← Helper umum (cn, format, dll)
│   │   │   ├── contexts/
│   │   │   │   └── cart-context.tsx ← CartContext (keranjang belanja)
│   │   │   ├── App.tsx              ← Root app + definisi semua route
│   │   │   └── main.tsx             ← Entry point React
│   │   ├── public/                  ← Static assets
│   │   │   ├── manifest.webmanifest ← PWA manifest
│   │   │   ├── pwa-192.png          ← PWA icon
│   │   │   └── images/              ← Logo & gambar statis
│   │   └── vite.config.ts           ← Konfigurasi Vite (proxy, PWA, dll)
│   │
│   └── api-server/                  ← BACKEND (Express)
│       ├── src/
│       │   ├── index.ts             ← Entry point server (listen port)
│       │   ├── app.ts               ← Setup Express (middleware, routes)
│       │   ├── routes/              ← Route handlers API
│       │   │   ├── index.ts         ← Kumpulkan semua router
│       │   │   ├── auth.ts          ← Register, login, logout, /me
│       │   │   ├── google-auth.ts   ← Google OAuth2 callback
│       │   │   ├── booking.ts       ← CRUD booking + payment Midtrans
│       │   │   ├── paket.ts         ← CRUD paket layanan
│       │   │   ├── kategori.ts      ← Daftar kategori layanan
│       │   │   ├── produk.ts        ← CRUD produk toko
│       │   │   ├── pesanan.ts       ← CRUD pesanan + payment Midtrans
│       │   │   ├── portfolio.ts     ← CRUD portfolio
│       │   │   ├── testimoni.ts     ← CRUD + moderasi testimoni
│       │   │   ├── promo.ts         ← CRUD promo/banner
│       │   │   ├── jadwal.ts        ← Kelola jadwal tersedia
│       │   │   ├── settings.ts      ← Pengaturan situs (key-value)
│       │   │   ├── ai.ts            ← AI chat, generate, recommend
│       │   │   ├── chat.ts          ← Polling chat + handoff ke admin
│       │   │   ├── admin.ts         ← Admin: chat sessions + laporan
│       │   │   ├── dashboard.ts     ← Statistik dashboard admin
│       │   │   ├── upload-local.ts  ← Upload file ke filesystem lokal
│       │   │   ├── me.ts            ← GET/PUT profil sendiri
│       │   │   ├── users.ts         ← Admin: kelola semua pengguna
│       │   │   ├── kb.ts            ← Admin: knowledge base AI
│       │   │   ├── pricelist.ts     ← CRUD daftar harga
│       │   │   └── health.ts        ← Health check endpoint
│       │   └── lib/
│       │       ├── auth.ts          ← Middleware JWT (requireAuth, requireAdmin)
│       │       ├── midtrans.ts      ← Inisialisasi Midtrans client
│       │       └── logger.ts        ← Pino logger setup
│       └── build.mjs                ← Script build esbuild
│
├── lib/
│   ├── db/                          ← DATABASE LAYER
│   │   ├── src/
│   │   │   ├── index.ts             ← Koneksi DB (pakai SUPABASE_DATABASE_URL)
│   │   │   └── schema/              ← Definisi tabel Drizzle ORM
│   │   │       ├── profiles.ts      ← Tabel profil pengguna
│   │   │       ├── users_auth.ts    ← Tabel autentikasi (email + hash)
│   │   │       ├── booking.ts       ← Tabel booking sesi foto
│   │   │       ├── paket_layanan.ts ← Tabel paket foto
│   │   │       ├── kategori_layanan.ts ← Tabel kategori paket
│   │   │       ├── produk.ts        ← Tabel produk toko
│   │   │       ├── pesanan_produk.ts← Tabel pesanan produk
│   │   │       ├── item_pesanan.ts  ← Tabel item baris pesanan
│   │   │       ├── portfolio.ts     ← Tabel portfolio
│   │   │       ├── testimoni.ts     ← Tabel testimoni
│   │   │       ├── promo.ts         ← Tabel promo/banner
│   │   │       ├── jadwal_tersedia.ts ← Tabel slot jadwal
│   │   │       ├── pengaturan_situs.ts ← Tabel pengaturan (key-value)
│   │   │       ├── chat_session.ts  ← Tabel sesi chat
│   │   │       ├── chat_history.ts  ← Tabel riwayat pesan chat
│   │   │       ├── chat_kb.ts       ← Tabel knowledge base AI
│   │   │       └── pricelist.ts     ← Tabel daftar harga
│   │   └── drizzle.config.ts        ← Konfigurasi Drizzle Kit (migrasi)
│   │
│   └── api-client-react/            ← AUTO-GENERATED API CLIENT
│       └── src/                     ← Dibuat dari lib/api-spec dengan Orval
│
├── scripts/
│   └── dev-proxy.mjs                ← Dev proxy: port 3000 → 5000
├── Dockerfile                       ← Multi-stage build untuk produksi
├── docker-compose.yml               ← Docker Compose untuk deployment
└── pnpm-workspace.yaml              ← Konfigurasi pnpm monorepo
```

---

## 5. Hubungan Antar File

### Alur Data: Booking

```
[Pengguna buka /booking?paket=xxx]
        │
        ▼
booking.tsx (React page)
  ├── useSiteSettings() ← lib/settings.ts → GET /api/settings
  ├── useQuery paketList → GET /api/paket
  ├── useQuery promoList → GET /api/promo
  └── handleSubmit → POST /api/booking
                          │
                          ▼
               api-server/routes/booking.ts
                  ├── attachAuth middleware ← lib/auth.ts (verifikasi JWT)
                  ├── Baca paket dari DB ← lib/db (Drizzle ORM)
                  ├── Baca promo dari DB
                  ├── Hitung diskon
                  ├── Insert ke tabel `booking`
                  └── Return data booking
```

### Alur Data: Pembayaran Booking

```
profil.tsx → klik "Bayar Sekarang"
        │
        ▼
POST /api/booking/:id/payment
  ├── Cek status booking === "dikonfirmasi"
  ├── Buat Midtrans Snap Token
  └── Return snapToken + orderId
        │
        ▼
Frontend: window.snap.pay(snapToken)   ← Midtrans Snap JS
        │
        ▼ (setelah user bayar)
POST /api/booking/:id/verify-payment
  ├── Cek status ke Midtrans API
  └── Update status_pembayaran di DB
```

### Alur Data: AI Chatbot

```
ai-chatbot.tsx (floating button)
  │
  ├── POST /api/ai/chat (kirim pesan ke AI)
  │       └── api-server/routes/ai.ts
  │               ├── Baca knowledge base dari `chat_kb`
  │               ├── Kirim ke OpenAI-compatible API
  │               └── Simpan ke chat_history
  │
  ├── POST /api/chat/handoff (minta admin manusia)
  │       └── Update status chat_session → "menunggu_admin"
  │
  └── GET /api/chat/messages (polling setiap 5 detik)
          └── Ambil pesan baru dari admin di chat_history
```

### Hubungan Auth

```
App.tsx → AuthProvider (lib/auth.tsx)
    ├── Simpan JWT di localStorage["auth_token"]
    ├── Set cookie httpOnly "auth_token"
    └── useAuth() hook tersedia di semua halaman
            │
            ▼
    GET /api/auth/me → verifikasi token → return user + profile
            │
            ▼
    api-server/lib/auth.ts → middleware
        ├── attachAuth  → decode token, set req.user (opsional)
        └── requireAuth → wajib login, 401 jika tidak
        └── requireAdmin → wajib role admin, 403 jika bukan
```

---

## 6. Skema Database

Semua tabel menggunakan UUID sebagai primary key. Database: **PostgreSQL via Supabase**.

### `profiles` — Data profil pengguna
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | ID unik profil |
| nama_lengkap | text | Nama lengkap |
| no_telepon | text | Nomor telepon |
| alamat | text | Alamat |
| foto_profil | text | URL foto profil |
| role | enum | `admin` atau `pelanggan` |
| created_at | timestamp | Waktu dibuat |

### `users_auth` — Data autentikasi
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| profile_id | UUID FK → profiles | Relasi ke profil |
| email | text UNIQUE | Email login |
| password_hash | text | Bcrypt hash password |
| provider | text | `email` atau `google` |
| google_id | text | ID Google OAuth |

### `paket_layanan` — Paket foto
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| kategori_id | UUID FK → kategori_layanan | |
| nama_paket | text | Nama paket |
| deskripsi | text | Deskripsi |
| harga | integer | Harga dalam rupiah |
| durasi_sesi | integer | Durasi (menit) |
| jumlah_foto | integer | Jumlah foto yang didapat |
| fasilitas | jsonb (string[]) | Daftar fasilitas |
| foto_url | text | URL thumbnail |
| is_populer | boolean | Ditandai populer |
| is_aktif | boolean | Tampil di publik |

### `booking` — Booking sesi foto
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| kode_booking | text UNIQUE | Kode unik (misal: BK-20240501-XXXX) |
| pelanggan_id | UUID FK → profiles | |
| paket_id | UUID FK → paket_layanan | |
| nama_pemesan | text | |
| email | text | |
| telepon | text | |
| tanggal_sesi | text | Format YYYY-MM-DD |
| jam_sesi | text | Format HH:MM |
| catatan_pelanggan | text | |
| konsep_foto | text | |
| status | enum | `menunggu` → `dikonfirmasi` → `selesai` |
| total_harga | integer | Harga setelah diskon |
| harga_asli | integer | Harga sebelum diskon |
| diskon_amount | integer | Nominal diskon |
| promo_id | UUID FK → promo | Promo yang dipakai |
| status_pembayaran | enum | `belum_bayar` / `lunas` / `refund` |
| midtrans_order_id | text | ID order Midtrans |

### `produk` — Produk toko
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| nama_produk | text | |
| deskripsi | text | |
| harga | integer | |
| stok | integer | |
| kategori | text | |
| foto_url | text | |
| is_aktif | boolean | |

### `pesanan_produk` — Pesanan e-commerce
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| kode_pesanan | text UNIQUE | |
| pelanggan_id | UUID FK → profiles | |
| status | enum | `diproses` → `siap` → `diterima` / `batal` |
| total_harga | integer | |
| alamat_pengiriman | text | |
| status_pembayaran | enum | `belum_bayar` / `lunas` / `refund` |
| midtrans_order_id | text | |

### `item_pesanan` — Item dalam pesanan
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| pesanan_id | UUID FK → pesanan_produk | |
| produk_id | UUID FK → produk | |
| jumlah | integer | Qty |
| harga_satuan | integer | Harga per item saat dipesan |

### `pengaturan_situs` — Pengaturan situs (key-value)
| Key | Contoh Value | Keterangan |
|---|---|---|
| contactWhatsapp | `6285279232879` | Nomor WA admin |
| contactEmail | `info@aidea.com` | Email kontak |
| heroTitle | `Foto yang bicara.` | Judul hero beranda |
| instagramUrl | `https://instagram.com/...` | URL sosial media |
| businessName | `AideaCreative Studio Foto` | Nama bisnis |

### `chat_session` — Sesi chat AI/admin
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| session_id | text UNIQUE | Dari localStorage browser |
| status | text | `ai` / `menunggu_admin` / `admin` / `selesai` |
| profile_id | UUID FK | Jika pengguna sudah login |

### Tabel lainnya
- **`portfolio`** — id, judul, deskripsi, foto_url, kategori, is_featured
- **`testimoni`** — id, pelanggan_id, rating, isi, status (menunggu/disetujui/ditolak)
- **`promo`** — id, nama, kode_promo, tipe_diskon (persen/nominal), nilai_diskon, berlaku_sampai
- **`jadwal_tersedia`** — id, tanggal, jam_mulai, jam_selesai, is_tersedia
- **`chat_history`** — id, session_id, pengirim (user/ai/admin), pesan, created_at
- **`chat_kb`** — id, judul, konten (knowledge base untuk AI)
- **`pricelist`** — id, judul, foto_url, urutan

---

## 7. Daftar Lengkap API Endpoint

Semua endpoint diawali `/api`. Auth dilakukan via header `Authorization: Bearer <token>`.

### Autentikasi
| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| POST | `/auth/register` | — | Daftar akun baru |
| POST | `/auth/login` | — | Login, return JWT token |
| POST | `/auth/logout` | — | Hapus cookie auth |
| GET | `/auth/me` | Bearer | Info user yang sedang login |
| GET | `/auth/google` | — | Mulai Google OAuth2 |
| GET | `/auth/google/callback` | — | Callback Google OAuth2 |

### Profil Pengguna
| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| GET | `/me` | Bearer | Ambil profil sendiri |
| PUT | `/me` | Bearer | Update profil sendiri (nama, telepon, alamat) |
| GET | `/admin/users` | Admin | List semua pengguna |
| PATCH | `/admin/users/:id` | Admin | Update data pengguna |
| DELETE | `/admin/users/:id` | Admin | Hapus akun pengguna |

### Paket & Kategori
| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| GET | `/kategori` | — | List kategori layanan |
| GET | `/paket` | — | List semua paket foto |
| GET | `/paket/rekomendasi` | — | Rekomendasi paket (berdasarkan frekuensi booking) |
| GET | `/paket/:id` | — | Detail satu paket |
| POST | `/paket` | Admin | Buat paket baru |
| PUT | `/paket/:id` | Admin | Update paket |
| DELETE | `/paket/:id` | Admin | Hapus paket |

### Booking
| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| GET | `/booking/me` | Bearer | Booking milik pengguna sendiri |
| GET | `/booking` | Admin | Semua booking |
| POST | `/booking` | Bearer | Buat booking baru |
| GET | `/booking/:id` | — | Detail booking |
| PUT | `/booking/:id` | Admin | Update status booking |
| DELETE | `/booking/:id` | Admin | Hapus booking |
| POST | `/booking/:id/cancel` | Bearer | Batalkan booking |
| POST | `/booking/:id/payment` | Bearer | Buat Midtrans Snap token untuk bayar |
| POST | `/booking/:id/verify-payment` | Bearer | Verifikasi status bayar ke Midtrans |
| GET | `/booking/check-slot` | — | Cek ketersediaan slot tanggal+jam |

### Jadwal
| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| GET | `/jadwal` | — | Slot tersedia 30 hari ke depan |
| GET | `/jadwal/aturan` | — | Aturan jam buka & durasi slot |
| GET | `/jadwal/blackout` | — | Daftar tanggal libur/tutup |
| PUT | `/admin/jadwal/aturan` | Admin | Update aturan jam buka |
| PUT | `/admin/jadwal/blackout` | Admin | Update tanggal libur |
| POST | `/jadwal` | Admin | Buat slot manual |
| PATCH | `/jadwal/:id` | Admin | Update slot manual |
| DELETE | `/jadwal/:id` | Admin | Hapus slot manual |

### Produk & Pesanan (E-commerce)
| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| GET | `/produk` | — | List produk |
| GET | `/produk/:id` | — | Detail produk |
| POST | `/produk` | Admin | Tambah produk |
| PUT | `/produk/:id` | Admin | Update produk |
| DELETE | `/produk/:id` | Admin | Hapus produk |
| POST | `/pesanan` | Bearer | Buat pesanan (checkout keranjang) |
| GET | `/pesanan/me` | Bearer | Pesanan milik sendiri |
| GET | `/pesanan` | Admin | Semua pesanan |
| POST | `/pesanan/verify` | Bearer | Verifikasi bayar pesanan ke Midtrans |
| POST | `/pesanan/midtrans-notification` | — | Webhook Midtrans (notifikasi otomatis) |
| PUT | `/pesanan/:id/status` | Admin | Update status pesanan |
| PUT | `/pesanan/:id/terima` | Bearer | Konfirmasi produk diterima |
| DELETE | `/pesanan/:id` | Admin | Hapus pesanan |

### Portfolio & Testimoni
| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| GET | `/portfolio` | — | List portfolio |
| POST | `/portfolio` | Admin | Tambah portfolio |
| PUT | `/portfolio/:id` | Admin | Update portfolio |
| DELETE | `/portfolio/:id` | Admin | Hapus portfolio |
| GET | `/testimoni` | — | List testimoni yang disetujui |
| GET | `/testimoni/me` | Bearer | Testimoni milik sendiri |
| POST | `/testimoni` | Bearer | Kirim testimoni baru |
| PATCH | `/testimoni/:id` | Admin | Setujui / tolak testimoni |
| DELETE | `/testimoni/:id` | Admin | Hapus testimoni |

### Promo & Pricelist
| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| GET | `/promo` | — | List promo aktif |
| GET | `/promo/:id` | — | Detail promo |
| POST | `/promo` | Admin | Buat promo |
| PUT | `/promo/:id` | Admin | Update promo |
| DELETE | `/promo/:id` | Admin | Hapus promo |
| GET | `/pricelist` | — | List gambar daftar harga |
| POST | `/pricelist` | Admin | Upload gambar daftar harga |
| PUT | `/pricelist/:id` | Admin | Update data daftar harga |
| DELETE | `/pricelist/:id` | Admin | Hapus daftar harga |

### AI & Chat
| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| POST | `/ai/chat` | — | Chat dengan asisten AI |
| POST | `/ai/generate` | — | Generate teks dengan AI (deskripsi produk, dll) |
| POST | `/ai/recommend` | — | Rekomendasi paket via AI |
| GET | `/chat/messages` | — | Polling pesan baru untuk sesi chat |
| POST | `/chat/handoff` | — | Minta bantuan admin manusia |
| GET | `/admin/chat/sessions` | Admin | List sesi chat aktif |
| GET | `/admin/chat/sessions/:id` | Admin | Riwayat pesan satu sesi |
| POST | `/admin/chat/reply` | Admin | Balas pesan pelanggan |
| PATCH | `/admin/chat/sessions/:id` | Admin | Update status sesi chat |

### Pengaturan & Upload
| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| GET | `/settings` | — | Semua pengaturan situs |
| PUT | `/admin/settings` | Admin | Update pengaturan situs |
| GET | `/admin/kb` | Admin | List knowledge base AI |
| POST | `/admin/kb` | Admin | Tambah entry knowledge base |
| PUT | `/admin/kb/:id` | Admin | Update knowledge base |
| DELETE | `/admin/kb/:id` | Admin | Hapus knowledge base |
| POST | `/upload/supabase` | Admin | Upload file (simpan di server) |
| POST | `/upload/supabase/destroy` | Admin | Hapus file |
| POST | `/upload/avatar` | Bearer | Upload foto profil |
| GET | `/admin/laporan/bulanan` | Admin | Laporan statistik bulanan |
| GET | `/healthz` | — | Health check |

---

## 8. Alur Autentikasi (Auth Flow)

### Registrasi & Login Biasa

```
1. User isi form register → POST /api/auth/register
   - Backend buat profil di `profiles`
   - Backend buat record di `users_auth` dengan password di-hash bcrypt
   - Return: JWT token (30 hari)

2. User isi form login → POST /api/auth/login
   - Backend cek email di `users_auth`
   - bcrypt.compare(password, hash)
   - Return: JWT token
   - Token disimpan di: localStorage["auth_token"] + cookie httpOnly "auth_token"

3. Setiap request ke API yang butuh auth:
   - Frontend kirim header: Authorization: Bearer <token>
   - Backend middleware decode JWT → set req.user
   - Jika invalid/expired → return 401
```

### Google OAuth2

```
1. User klik "Login dengan Google" → GET /api/auth/google
2. Redirect ke Google consent screen
3. Google callback → GET /api/auth/google/callback
4. Backend buat/update user di DB, buat JWT
5. Redirect ke frontend: /auth/callback?token=<JWT>
6. Frontend simpan token ke localStorage + refresh profil
```

### Role Admin
- Role ditentukan dari kolom `role` di tabel `profiles` (`admin` / `pelanggan`)
- Email yang terdaftar di env var `ADMIN_EMAILS` otomatis mendapat role admin saat registrasi
- Middleware `requireAdmin` memeriksa `req.user.role === 'admin'`

---

## 9. Alur Booking & Pembayaran

```
STATUS BOOKING: menunggu → dikonfirmasi → selesai
                    │            │
                 (dibatalkan) (dibayar)

STATUS PEMBAYARAN: belum_bayar → lunas
```

**Langkah-langkah:**

1. **User buka `/booking`** → pilih paket, tanggal, jam, isi data diri
2. **Submit** → `POST /api/booking` → status: `menunggu`
3. **Admin konfirmasi** via Dashboard → status jadi `dikonfirmasi`
4. **User melihat di `/profil`** → tombol "Bayar Sekarang" muncul
5. **User klik bayar** → `POST /api/booking/:id/payment` → dapat Midtrans Snap Token
6. **Midtrans Snap popup** muncul di browser → user pilih metode bayar
7. **Setelah bayar** → `POST /api/booking/:id/verify-payment` → status_pembayaran: `lunas`
8. **Admin selesaikan sesi** → status: `selesai`

> **Catatan:** Backend memblokir permintaan payment jika status booking belum `dikonfirmasi`.

---

## 10. Alur Pesanan Produk (E-commerce)

```
STATUS PESANAN: diproses → siap → diterima
                    │
                 (batal)

STATUS PEMBAYARAN: belum_bayar → lunas
```

1. **User tambah ke keranjang** → `CartContext` di React (localStorage)
2. **Checkout** → `POST /api/pesanan` (beserta array item) → status: `diproses`
3. **Midtrans Snap token** dibuat sekaligus saat `POST /api/pesanan`
4. **User bayar** via Midtrans Snap popup
5. **Verifikasi** → `POST /api/pesanan/verify` atau webhook otomatis dari Midtrans (`POST /api/pesanan/midtrans-notification`)
6. **Admin update** status → `siap` (barang siap diambil/dikirim)
7. **User konfirmasi terima** → `PUT /api/pesanan/:id/terima` → status: `diterima`

---

## 11. Fitur AI Chatbot

**File:** `artifacts/aidea-creative/src/components/ai-chatbot.tsx`

- Tombol floating `position: fixed` di pojok kanan bawah — bisa **di-drag** ke mana saja
- Posisi disimpan di `localStorage["aidea_chat_btn_pos"]`
- Posisi selalu di-clamp ke dalam viewport (tidak bisa hilang dari layar)
- Di mobile (<640px): window chat muncul hampir full-width (8px dari kiri-kanan)
- Di desktop: window chat 384x520px di pojok kanan bawah

**Alur percakapan:**
```
User kirim pesan
     │
     ▼
POST /api/ai/chat
     │
     ├── Backend baca chat_kb (knowledge base) dari DB
     ├── Kirim ke OpenAI API: system prompt + KB + riwayat chat + pesan user
     ├── Simpan pesan user & balasan AI ke chat_history
     └── Return balasan AI
     
     ▼ (jika user klik "Bicara dengan Admin")
POST /api/chat/handoff
     └── Update status chat_session → "menunggu_admin"
     
     ▼ (polling setiap 5 detik)
GET /api/chat/messages
     └── Ambil pesan baru dari admin di chat_history
```

---

## 12. Upload File

- Upload disimpan di **filesystem lokal** server di direktori `UPLOAD_DIR` (default: `./uploads/`)
- File di-serve publik via Express static: `GET /uploads/<filename>`
- Upload endpoint menerima **Base64** (`data:image/jpeg;base64,...`) bukan multipart form

| Endpoint | Auth | Keterangan |
|---|---|---|
| `POST /api/upload/supabase` | Admin | Upload gambar (paket, portfolio, produk, dll) |
| `POST /api/upload/supabase/destroy` | Admin | Hapus file |
| `POST /api/upload/avatar` | Bearer | Upload foto profil pengguna |

---

## 13. Variabel Lingkungan (Environment Variables)

| Variabel | Wajib | Keterangan |
|---|---|---|
| `SUPABASE_DATABASE_URL` | ✅ | PostgreSQL connection string (dari Supabase) |
| `SESSION_SECRET` | ✅ | Secret untuk signing JWT token |
| `MIDTRANS_SERVER_KEY` | ✅ | Server key Midtrans (payment) |
| `VITE_MIDTRANS_CLIENT_KEY` | ✅ | Client key Midtrans (frontend Snap.js) |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | ✅ | API key OpenAI / AI provider |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | ✅ | Base URL OpenAI API (bisa custom) |
| `AI_MODEL` | — | Nama model AI (default: `qwen-turbo`) |
| `GOOGLE_CLIENT_ID` | — | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | — | Google OAuth Client Secret |
| `ADMIN_EMAILS` | — | Email admin (comma-separated, default: `tiarafaratama@gmail.com`) |
| `UPLOAD_DIR` | — | Path direktori upload (default: `./uploads/`) |
| `PORT` | — | Port API server (default: 8099) |
| `NODE_ENV` | — | `development` atau `production` |

---

## 14. Cara Menjalankan Aplikasi

### Prasyarat
- Node.js 20+
- pnpm 9+
- PostgreSQL (atau akun Supabase)

### Langkah-langkah

```bash
# 1. Install semua dependencies
pnpm install

# 2. Set environment variables
# Buat file .env di root atau gunakan Replit Secrets

# 3. Push schema database (pertama kali)
pnpm --filter @workspace/db run push

# 4. Jalankan API server (port 8099)
PORT=8099 pnpm --filter @workspace/api-server run dev:app

# 5. Jalankan frontend (port 5000)
PORT=5000 BASE_PATH=/ pnpm --filter @workspace/aidea-creative run dev:app

# 6. (Opsional) Dev proxy untuk preview eksternal (port 3000 → 5000)
PROXY_PORT=3000 TARGET_PORT=5000 node scripts/dev-proxy.mjs
```

### Akses Aplikasi
| URL | Keterangan |
|---|---|
| `http://localhost:5000` | Frontend (dev) |
| `http://localhost:8099/api` | API server langsung |
| `http://localhost:3000` | Dev proxy (preview eksternal) |
| `http://localhost:5000/dashboard/login` | Login admin |

---

## 15. Deployment (Produksi)

Aplikasi di-deploy ke Railway menggunakan Docker.

### Build & Run Manual

```bash
# Build Docker image
docker build -t aidea-creative .

# Run
docker run -p 8080:8080 \
  -e SUPABASE_DATABASE_URL="..." \
  -e SESSION_SECRET="..." \
  -e MIDTRANS_SERVER_KEY="..." \
  aidea-creative
```

### Dockerfile (Multi-stage)

```
Stage 1 (builder): 
  - Install dependencies
  - Build frontend: vite build → dist/public
  - Build backend: esbuild → dist/index.mjs

Stage 2 (runner):
  - Copy dist/ dari builder
  - Run: node dist/index.mjs
```

Di produksi, **Express melayani sekaligus**:
- `/api/*` → Route handlers
- `/uploads/*` → Static file upload
- `/*` → `index.html` (SPA fallback)

---

*Dokumentasi ini dibuat sebagai bahan pembelajaran arsitektur fullstack monorepo dengan React + Express + PostgreSQL.*
