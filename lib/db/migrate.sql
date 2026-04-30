DROP TABLE IF EXISTS item_pesanan, pesanan_produk, chat_history, testimoni, booking, jadwal_tersedia, portfolio, paket_layanan, produk, kategori_layanan, profiles CASCADE;
DROP TYPE IF EXISTS role, booking_status, payment_status, pesanan_status, kategori_produk, pengirim CASCADE;

CREATE TYPE role AS ENUM ('admin', 'pelanggan');
CREATE TYPE booking_status AS ENUM ('menunggu', 'dikonfirmasi', 'selesai', 'dibatalkan');
CREATE TYPE payment_status AS ENUM ('belum_bayar', 'dp', 'lunas');
CREATE TYPE pesanan_status AS ENUM ('diproses', 'dikerjakan', 'selesai', 'dikirim', 'dibatalkan');
CREATE TYPE kategori_produk AS ENUM ('cetak_foto', 'frame', 'album', 'photobook', 'merchandise');
CREATE TYPE pengirim AS ENUM ('user', 'bot');

CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_lengkap TEXT NOT NULL,
  no_telepon TEXT,
  alamat TEXT,
  foto_profil TEXT,
  role role NOT NULL DEFAULT 'pelanggan',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE kategori_layanan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT NOT NULL,
  deskripsi TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE paket_layanan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kategori_id UUID REFERENCES kategori_layanan(id),
  nama_paket TEXT NOT NULL,
  deskripsi TEXT NOT NULL,
  harga INTEGER NOT NULL,
  durasi_sesi INTEGER NOT NULL DEFAULT 60,
  jumlah_foto INTEGER NOT NULL DEFAULT 20,
  fasilitas JSONB NOT NULL DEFAULT '[]',
  is_populer BOOLEAN NOT NULL DEFAULT false,
  is_aktif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE jadwal_tersedia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal TEXT NOT NULL,
  jam_mulai TEXT NOT NULL,
  jam_selesai TEXT NOT NULL,
  is_tersedia BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE produk (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_produk TEXT NOT NULL,
  deskripsi TEXT NOT NULL,
  harga INTEGER NOT NULL,
  stok INTEGER NOT NULL DEFAULT 0,
  kategori kategori_produk NOT NULL,
  ukuran TEXT,
  gambar_url JSONB NOT NULL DEFAULT '[]',
  is_aktif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE booking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode_booking TEXT NOT NULL UNIQUE,
  pelanggan_id UUID REFERENCES profiles(id),
  paket_id UUID NOT NULL REFERENCES paket_layanan(id),
  nama_pemesan TEXT NOT NULL,
  email TEXT NOT NULL,
  telepon TEXT NOT NULL,
  tanggal_sesi TEXT NOT NULL,
  jam_sesi TEXT NOT NULL,
  catatan_pelanggan TEXT,
  konsep_foto TEXT,
  status booking_status NOT NULL DEFAULT 'menunggu',
  total_harga INTEGER NOT NULL,
  status_pembayaran payment_status NOT NULL DEFAULT 'belum_bayar',
  midtrans_order_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE pesanan_produk (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode_pesanan TEXT NOT NULL UNIQUE,
  pelanggan_id UUID REFERENCES profiles(id),
  nama_pemesan TEXT NOT NULL,
  email TEXT NOT NULL,
  telepon TEXT NOT NULL,
  status pesanan_status NOT NULL DEFAULT 'diproses',
  total_harga INTEGER NOT NULL,
  alamat_pengiriman TEXT,
  catatan TEXT,
  status_pembayaran payment_status NOT NULL DEFAULT 'belum_bayar',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE item_pesanan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pesanan_id UUID NOT NULL REFERENCES pesanan_produk(id),
  produk_id UUID NOT NULL REFERENCES produk(id),
  jumlah INTEGER NOT NULL,
  harga_satuan INTEGER NOT NULL,
  subtotal INTEGER NOT NULL
);

CREATE TABLE portfolio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  judul TEXT NOT NULL,
  deskripsi TEXT,
  kategori TEXT NOT NULL,
  gambar_url JSONB NOT NULL DEFAULT '[]',
  tags JSONB NOT NULL DEFAULT '[]',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE testimoni (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pelanggan_id UUID REFERENCES profiles(id),
  booking_id UUID REFERENCES booking(id),
  rating INTEGER NOT NULL,
  komentar TEXT NOT NULL,
  nama_tampil TEXT NOT NULL,
  foto_url TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID,
  pesan TEXT NOT NULL,
  pengirim pengirim NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
