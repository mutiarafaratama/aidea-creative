# AideaCreative Studio Foto — SmartWeb

Platform web cerdas untuk AideaCreative Studio Foto, Pringsewu Lampung. Menggabungkan booking sesi foto, toko produk cetak, dan berbagai fitur otomatisasi berbasis AI.

---

## Fitur SmartWeb

### 1. AI Chatbot & Asisten Cerdas
- **Floating chatbot** tersedia di seluruh halaman — dapat diseret (draggable) di mobile dan desktop
- Menggunakan API OpenAI-compatible (Qwen Turbo / model custom)
- Dilengkapi **knowledge base** yang dapat diisi admin dengan informasi studio (layanan, harga, FAQ)
- Admin dapat mengambil alih percakapan kapan saja (**human takeover**)
- Di halaman Paket: tombol **"Asisten AI"** khusus membantu pelanggan memilih paket yang sesuai

### 2. AI Deskripsi Produk
- Admin dapat **generate otomatis** deskripsi produk menggunakan AI hanya dengan satu klik
- Menghemat waktu penulisan dan memastikan deskripsi selalu menarik

### 3. Push Notification (PWA)
- Aplikasi dapat **diinstal** di HP/desktop sebagai Progressive Web App (PWA)
- Pelanggan menerima **notifikasi push** saat status booking atau pesanan berubah
- Admin menerima notifikasi saat ada booking/pesanan baru masuk
- Notifikasi aktif bahkan saat browser ditutup (via Service Worker)

### 4. Real-time Status Polling
- Status booking dan pesanan **diperbarui otomatis** tanpa perlu refresh halaman
- Polling setiap 7–9 detik di halaman profil dan dashboard admin
- **Toast notification** muncul dengan suara dan getaran saat ada perubahan status
- Klik toast langsung mengarah ke tab yang relevan (Booking atau Pesanan)

### 5. Booking Sesi Foto
- Pelanggan dapat booking sesi foto langsung dari website
- **Alur pembayaran**: Menunggu → Dikonfirmasi Admin → Pelanggan Bayar → Selesai
- Mendukung pembayaran via **Midtrans** (transfer bank, e-wallet, QRIS) atau WhatsApp manual
- Admin dapat update status pembayaran: Belum Bayar → DP → Lunas
- Konfirmasi booking via WhatsApp ke admin studio

### 6. Toko Produk & Pesanan
- Toko produk cetak foto (album, frame, cetak foto, photobook, merchandise)
- Keranjang belanja dengan quantity control
- **Alur pesanan baru** (mirip booking): Menunggu → Dikonfirmasi → Bayar → Dikerjakan → Siap Ambil → Selesai
- Admin konfirmasi pesanan sebelum pelanggan bisa bayar
- Admin guard produksi: hanya bisa dikerjakan setelah pembayaran lunas
- Invoice/kwitansi pesanan dapat dicetak langsung dari browser

### 7. Promo & Diskon
- Admin dapat membuat banner promo dengan persentase atau nominal diskon
- Promo dapat dikaitkan ke paket layanan tertentu
- **Promo marquee** berjalan di halaman utama
- Halaman detail promo dengan countdown timer dan tombol booking langsung

### 8. Virtual Photobooth
- Fitur foto virtual **langsung dari browser** tanpa install aplikasi
- 3 tema frame: Aidea Blue, Love Edition, Night Sky
- Per-foto retake — ulangi hanya foto yang ingin diubah tanpa mengulang semua
- Download hasil foto dengan watermark logo studio
- Emoji stiker yang dapat diseret (drag) di mobile via Pointer Events API

### 9. Portfolio & Testimoni
- Galeri portfolio foto dengan filter kategori
- Testimoni pelanggan dengan sistem persetujuan admin
- Pelanggan dapat memberikan rating dan ulasan setelah booking/pesanan selesai
- Testimoni terbaru ditampilkan di halaman utama dan direfresh otomatis

### 10. Login & Keamanan
- **JWT Authentication** custom (30 hari) via httpOnly cookie + localStorage
- **Google OAuth** login/daftar dengan satu klik
- **Reset kata sandi** melalui admin — pelanggan hubungi via WhatsApp
- Admin dapat atur ulang kata sandi pengguna mana pun dari halaman Kelola Pengguna
- Token tersimpan aman, hanya admin yang bisa mengakses dashboard

### 11. Dashboard Admin Lengkap
- **Beranda**: ringkasan statistik booking, pesanan, pendapatan, pengguna
- **Booking**: kelola semua booking, konfirmasi, update status bayar
- **Pesanan Toko**: kelola pesanan produk, konfirmasi, update status produksi
- **Kelola Pengguna**: lihat semua akun, atur role admin/pelanggan, reset kata sandi
- **Jadwal Studio**: atur slot jadwal tersedia untuk booking
- **Produk**: tambah/edit/hapus produk toko dengan generator deskripsi AI
- **Paket Layanan**: kelola paket foto dengan harga, durasi, fasilitas
- **Portfolio**: upload dan kelola galeri foto studio
- **Testimoni**: moderasi ulasan pelanggan sebelum ditampilkan
- **Banner Promo**: buat dan kelola promosi dengan tanggal berlaku
- **Pricelist**: halaman daftar harga yang dapat diedit
- **Laporan**: ringkasan pendapatan dan statistik bulanan
- **Chat**: kelola percakapan AI chatbot, ambil alih dan balas manual

### 12. Pengaturan Situs
- Nama studio, alamat, WhatsApp, email, dan foto dapat diubah dari dashboard
- Informasi kontak otomatis digunakan di seluruh halaman dan invoice

---

## Tech Stack

| Komponen | Teknologi |
|---|---|
| Frontend | React 19, Vite 7, Tailwind CSS 4, shadcn/ui |
| Backend | Express 5, TypeScript, Drizzle ORM |
| Database | PostgreSQL (Supabase) |
| Auth | JWT custom, Google OAuth |
| Payment | Midtrans Snap (sandbox/production) |
| AI | OpenAI-compatible API (Qwen Turbo) |
| Push Notif | Web Push API, Service Worker (PWA) |
| Animations | Framer Motion |

---

## Cara Menjalankan (Development)

```bash
# Install dependencies
pnpm install

# Jalankan semua workflow:
# 1. API Server (port 8099)
# 2. Frontend (port 5000)
# 3. Dev Proxy 3000 (ekspor ke port 3000)
```

---

## Environment Variables

| Variable | Keterangan |
|---|---|
| `SUPABASE_DATABASE_URL` | Koneksi PostgreSQL Supabase |
| `SESSION_SECRET` | Secret untuk JWT signing |
| `MIDTRANS_SERVER_KEY` | Midtrans payment server key |
| `VITE_MIDTRANS_CLIENT_KEY` | Midtrans client key (shared) |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | API key AI (OpenAI-compatible) |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | Base URL API AI |
| `AI_MODEL` | Nama model AI (default: qwen-turbo) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `ADMIN_EMAILS` | Email admin (comma-separated) |
| `UPLOAD_DIR` | Direktori upload file |
