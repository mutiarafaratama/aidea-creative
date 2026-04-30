export type LayananIcon = "Aperture" | "Camera" | "Heart" | "PartyPopper";

export type Layanan = {
  slug: string;
  nama: string;
  tagline: string;
  deskripsi: string;
  iconName: LayananIcon;
  warna: string;
  highlight: string[];
  filter: string;
  hero: string;
  longDescription: string;
  detail: { judul: string; isi: string }[];
};

export const layananList: Layanan[] = [
  {
    slug: "photobox",
    nama: "Photobox Self Photo",
    tagline: "Foto Sepuasnya, Bebas Bergaya",
    deskripsi:
      "Foto sendiri tanpa fotografer dengan 3 spot photobox unik. Cocok buat hangout bareng teman, keluarga, atau pasangan. Hasil cetak instan & soft copy.",
    iconName: "Aperture",
    warna: "from-rose-500/20 to-orange-500/10",
    highlight: ["3 Spot Photobox", "Foto Sepuasnya", "Aksesoris Lengkap", "Cetak Instan"],
    filter: "Photobox",
    hero: "/images/portfolio-family.png",
    longDescription:
      "Photobox AideaCreative menghadirkan pengalaman self-photo yang seru dan bebas tanpa fotografer. Pilih spot favoritmu, gunakan aksesoris dan kostum yang tersedia, lalu foto sepuasnya selama durasi paket. Hasil bisa langsung dicetak di tempat dan dikirim ke HP dalam bentuk soft copy.",
    detail: [
      {
        judul: "3 Spot Photobox",
        isi: "Photobox Retro (vibes vintage 90an), Photobox Cinema (sinematik moody), dan Photobox Blue (clean & instagrammable).",
      },
      {
        judul: "Aksesoris Gratis",
        isi: "Kacamata lucu, bando, mahkota, props papan, balon, dan banyak lagi tersedia gratis selama sesi.",
      },
      {
        judul: "Kostum Tematik",
        isi: "Tersedia kostum tema retro, formal, dan casual dengan biaya tambahan sesuai pilihan paket di dashboard.",
      },
      {
        judul: "Hasil Instan",
        isi: "Cetak foto langsung di lokasi + soft copy dikirim ke HP/email setelah sesi selesai.",
      },
    ],
  },
  {
    slug: "studio",
    nama: "Studio Photographer",
    tagline: "Sesi Foto Bersama Fotografer Profesional",
    deskripsi:
      "Sesi foto in-studio diarahkan langsung oleh fotografer berpengalaman untuk family portrait, wisuda, ulang tahun, hingga maternity.",
    iconName: "Camera",
    warna: "from-blue-500/20 to-cyan-500/10",
    highlight: ["Fotografer Pro", "Lighting Premium", "Arahan Pose", "Soft + Hard Copy"],
    filter: "Studio",
    hero: "/images/portfolio-family.png",
    longDescription:
      "Sesi foto di studio kami diarahkan langsung oleh fotografer profesional dengan peralatan lighting premium. Cocok untuk berbagai kebutuhan personal & keluarga dengan hasil yang tajam dan editing yang rapi.",
    detail: [
      {
        judul: "Family Portrait",
        isi: "Foto keluarga lengkap dengan koreografi & arahan pose dari fotografer berpengalaman.",
      },
      {
        judul: "Wisuda",
        isi: "Foto wisuda solo, bersama keluarga, atau geng wisuda dengan latar pilihan.",
      },
      {
        judul: "Maternity & Newborn",
        isi: "Sesi lembut dan personal untuk momen kehamilan dan bayi baru lahir.",
      },
      {
        judul: "Sesi Personal",
        isi: "Foto ulang tahun, anniversary, atau kebutuhan personal lainnya.",
      },
    ],
  },
  {
    slug: "formal",
    nama: "Foto Formal & Pernikahan",
    tagline: "Untuk Momen Resmi & Sakral Anda",
    deskripsi:
      "Foto pas formal, pre-wedding studio, foto pernikahan, lamaran, dan dokumentasi resmi lainnya dengan standar kualitas tinggi.",
    iconName: "Heart",
    warna: "from-amber-500/20 to-yellow-500/10",
    highlight: ["Foto Pernikahan", "Pre-wedding", "Pas Foto Resmi", "Edit Premium"],
    filter: "Formal",
    hero: "/images/portfolio-wedding.png",
    longDescription:
      "Untuk momen-momen sakral dan resmi yang butuh standar kualitas tinggi. Setiap foto kami racik dengan pencahayaan profesional dan post-processing premium agar hasil terlihat elegan dan timeless.",
    detail: [
      { judul: "Foto Pernikahan", isi: "Sesi foto pernikahan in-studio maupun dokumentasi acara akad & resepsi." },
      { judul: "Pre-wedding", isi: "Pre-wedding studio dengan tema klasik, modern, atau custom sesuai konsep." },
      { judul: "Foto Lamaran & Akad", isi: "Dokumentasi momen lamaran dan akad dengan pendekatan candid & formal." },
      { judul: "Pas Foto Resmi", isi: "Pas foto background biru / merah / putih untuk dokumen, ijazah, atau SIM." },
    ],
  },
  {
    slug: "event",
    nama: "Event & Job Photography",
    tagline: "Dokumentasi Acara Anda Tanpa Batas",
    deskripsi:
      "Liputan acara, prewedding outdoor, gathering, ulang tahun, wisuda, hingga kebutuhan komersial. Tim siap datang ke lokasi Anda.",
    iconName: "PartyPopper",
    warna: "from-purple-500/20 to-pink-500/10",
    highlight: ["Outdoor / On-site", "Tim Multi-Kamera", "Liputan Penuh", "Highlight Reel"],
    filter: "Event",
    hero: "/images/portfolio-graduation.png",
    longDescription:
      "Tim kami siap berangkat ke lokasi acara Anda — dari ulang tahun, gathering kantor, prewedding outdoor, hingga liputan event komersial. Kami siapkan tim multi-kamera untuk memastikan tidak ada momen penting yang terlewat.",
    detail: [
      { judul: "Liputan Penuh", isi: "Coverage acara full day atau half day sesuai kebutuhan." },
      { judul: "Tim Multi-Kamera", isi: "Tim fotografer dengan multi-angle untuk hasil yang lebih variatif." },
      { judul: "Prewedding Outdoor", isi: "Sesi prewedding di lokasi favorit Anda — pantai, gunung, kafe, dll." },
      { judul: "Highlight Reel", isi: "Pilihan foto terbaik dengan editing premium siap untuk media sosial." },
    ],
  },
];

export function getLayananBySlug(slug: string) {
  return layananList.find((l) => l.slug === slug);
}
