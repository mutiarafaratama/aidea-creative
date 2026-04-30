-- Profiles (admin + pelanggan)
INSERT INTO profiles (id, nama_lengkap, no_telepon, alamat, role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Admin AideaCreative', '082178563210', 'Pujodadi, Pringsewu, Lampung', 'admin'),
  ('00000000-0000-0000-0000-000000000002', 'Sari Dewi', '081234567890', 'Pringsewu, Lampung', 'pelanggan'),
  ('00000000-0000-0000-0000-000000000003', 'Rizky Pratama', '082345678901', 'Gadingrejo, Pringsewu', 'pelanggan'),
  ('00000000-0000-0000-0000-000000000004', 'Budi Santoso', '083456789012', 'Sukoharjo, Pringsewu', 'pelanggan');

-- Kategori Layanan
INSERT INTO kategori_layanan (id, nama, deskripsi, icon) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Portrait', 'Sesi foto portrait profesional untuk individu dan keluarga', 'Camera'),
  ('10000000-0000-0000-0000-000000000002', 'Wedding', 'Dokumentasi pernikahan lengkap dari akad hingga resepsi', 'Heart'),
  ('10000000-0000-0000-0000-000000000003', 'Produk UMKM', 'Foto produk profesional untuk keperluan bisnis dan UMKM', 'ShoppingBag'),
  ('10000000-0000-0000-0000-000000000004', 'Event', 'Dokumentasi berbagai acara, seminar, dan gathering', 'Calendar');

-- Paket Layanan
INSERT INTO paket_layanan (id, kategori_id, nama_paket, deskripsi, harga, durasi_sesi, jumlah_foto, fasilitas, is_populer, is_aktif) VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Paket Wisuda', 'Abadikan momen wisuda dengan foto formal dan casual yang elegan', 500000, 90, 20, '["2 outfit changes", "Lokasi indoor & outdoor", "20 foto edit HD", "File digital"]', true, true),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Paket Keluarga', 'Sesi foto keluarga hangat penuh kenangan indah', 750000, 120, 30, '["Hingga 8 orang", "Lokasi studio indoor", "30 foto edit HD", "File digital", "1 foto cetak 10R"]', false, true),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Paket Maternity', 'Dokumentasi momen kehamilan yang cantik dan berkesan', 800000, 120, 25, '["Props disediakan", "3 outfit changes", "25 foto edit HD", "File digital"]', false, true),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', 'Paket Prewedding', 'Sesi foto prewedding romantis dengan berbagai konsep dan lokasi', 1500000, 240, 50, '["5 outfit changes", "Lokasi outdoor & indoor", "50 foto edit HD", "Album eksklusif", "File digital"]', true, true),
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', 'Paket Wedding', 'Dokumentasi pernikahan lengkap dari akad hingga resepsi', 3000000, 480, 100, '["Tim 2 fotografer", "Liputan full day", "100 foto edit HD", "2 album premium", "File digital", "Drone shot"]', true, true),
  ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000003', 'Paket Produk Basic', 'Foto produk profesional untuk katalog dan marketplace', 350000, 60, 15, '["Background pilihan", "15 foto edit HD", "File digital", "Cocok untuk UMKM"]', false, true),
  ('20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000003', 'Paket Produk Premium', 'Foto produk lengkap dengan lifestyle shoot', 600000, 120, 30, '["Background premium", "Lifestyle props", "30 foto edit HD", "File digital", "Konsultasi styling"]', true, true),
  ('20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000004', 'Paket Event', 'Dokumentasi acara seminar, gathering, dan corporate event', 1200000, 300, 60, '["Tim fotografer", "Coverage 5 jam", "60 foto edit HD", "File digital"]', false, true);

-- Jadwal Tersedia (2 minggu ke depan)
INSERT INTO jadwal_tersedia (tanggal, jam_mulai, jam_selesai, is_tersedia) VALUES
  ('2026-04-25', '09:00', '11:00', true),
  ('2026-04-25', '13:00', '15:00', true),
  ('2026-04-26', '09:00', '11:00', true),
  ('2026-04-26', '13:00', '15:00', true),
  ('2026-04-27', '09:00', '11:00', true),
  ('2026-04-28', '10:00', '12:00', true),
  ('2026-04-29', '09:00', '11:00', true),
  ('2026-04-30', '09:00', '11:00', true),
  ('2026-05-01', '09:00', '11:00', false),
  ('2026-05-02', '09:00', '11:00', true),
  ('2026-05-02', '14:00', '16:00', true),
  ('2026-05-03', '09:00', '11:00', true);

-- Produk
INSERT INTO produk (id, nama_produk, deskripsi, harga, stok, kategori, ukuran, is_aktif) VALUES
  ('30000000-0000-0000-0000-000000000001', 'Album Premium Hardcover', 'Album foto hardcover berkualitas tinggi dengan cetak glossy tahan lama', 350000, 50, 'album', NULL, true),
  ('30000000-0000-0000-0000-000000000002', 'Album Softcover Wedding', 'Album foto wedding softcover elegan dengan 40 halaman', 250000, 35, 'album', NULL, true),
  ('30000000-0000-0000-0000-000000000003', 'Photobook A4', 'Photobook modern ukuran A4 dengan layout profesional', 300000, 40, 'photobook', 'A4', true),
  ('30000000-0000-0000-0000-000000000004', 'Frame Kayu Rustic 4R', 'Bingkai kayu rustic elegan untuk foto ukuran 4R', 85000, 100, 'frame', '4R', true),
  ('30000000-0000-0000-0000-000000000005', 'Frame Akrilik Premium', 'Bingkai akrilik modern dan minimalis ukuran 10R', 120000, 60, 'frame', '10R', true),
  ('30000000-0000-0000-0000-000000000006', 'Cetak Foto Glossy 4R', 'Cetak foto glossy ukuran 4R dengan kertas premium', 5000, 500, 'cetak_foto', '4R', true),
  ('30000000-0000-0000-0000-000000000007', 'Cetak Foto Kanvas 20x30', 'Cetak foto di atas kanvas berkualitas tinggi', 150000, 30, 'cetak_foto', '20x30cm', true),
  ('30000000-0000-0000-0000-000000000008', 'Kalender Foto Custom', 'Kalender dinding custom dengan 12 foto pilihan', 175000, 25, 'merchandise', NULL, true),
  ('30000000-0000-0000-0000-000000000009', 'Photo Box Set Wisuda', 'Set foto wisuda dengan box eksklusif dan 10 foto 4R', 200000, 40, 'merchandise', NULL, true);

-- Portfolio
INSERT INTO portfolio (judul, deskripsi, kategori, tags, is_featured) VALUES
  ('Prewedding Romantis di Taman', 'Sesi foto prewedding Rina & Bayu di taman bunga Pringsewu', 'Wedding', '["prewedding", "outdoor", "romantic"]', true),
  ('Wisuda Universitas Lampung 2025', 'Dokumentasi wisuda mahasiswa Unila batch 2025', 'Portrait', '["wisuda", "formal", "universitas"]', true),
  ('Produk UMKM Batik Pringsewu', 'Foto produk batik lokal untuk katalog online marketplace', 'Produk UMKM', '["produk", "batik", "umkm"]', true),
  ('Wedding Adat Lampung', 'Dokumentasi pernikahan adat Lampung penuh warna dan budaya', 'Wedding', '["wedding", "adat", "lampung"]', true),
  ('Family Portrait Studio', 'Sesi foto keluarga besar dengan tema natural dan hangat', 'Portrait', '["keluarga", "studio", "natural"]', false),
  ('Event Seminar Bisnis', 'Dokumentasi seminar bisnis UMKM Pringsewu 2025', 'Event', '["event", "seminar", "bisnis"]', false),
  ('Maternity Shoot Elegan', 'Foto maternity dengan konsep bunga dan cahaya alami', 'Portrait', '["maternity", "elegant", "flowers"]', true),
  ('Produk Makanan UMKM', 'Foto produk makanan khas Lampung untuk keperluan promosi', 'Produk UMKM', '["produk", "makanan", "kuliner"]', false);

-- Booking (beberapa contoh)
INSERT INTO booking (kode_booking, pelanggan_id, paket_id, nama_pemesan, email, telepon, tanggal_sesi, jam_sesi, catatan_pelanggan, konsep_foto, status, total_harga, status_pembayaran) VALUES
  ('IDC-20260502-0001', '00000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'Sari Dewi', 'sari@example.com', '081234567890', '2026-05-02', '09:00', 'Mohon siapkan background biru dan toga', 'Formal wisuda + casual outdoor', 'dikonfirmasi', 500000, 'dp'),
  ('IDC-20260503-0001', '00000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000004', 'Rizky & Nadia', 'rizky@example.com', '082345678901', '2026-05-03', '09:00', 'Lokasi outdoor taman bunga Pringsewu', 'Natural romantic garden', 'dikonfirmasi', 1500000, 'dp'),
  ('IDC-20260420-0001', '00000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000006', 'Budi Santoso', 'budi@example.com', '083456789012', '2026-04-26', '13:00', 'Produk keripik singkong 5 varian', 'Clean white background', 'selesai', 350000, 'lunas');

-- Testimoni (approved)
INSERT INTO testimoni (pelanggan_id, booking_id, rating, komentar, nama_tampil, is_approved) VALUES
  ('00000000-0000-0000-0000-000000000002', NULL, 5, 'Fotografer sangat profesional! Hasil foto wisuda saya luar biasa indah, semua momen terabadikan sempurna. Sangat puas!', 'Sari Dewi', true),
  ('00000000-0000-0000-0000-000000000003', NULL, 5, 'Foto prewedding kami keren banget! Konsepnya matang, fotografernya friendly dan hasilnya natural. Sangat rekomendasikan!', 'Rizky & Nadia', true),
  ('00000000-0000-0000-0000-000000000004', NULL, 5, 'Foto produk UMKM saya sekarang jauh lebih profesional. Omset naik sejak pakai foto dari AideaCreative. Terima kasih!', 'Budi Santoso', true),
  (NULL, NULL, 5, 'Wedding dokumentasi kami jadi sangat berkesan. Tim fotografernya sabar dan kreatif, hasilnya jauh melampaui ekspektasi!', 'Rina & Bayu', true),
  (NULL, NULL, 4, 'Sesi foto keluarga kami natural dan hangat. Anak-anak nyaman selama sesi foto. Hasilnya memuaskan!', 'Keluarga Prasetyo', true),
  (NULL, NULL, 5, 'Maternity shoot saya cantik banget! Fotografer sangat sabar dan hasilnya elegan sekali.', 'Anisa Putri', true);
