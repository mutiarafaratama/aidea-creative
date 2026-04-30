import { Link } from "wouter";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Camera,
  Heart,
  ShoppingBag,
  CalendarDays,
  Sparkles,
  Star,
  Tag,
} from "lucide-react";
import {
  useListPaket,
  getListPaketQueryKey,
  useListTestimoni,
  getListTestimoniQueryKey,
  useListPromo,
  getListPromoQueryKey,
  useListPortfolio,
  getListPortfolioQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useSiteSettings } from "@/lib/settings";

const galleryImages = [
  { src: "/images/portfolio-wedding.png", label: "Wedding", h: "h-[420px]" },
  { src: "/images/portfolio-family.png", label: "Family", h: "h-[260px]" },
  { src: "/images/portfolio-product.png", label: "Produk UMKM", h: "h-[340px]" },
  { src: "/images/portfolio-graduation.png", label: "Graduation", h: "h-[300px]" },
  { src: "/images/product-album.png", label: "Album", h: "h-[380px]" },
  { src: "/images/product-frame.png", label: "Frame", h: "h-[240px]" },
  { src: "/images/portfolio-wedding.png", label: "Prewedding", h: "h-[320px]" },
  { src: "/images/portfolio-family.png", label: "Maternity", h: "h-[280px]" },
];

const categories = [
  { href: "/portfolio", label: "Portfolio", icon: Camera, color: "bg-rose-100 text-rose-600" },
  { href: "/paket", label: "Paket Foto", icon: Sparkles, color: "bg-amber-100 text-amber-600" },
  { href: "/layanan", label: "Layanan", icon: Heart, color: "bg-pink-100 text-pink-600" },
  { href: "/toko", label: "Toko Cetak", icon: ShoppingBag, color: "bg-emerald-100 text-emerald-600" },
  { href: "/booking", label: "Booking", icon: CalendarDays, color: "bg-blue-100 text-blue-600" },
  { href: "/testimoni", label: "Testimoni", icon: Star, color: "bg-violet-100 text-violet-600" },
];

const heroColumns = [
  [
    { src: "/images/portfolio-wedding.png", h: "h-64" },
    { src: "/images/portfolio-family.png", h: "h-48" },
    { src: "/images/portfolio-product.png", h: "h-56" },
    { src: "/images/portfolio-graduation.png", h: "h-44" },
    { src: "/images/product-album.png", h: "h-60" },
  ],
  [
    { src: "/images/portfolio-graduation.png", h: "h-52" },
    { src: "/images/product-frame.png", h: "h-64" },
    { src: "/images/portfolio-wedding.png", h: "h-44" },
    { src: "/images/portfolio-family.png", h: "h-56" },
    { src: "/images/portfolio-product.png", h: "h-48" },
  ],
  [
    { src: "/images/portfolio-product.png", h: "h-56" },
    { src: "/images/portfolio-wedding.png", h: "h-48" },
    { src: "/images/product-album.png", h: "h-64" },
    { src: "/images/portfolio-graduation.png", h: "h-52" },
    { src: "/images/portfolio-family.png", h: "h-44" },
  ],
];

export default function Home() {
  const { data: settings } = useSiteSettings();
  const { data: paketList, isLoading: loadingPaket } = useListPaket();
  const { data: testimoniList } = useListTestimoni();
  const { data: promoList } = useListPromo();
  const { data: portfolioList } = useListPortfolio();

  // Build hero collage from real Portfolio entries (featured first), falling
  // back to the static gallery if the admin hasn't uploaded enough photos yet.
  const portfolioImages = (() => {
    const items = Array.isArray(portfolioList) ? portfolioList : [];
    const sorted = [...items].sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
    const urls: string[] = [];
    for (const p of sorted) {
      const arr = Array.isArray(p.gambarUrl) ? p.gambarUrl : [];
      for (const u of arr) if (u) urls.push(u);
    }
    return urls;
  })();
  const heroPhotoColumns = (() => {
    if (portfolioImages.length === 0) return heroColumns;
    const heights = ["h-64", "h-48", "h-56", "h-44", "h-60", "h-52"];
    const cols: { src: string; h: string }[][] = [[], [], []];
    portfolioImages.forEach((src, i) => {
      cols[i % 3].push({ src, h: heights[i % heights.length] });
    });
    // Pad short columns by recycling
    cols.forEach((c, idx) => {
      let i = 0;
      while (c.length < 5 && portfolioImages.length > 0) {
        c.push({ src: portfolioImages[(idx + i) % portfolioImages.length], h: heights[(c.length) % heights.length] });
        i++;
      }
    });
    return cols;
  })();

  const popularPackages = Array.isArray(paketList) ? paketList.filter((p) => p.isPopuler).slice(0, 4) : [];
  const recentTestimonials = Array.isArray(testimoniList) ? testimoniList.slice(0, 8) : [];
  const now = Date.now();
  const promoBanners = (Array.isArray(promoList) ? promoList : []).filter((p) => {
    if (!p.isAktif || !p.tampilCard) return false;
    if (p.tanggalMulai && new Date(p.tanggalMulai).getTime() > now) return false;
    if (p.tanggalBerakhir && new Date(p.tanggalBerakhir).getTime() < now) return false;
    return true;
  });

  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: heroProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(heroProgress, [0, 1], [0, 120]);
  const heroFade = useTransform(heroProgress, [0, 0.7], [1, 0]);

  const promoRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: promoProgress } = useScroll({ target: promoRef, offset: ["start end", "end start"] });
  const promoX = useTransform(promoProgress, [0, 1], ["10%", "-30%"]);

  return (
    <div className="w-full overflow-hidden">
      {/* HERO */}
      <section ref={heroRef} className="relative -mt-24 min-h-[100vh] flex items-center bg-white overflow-hidden">
        <motion.div style={{ y: heroY, opacity: heroFade }} className="container relative z-10 mx-auto px-5 md:px-8 pt-28 pb-16 grid md:grid-cols-12 gap-10 items-center">
          <div className="md:col-span-5 lg:col-span-5">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1.5 text-xs font-medium text-primary mb-6"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              {settings?.heroBadge || "Studio Foto · Pringsewu, Lampung"}
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[0.95] mb-6"
            >
              Foto<br />
              <span className="text-primary italic font-serif">yang bicara.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-lg text-muted-foreground mb-8 max-w-md"
            >
              {settings?.heroSubtitle || "Wedding · Portrait · Produk · Event."}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-wrap gap-3"
            >
              <Link href="/booking">
                <Button size="lg" className="rounded-full h-12 px-7 text-sm font-semibold shadow-lg shadow-primary/20">
                  <Sparkles className="mr-2 h-4 w-4" /> Booking Sekarang
                </Button>
              </Link>
              <Link href="/portfolio">
                <Button size="lg" variant="outline" className="rounded-full h-12 px-7 text-sm font-medium">
                  Eksplor Karya <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </motion.div>
          </div>

          {/* Pinterest-style auto-scrolling photo columns */}
          <div className="md:col-span-7 lg:col-span-7 relative h-[600px] md:h-[680px] hidden md:grid grid-cols-3 gap-3 [mask-image:linear-gradient(to_bottom,transparent_0%,black_12%,black_88%,transparent_100%)]">
            {heroPhotoColumns.map((col, idx) => (
              <div key={idx} className="overflow-hidden">
                <motion.div
                  initial={{ y: idx % 2 === 0 ? "0%" : "-50%" }}
                  animate={{ y: idx % 2 === 0 ? "-50%" : "0%" }}
                  transition={{ duration: 30 + idx * 6, repeat: Infinity, ease: "linear" }}
                  className="flex flex-col gap-3 will-change-transform"
                >
                  {[...col, ...col].map((img, i) => (
                    <div
                      key={`${idx}-${i}`}
                      className={`${img.h} rounded-2xl overflow-hidden bg-muted ring-1 ring-black/5 shadow-md`}
                    >
                      <img src={img.src} alt="" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  ))}
                </motion.div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* CATEGORY QUICK NAV */}
      <section className="py-10 border-y border-border bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.05 } },
            }}
            className="grid grid-cols-3 md:grid-cols-6 gap-4"
          >
            {categories.map((c) => (
              <motion.div
                key={c.href}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
              >
                <Link href={c.href}>
                  <div className="group flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-muted/60 transition-colors cursor-pointer">
                    <div className={`h-14 w-14 rounded-2xl ${c.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                      <c.icon className="h-6 w-6" />
                    </div>
                    <span className="text-xs font-medium">{c.label}</span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* PROMO BANNER (parallax horizontal) */}
      <section ref={promoRef} className="relative py-16 bg-white overflow-hidden">
        <div className="container mx-auto px-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex items-end justify-between gap-4"
          >
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-3 py-1 text-xs font-bold mb-3">
                <Tag className="h-3.5 w-3.5" /> PROMO BERJALAN
              </div>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Hemat sekarang.</h2>
            </div>
            <Link href="/paket" className="hidden md:inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
              Semua promo <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>

        {promoBanners.length > 0 ? (
          <motion.div style={{ x: promoX }} className="flex gap-5 px-4 will-change-transform">
            {promoBanners.concat(promoBanners).map((p, i) => (
              <Link key={`${p.id}-${i}`} href={p.link ?? "/paket"}>
                <motion.div
                  whileHover={{ y: -6 }}
                  className="shrink-0 w-[320px] md:w-[420px] rounded-3xl overflow-hidden bg-card border border-border shadow-lg cursor-pointer"
                >
                  <div className="relative h-48 md:h-56 bg-muted overflow-hidden">
                    {p.gambarUrl ? (
                      <img src={p.gambarUrl} alt={p.judul} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/30 to-amber-200 flex items-center justify-center">
                        <Sparkles className="h-12 w-12 text-white" />
                      </div>
                    )}
                    {p.badge && (
                      <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground rounded-full">
                        {p.badge}
                      </Badge>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-lg mb-1 line-clamp-1">{p.judul}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{p.deskripsi}</p>
                  </div>
                </motion.div>
              </Link>
            ))}
          </motion.div>
        ) : (
          <div className="container mx-auto px-4">
            <Card className="rounded-3xl border-dashed border-2 border-primary/30 bg-primary/5">
              <CardContent className="p-10 text-center">
                <Sparkles className="h-10 w-10 mx-auto mb-3 text-primary" />
                <p className="text-lg font-semibold mb-1">Promo akan segera hadir!</p>
                <p className="text-sm text-muted-foreground">Pantau halaman ini untuk penawaran terbaru.</p>
              </CardContent>
            </Card>
          </div>
        )}
      </section>

      {/* PINTEREST MASONRY GALLERY */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex items-end justify-between mb-10"
          >
            <div>
              <h2 className="text-4xl md:text-6xl font-bold tracking-tight font-serif italic">Karya kami.</h2>
            </div>
            <Link href="/portfolio" className="text-sm font-semibold text-primary hover:underline inline-flex items-center gap-1.5">
              Lihat semua <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>

          <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
            {galleryImages.map((img, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, delay: (i % 4) * 0.08 }}
                className={`break-inside-avoid relative group overflow-hidden rounded-2xl ${img.h} bg-muted cursor-pointer`}
              >
                <img
                  src={img.src}
                  alt={img.label}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <span className="inline-flex items-center gap-1.5 text-white font-semibold text-sm">
                    {img.label} <ArrowUpRight className="h-4 w-4" />
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PAKET POPULER */}
      <section className="py-20 bg-foreground text-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex items-end justify-between mb-12"
          >
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight">Paket favorit.</h2>
            <Link href="/paket" className="text-sm font-semibold text-amber-300 hover:underline inline-flex items-center gap-1.5">
              Semua paket <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
          >
            {loadingPaket
              ? Array(4)
                  .fill(0)
                  .map((_, i) => (
                    <Card key={i} className="overflow-hidden bg-white/5 border-white/10">
                      <Skeleton className="h-56 w-full rounded-none" />
                      <CardContent className="p-5">
                        <Skeleton className="h-5 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2" />
                      </CardContent>
                    </Card>
                  ))
              : popularPackages.map((paket) => (
                  <motion.div
                    key={paket.id}
                    variants={{
                      hidden: { opacity: 0, y: 40 },
                      visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
                    }}
                    whileHover={{ y: -8 }}
                  >
                    <Link href={`/booking?paket=${paket.id}`}>
                      <Card className="overflow-hidden bg-white/5 border-white/10 hover:border-amber-300/40 transition-colors cursor-pointer h-full group">
                        <div className="aspect-[4/5] bg-gradient-to-br from-primary/30 to-amber-200/20 relative overflow-hidden flex items-center justify-center">
                          <Camera className="h-14 w-14 text-white/30 group-hover:scale-110 transition-transform duration-500" />
                          <Badge className="absolute top-3 left-3 bg-amber-400 text-foreground rounded-full font-bold">
                            ★ Populer
                          </Badge>
                          <div className="absolute bottom-3 right-3 bg-white/95 text-foreground rounded-full px-3 py-1 text-xs font-bold">
                            {paket.durasiSesi}m · {paket.jumlahFoto}📸
                          </div>
                        </div>
                        <CardContent className="p-5">
                          <h3 className="font-bold text-lg mb-1 line-clamp-1">{paket.namaPaket}</h3>
                          <p className="text-amber-300 font-bold text-lg">
                            Rp {paket.harga.toLocaleString("id-ID")}
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
          </motion.div>
        </div>
      </section>

      {/* AI ASSISTANT QUICK CTA */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-[2.5rem] bg-gradient-to-br from-primary via-primary to-blue-700 text-primary-foreground p-10 md:p-16 relative overflow-hidden"
          >
            <div className="absolute -top-20 -right-20 w-80 h-80 bg-amber-300/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
            <div className="relative z-10 max-w-2xl">
              <Sparkles className="h-10 w-10 mb-5 text-amber-300" />
              <h2 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
                Bingung pilih paket?<br />
                <span className="text-amber-300 italic font-serif">Tanya AI kami.</span>
              </h2>
              <p className="text-primary-foreground/80 mb-8 text-lg">
                Rekomendasi instan sesuai budget & tema.
              </p>
              <Link href="/paket">
                <Button size="lg" className="rounded-full bg-white text-primary hover:bg-white/90 h-12 px-7 font-semibold">
                  Coba Sekarang <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* TESTIMONI MARQUEE */}
      <section className="py-20 bg-white overflow-hidden border-t border-border">
        <div className="container mx-auto px-4 mb-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-6xl font-bold font-serif italic">Cerita mereka.</h2>
          </motion.div>
        </div>

        {recentTestimonials.length > 0 ? (
          <div className="relative">
            <div className="flex gap-5 animate-marquee">
              {[...recentTestimonials, ...recentTestimonials].map((t, i) => (
                <Card key={`${t.id}-${i}`} className="shrink-0 w-[340px] border-border bg-background">
                  <CardContent className="p-6">
                    <div className="flex gap-0.5 text-amber-400 mb-3">
                      {Array(5)
                        .fill(0)
                        .map((_, j) => (
                          <Star key={j} size={14} fill={j < t.rating ? "currentColor" : "none"} />
                        ))}
                    </div>
                    <p className="text-sm leading-relaxed line-clamp-4 mb-5">"{t.komentar}"</p>
                    <div className="flex items-center gap-3">
                      {t.fotoUrl ? (
                        <img src={t.fotoUrl} alt={t.namaTampil} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary uppercase text-sm">
                          {t.namaTampil.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-sm">{t.namaTampil}</div>
                        <div className="text-xs text-muted-foreground">Pelanggan</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="container mx-auto px-4 text-center text-muted-foreground py-10">
            Belum ada testimoni.
          </div>
        )}

        <div className="container mx-auto px-4 mt-10 text-center">
          <Link href="/testimoni">
            <Button variant="outline" className="rounded-full">
              Lihat semua testimoni <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <h2 className="text-4xl sm:text-5xl md:text-7xl font-bold font-serif italic mb-6 leading-tight">
              Siap diabadikan?
            </h2>
            <Link href="/booking">
              <Button size="lg" className="rounded-full h-14 px-10 text-base font-semibold shadow-xl shadow-primary/30">
                Booking Sekarang <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
