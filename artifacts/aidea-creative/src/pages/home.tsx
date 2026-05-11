import { Link } from "wouter";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useRef, useEffect, useState, useCallback } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Camera,
  Sparkles,
  Star,
  Tag,
  ChevronLeft,
  ChevronRight,
  Clock,
  Image,
  TrendingUp,
  X,
  ZoomIn,
} from "lucide-react";
import {
  useListTestimoni,
  useListPromo,
  useListPortfolio,
} from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useSiteSettings } from "@/lib/settings";
import { AppImage } from "@/components/app-image";
import { resolveUploadUrl } from "@/lib/upload-url";
import { PromoModal } from "@/components/promo-modal";
import { PricelistSection } from "@/components/pricelist-section";

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

const FALLBACK_GALLERY = [
  { src: "/images/portfolio-wedding.png", label: "Wedding", h: "h-[420px]" },
  { src: "/images/portfolio-family.png", label: "Family", h: "h-[260px]" },
  { src: "/images/portfolio-product.png", label: "Produk UMKM", h: "h-[340px]" },
  { src: "/images/portfolio-graduation.png", label: "Graduation", h: "h-[300px]" },
  { src: "/images/product-album.png", label: "Album", h: "h-[380px]" },
  { src: "/images/product-frame.png", label: "Frame", h: "h-[240px]" },
  { src: "/images/portfolio-wedding.png", label: "Prewedding", h: "h-[320px]" },
  { src: "/images/portfolio-family.png", label: "Maternity", h: "h-[280px]" },
];

const MASONRY_HEIGHTS = ["h-[280px]", "h-[340px]", "h-[260px]", "h-[400px]", "h-[300px]", "h-[360px]", "h-[240px]", "h-[320px]"];

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const slideVariants = {
  enter: (d: number) => ({ x: d > 0 ? "100%" : "-100%", opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (d: number) => ({ x: d > 0 ? "-100%" : "100%", opacity: 0 }),
};

function PaketCarousel({ packages, loading }: { packages: any[]; loading: boolean }) {
  const [activeTab, setActiveTab] = useState<"paket" | "pricelist">("paket");
  const [activeIdx, setActiveIdx] = useState(0);
  const [dir, setDir] = useState(1);
  const touchStartX = useRef<number | null>(null);
  const n = packages.length;

  const goTo = useCallback((idx: number, d: number) => {
    setDir(d);
    setActiveIdx((idx + Math.max(n, 1)) % Math.max(n, 1));
  }, [n]);

  const next = useCallback(() => goTo(activeIdx + 1, 1), [activeIdx, goTo]);
  const prev = useCallback(() => goTo(activeIdx - 1, -1), [activeIdx, goTo]);

  useEffect(() => {
    if (n <= 1) return;
    const t = setInterval(next, 4500);
    return () => clearInterval(t);
  }, [n, next]);

  if (loading) {
    return (
      <section className="py-20 bg-gradient-to-b from-blue-50/60 via-white to-white">
        <div className="container mx-auto px-4">
          <div className="h-8 w-48 bg-muted animate-pulse rounded-full mb-4" />
          <div className="h-12 w-72 bg-muted animate-pulse rounded-xl mb-10" />
          <div className="rounded-3xl bg-muted animate-pulse h-[420px]" />
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-gradient-to-b from-blue-50/60 via-white to-white overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex items-end justify-between mb-10"
        >
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3 py-1.5 mb-3">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              <span className="text-primary text-[11px] font-bold uppercase tracking-widest">
                {activeTab === "pricelist" ? "Harga Transparan" : "Rekomendasi untuk Kamu"}
              </span>
            </div>
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground">
              {activeTab === "pricelist" ? "Pricelist." : "Paket pilihan."}
            </h2>
          </div>
          {activeTab === "paket" && (
            <Link href="/paket" className="hidden sm:inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/70 transition-colors">
              Semua paket <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </motion.div>

        {/* Choice chips — Paket & Pricelist */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setActiveTab("paket")}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${
              activeTab === "paket"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "border border-border bg-white text-foreground hover:border-primary hover:text-primary"
            }`}
          >
            Paket Foto
          </button>
          <button
            onClick={() => setActiveTab("pricelist")}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${
              activeTab === "pricelist"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "border border-border bg-white text-foreground hover:border-primary hover:text-primary"
            }`}
          >
            Pricelist
          </button>
        </div>

        {/* ── Pricelist view ── */}
        {activeTab === "pricelist" ? (
          <PricelistSection />
        ) : n === 0 ? (
          <div className="text-center text-muted-foreground py-16">
            <Camera className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <p>Belum ada paket tersedia.</p>
          </div>
        ) : (
          <>
            {/* ── Mobile: animated slide carousel ── */}
            <div className="block md:hidden">
              <div
                className="relative overflow-hidden rounded-3xl shadow-lg"
                style={{ minHeight: 430 }}
                onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
                onTouchEnd={(e) => {
                  if (touchStartX.current === null) return;
                  const dx = e.changedTouches[0].clientX - touchStartX.current;
                  touchStartX.current = null;
                  if (dx < -40) next();
                  else if (dx > 40) prev();
                }}
              >
                <AnimatePresence custom={dir} mode="popLayout" initial={false}>
                  <motion.div
                    key={activeIdx}
                    custom={dir}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ type: "spring", stiffness: 320, damping: 34, mass: 0.8 }}
                    className="w-full"
                  >
                    {(() => {
                      const paket = packages[activeIdx];
                      if (!paket) return null;
                      return (
                        <Link href={`/booking?paket=${paket.id}`}>
                          <div className="bg-white rounded-3xl overflow-hidden cursor-pointer">
                            <div className="relative h-60 overflow-hidden bg-gradient-to-br from-primary/10 to-blue-100">
                              {paket.fotoUrl ? (
                                <AppImage src={paket.fotoUrl} alt={paket.namaPaket} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Camera className="h-14 w-14 text-primary/20" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                              <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 bg-primary text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-md">
                                <Star className="h-3 w-3 fill-white" />
                                {paket.bookingCount > 0 ? `${paket.bookingCount}× dipesan` : "Rekomendasi"}
                              </div>
                              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                                <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md text-white text-xs font-semibold px-3 py-1 rounded-full border border-white/30">
                                  <Clock className="h-3 w-3" /> {paket.durasiSesi}m
                                </div>
                                <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md text-white text-xs font-semibold px-3 py-1 rounded-full border border-white/30">
                                  <Image className="h-3 w-3" /> {paket.jumlahFoto} foto
                                </div>
                              </div>
                            </div>
                            <div className="p-5 bg-white">
                              <h3 className="font-bold text-lg text-foreground mb-1">{paket.namaPaket}</h3>
                              {paket.deskripsi && (
                                <p className="text-muted-foreground text-sm line-clamp-2 mb-4">{paket.deskripsi}</p>
                              )}
                              <div className="flex items-center justify-between">
                                <p className="text-primary font-extrabold text-2xl">
                                  Rp {Number(paket.harga).toLocaleString("id-ID")}
                                </p>
                                <div className="inline-flex items-center gap-1.5 bg-primary text-white text-sm font-semibold px-4 py-2 rounded-full">
                                  Booking <ArrowRight className="h-3.5 w-3.5" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })()}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Dots + arrows */}
              {n > 1 && (
                <div className="flex items-center justify-center gap-3 mt-5">
                  <button
                    onClick={prev}
                    className="h-9 w-9 rounded-full border border-border bg-white flex items-center justify-center shadow-sm hover:border-primary hover:text-primary transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div className="flex items-center gap-1.5">
                    {packages.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => goTo(i, i > activeIdx ? 1 : -1)}
                        style={{
                          width: i === activeIdx ? 22 : 7, height: 7,
                          borderRadius: 999,
                          background: i === activeIdx ? "hsl(var(--primary))" : "hsl(var(--primary)/0.2)",
                          transition: "all 0.3s ease", border: "none", padding: 0, cursor: "pointer",
                        }}
                      />
                    ))}
                  </div>
                  <button
                    onClick={next}
                    className="h-9 w-9 rounded-full border border-border bg-white flex items-center justify-center shadow-sm hover:border-primary hover:text-primary transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
              <div className="flex justify-center mt-5">
                <Link href="/paket" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
                  Lihat semua paket <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* ── Desktop: grid of 3 cards ── */}
            <div className="hidden md:block">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                {packages.slice(0, 3).map((paket, idx) => (
                  <motion.div
                    key={paket.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: idx * 0.1 }}
                  >
                    <Link href={`/booking?paket=${paket.id}`}>
                      <div className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-border/60 hover:shadow-xl hover:border-primary/30 transition-all duration-300 cursor-pointer h-full flex flex-col">
                        <div className="relative h-52 overflow-hidden bg-gradient-to-br from-primary/10 to-blue-100 shrink-0">
                          {paket.fotoUrl ? (
                            <AppImage
                              src={paket.fotoUrl}
                              alt={paket.namaPaket}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Camera className="h-10 w-10 text-primary/20" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                          <div className="absolute top-3 left-3 inline-flex items-center gap-1 bg-primary text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                            <Star className="h-2.5 w-2.5 fill-white" />
                            {paket.bookingCount > 0 ? `${paket.bookingCount}× dipesan` : "Rekomendasi"}
                          </div>
                          <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                            {paket.durasiSesi}m · {paket.jumlahFoto} foto
                          </div>
                        </div>
                        <div className="p-5 flex-1 flex flex-col">
                          <h3 className="font-bold text-base text-foreground mb-1 line-clamp-1 group-hover:text-primary transition-colors">
                            {paket.namaPaket}
                          </h3>
                          {paket.deskripsi && (
                            <p className="text-muted-foreground text-xs line-clamp-2 mb-3 flex-1">{paket.deskripsi}</p>
                          )}
                          <div className="flex items-center justify-between pt-3 border-t border-border/60 mt-auto">
                            <p className="text-primary font-extrabold text-lg">
                              Rp {Number(paket.harga).toLocaleString("id-ID")}
                            </p>
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground group-hover:text-primary transition-colors">
                              Booking <ArrowUpRight className="h-3 w-3" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
              {n > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  {packages.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => goTo(i, i > activeIdx ? 1 : -1)}
                      style={{
                        width: i === activeIdx ? 28 : 8, height: 8,
                        borderRadius: 999,
                        background: i === activeIdx ? "hsl(var(--primary))" : "hsl(var(--primary)/0.2)",
                        transition: "all 0.35s ease", border: "none", padding: 0, cursor: "pointer",
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default function Home() {
  const [selectedPromoId, setSelectedPromoId] = useState<string | null>(null);
  const { data: settings } = useSiteSettings();
  const { data: rekomendasiList, isLoading: loadingPaket } = useQuery<any[]>({
    queryKey: ["paket-rekomendasi"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/paket/rekomendasi?limit=4`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 60000,
  });
  const { data: testimoniList } = useListTestimoni({}, { refetchInterval: 60000, refetchOnMount: true, staleTime: 0 });
  const { data: promoList } = useListPromo();
  const { data: portfolioList } = useListPortfolio();

  const portfolioImages = (() => {
    const items = Array.isArray(portfolioList) ? portfolioList : [];
    const sorted = [...items].sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
    const urls: { src: string; label: string }[] = [];
    for (const p of sorted) {
      const arr = Array.isArray(p.gambarUrl) ? p.gambarUrl : [];
      for (const u of arr) {
        if (u) urls.push({ src: u, label: p.judul || p.kategori || "" });
      }
    }
    return urls;
  })();

  const heroPhotoColumns = (() => {
    if (portfolioImages.length === 0) return heroColumns;
    const heights = ["h-64", "h-48", "h-56", "h-44", "h-60", "h-52"];
    const cols: { src: string; h: string }[][] = [[], [], []];
    portfolioImages.forEach((img, i) => {
      cols[i % 3].push({ src: img.src, h: heights[i % heights.length] });
    });
    cols.forEach((c, idx) => {
      let i = 0;
      while (c.length < 5 && portfolioImages.length > 0) {
        c.push({ src: portfolioImages[(idx + i) % portfolioImages.length].src, h: heights[c.length % heights.length] });
        i++;
      }
    });
    return cols;
  })();

  const galleryItems = (() => {
    if (portfolioImages.length > 0) {
      return portfolioImages.slice(0, 12).map((img, i) => ({
        src: img.src,
        label: img.label,
        h: MASONRY_HEIGHTS[i % MASONRY_HEIGHTS.length],
      }));
    }
    return FALLBACK_GALLERY;
  })();

  const popularPackages = Array.isArray(rekomendasiList) ? rekomendasiList : [];

  const recentTestimonials = Array.isArray(testimoniList)
    ? testimoniList.slice(0, 10)
    : [];

  const now = Date.now();
  const promoBanners = (Array.isArray(promoList) ? promoList : []).filter((p) => {
    if (!p.isAktif) return false;
    if ((p as any).tampilCard === false) return false;
    if ((p as any).tanggalBerakhir && new Date((p as any).tanggalBerakhir).getTime() < now) return false;
    return true;
  });

  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: heroProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(heroProgress, [0, 1], [0, 120]);
  const heroFade = useTransform(heroProgress, [0, 0.7], [1, 0]);

  /* ─── Promo Carousel ─── */
  const [promoIdx, setPromoIdx] = useState(0);
  const promoHovered = useRef(false);
  const promoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const promoDragStartX = useRef<number | null>(null);
  const promoTrackRef = useRef<HTMLDivElement>(null);
  const promoCardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const n = promoBanners.length;

  const promoNext = useCallback(() => {
    setPromoIdx((prev) => (prev + 1) % Math.max(n, 1));
  }, [n]);

  const promoPrev = useCallback(() => {
    setPromoIdx((prev) => (prev - 1 + Math.max(n, 1)) % Math.max(n, 1));
  }, [n]);

  useEffect(() => {
    if (n <= 1) return;
    promoTimerRef.current = setInterval(() => {
      if (!promoHovered.current) promoNext();
    }, 4000);
    return () => { if (promoTimerRef.current) clearInterval(promoTimerRef.current); };
  }, [n, promoNext]);

  /* Scroll track to active card using real DOM positions */
  useEffect(() => {
    const track = promoTrackRef.current;
    const card = promoCardRefs.current[promoIdx];
    if (!track || !card) return;
    const trackPad = 48; // px-12 on md
    const targetLeft = card.offsetLeft - trackPad;
    track.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" });
  }, [promoIdx]);

  /* ─── Portfolio Lightbox ─── */
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const lbDragX = useRef<number | null>(null);

  const openLightbox = (idx: number) => setLightboxIdx(idx);
  const closeLightbox = () => setLightboxIdx(null);
  const lbPrev = useCallback(() => {
    setLightboxIdx((i) => (i === null ? null : (i - 1 + galleryItems.length) % galleryItems.length));
  }, [galleryItems.length]);
  const lbNext = useCallback(() => {
    setLightboxIdx((i) => (i === null ? null : (i + 1) % galleryItems.length));
  }, [galleryItems.length]);

  useEffect(() => {
    if (lightboxIdx === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowLeft") lbPrev();
      else if (e.key === "ArrowRight") lbNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxIdx, lbPrev, lbNext]);

  useEffect(() => {
    if (lightboxIdx !== null) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [lightboxIdx]);

  return (
    <div className="w-full overflow-hidden">
      {/* ── HERO ── */}
      <section ref={heroRef} className="relative -mt-24 min-h-[100vh] flex items-center bg-white overflow-hidden">
        <motion.div
          style={{ y: heroY, opacity: heroFade }}
          className="container relative z-10 mx-auto px-5 md:px-8 pt-28 pb-16 grid md:grid-cols-12 gap-10 items-center"
        >
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
              <Link href="/photobooth">
                <Button size="lg" variant="outline" className="rounded-full h-12 px-7 text-sm font-medium">
                  Coba Photobooth
                </Button>
              </Link>
            </motion.div>
          </div>

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

      {/* ── PROMO BANNER — Multi-card sliding carousel ── */}
      <section id="promo" className="relative py-16 bg-white overflow-hidden">
        <div className="container mx-auto px-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex items-end justify-between"
          >
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-3 py-1 text-xs font-bold mb-3">
                <Tag className="h-3.5 w-3.5" /> PROMO BERJALAN
              </div>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Hemat sekarang.</h2>
            </div>
            {n > 1 && (
              <div className="hidden sm:flex items-center gap-2">
                <button
                  onClick={promoPrev}
                  className="h-9 w-9 rounded-full border border-border bg-background flex items-center justify-center hover:bg-muted shadow-sm transition-colors"
                  aria-label="Sebelumnya"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={promoNext}
                  className="h-9 w-9 rounded-full border border-border bg-background flex items-center justify-center hover:bg-muted shadow-sm transition-colors"
                  aria-label="Berikutnya"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </motion.div>
        </div>

        {promoBanners.length > 0 ? (
          <>
            <div
              className="relative"
              onMouseEnter={() => { promoHovered.current = true; }}
              onMouseLeave={() => { promoHovered.current = false; }}
              onTouchStart={(e) => { promoDragStartX.current = e.touches[0].clientX; }}
              onTouchEnd={(e) => {
                if (promoDragStartX.current === null) return;
                const dx = e.changedTouches[0].clientX - promoDragStartX.current;
                if (dx < -40) promoNext();
                else if (dx > 40) promoPrev();
                promoDragStartX.current = null;
              }}
            >
              {/* Track — scroll-based, no translateX so never "breaks" */}
              <div
                ref={promoTrackRef}
                className="overflow-x-auto scrollbar-hide px-4 sm:px-8 md:px-12"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                <div className="flex gap-4 pb-1">
                  {promoBanners.map((p, i) => {
                    const isActive = i === promoIdx;
                    return (
                      <div
                        key={p.id}
                        ref={(el) => { promoCardRefs.current[i] = el; }}
                        onClick={() => { setPromoIdx(i); setSelectedPromoId(p.id); }}
                        className="flex-shrink-0 transition-all duration-500 cursor-pointer"
                        style={{
                          width: "clamp(240px, 72vw, 320px)",
                          transform: isActive ? "scale(1.02)" : "scale(1)",
                        }}
                      >
                        <div className={`rounded-2xl overflow-hidden bg-card border transition-shadow duration-300 ${isActive ? "border-primary/30 shadow-[0_8px_40px_rgba(0,0,0,0.14)]" : "border-border shadow-sm"}`}>
                          <div className="relative overflow-hidden bg-muted" style={{ aspectRatio: "4/3" }}>
                            {p.gambarUrl ? (
                              <motion.img
                                src={resolveUploadUrl(p.gambarUrl) ?? p.gambarUrl}
                                alt={p.judul}
                                className="w-full h-full object-cover"
                                animate={{ scale: isActive ? 1.04 : 1 }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-primary/30 to-amber-200 flex items-center justify-center">
                                <Sparkles className="h-10 w-10 text-white" />
                              </div>
                            )}
                            {(p as any).badge && (
                              <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground rounded-full shadow text-[10px] px-2 py-0.5">
                                {(p as any).badge}
                              </Badge>
                            )}
                            {isActive && (
                              <div className="absolute inset-0 ring-2 ring-primary/20 rounded-2xl pointer-events-none" />
                            )}
                          </div>
                          <div className="p-4">
                            <h3 className="font-bold text-base mb-1 line-clamp-1">{p.judul}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">{p.deskripsi}</p>
                            {(p as any).tanggalBerakhir && (
                              <p className="text-[11px] text-muted-foreground/50 mt-2">
                                s/d {new Date((p as any).tanggalBerakhir).toLocaleDateString("id-ID", {
                                  day: "numeric", month: "short", year: "numeric",
                                })}
                              </p>
                            )}
                            <span className="inline-flex items-center gap-1 mt-3 text-xs font-semibold text-primary">
                              Lihat detail <ArrowUpRight className="h-3 w-3" />
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {/* trailing spacer so last card scrolls fully into view */}
                  <div className="flex-shrink-0 w-4 sm:w-8 md:w-12" />
                </div>
              </div>

              {/* Mobile arrow buttons */}
              {n > 1 && (
                <div className="flex sm:hidden items-center justify-between mt-4 px-4">
                  <button
                    onClick={promoPrev}
                    className="h-9 w-9 rounded-full border border-border bg-background flex items-center justify-center hover:bg-muted shadow-sm"
                    aria-label="Sebelumnya"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div className="flex items-center gap-1.5">
                    {promoBanners.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setPromoIdx(i)}
                        aria-label={`Promo ${i + 1}`}
                        style={{
                          width: i === promoIdx ? 20 : 7,
                          height: 7,
                          borderRadius: 999,
                          background: i === promoIdx ? "hsl(var(--primary))" : "hsl(var(--foreground)/0.2)",
                          border: "none",
                          padding: 0,
                          cursor: "pointer",
                          transition: "all 0.3s ease",
                        }}
                      />
                    ))}
                  </div>
                  <button
                    onClick={promoNext}
                    className="h-9 w-9 rounded-full border border-border bg-background flex items-center justify-center hover:bg-muted shadow-sm"
                    aria-label="Berikutnya"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Dot indicators — desktop */}
            {n > 1 && (
              <div className="hidden sm:flex items-center justify-center gap-2 mt-6">
                {promoBanners.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPromoIdx(i)}
                    aria-label={`Promo ${i + 1}`}
                    style={{
                      width: i === promoIdx ? 28 : 8,
                      height: 8,
                      borderRadius: 999,
                      background: i === promoIdx ? "hsl(var(--primary))" : "hsl(var(--foreground)/0.15)",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      transition: "all 0.35s ease",
                    }}
                  />
                ))}
              </div>
            )}
          </>
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

      {/* ── KARYA KAMI — real portfolio from DB ── */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex items-end justify-between mb-10"
          >
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight font-serif italic">Karya kami.</h2>
            <Link href="/portfolio" className="text-sm font-semibold text-primary hover:underline inline-flex items-center gap-1.5">
              Lihat semua <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>

          {galleryItems.length > 0 ? (
            <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
              {galleryItems.map((img, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.6, delay: (i % 4) * 0.08 }}
                  className={`break-inside-avoid relative group overflow-hidden rounded-2xl ${img.h} bg-muted cursor-pointer`}
                  onClick={() => openLightbox(i)}
                >
                  <img
                    src={img.src}
                    alt={img.label}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-40 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute top-3 right-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300">
                    <div className="bg-white/20 backdrop-blur-sm rounded-full p-1.5">
                      <ZoomIn className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  {img.label && (
                    <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-0 sm:translate-y-4 sm:group-hover:translate-y-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300">
                      <span className="inline-flex items-center gap-1.5 text-white font-semibold text-sm drop-shadow">
                        {img.label} <ArrowUpRight className="h-4 w-4" />
                      </span>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
              {Array(8).fill(0).map((_, i) => (
                <div key={i} className={`break-inside-avoid rounded-2xl ${MASONRY_HEIGHTS[i % MASONRY_HEIGHTS.length]} bg-muted animate-pulse`} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── REKOMENDASI PAKET ── */}
      <PaketCarousel packages={popularPackages} loading={loadingPaket} />

      {/* ── AI ASSISTANT CTA ── */}
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

      {/* ── TESTIMONI — from DB, admin-managed ── */}
      <section className="py-20 bg-white overflow-hidden border-t border-border">
        <div className="container mx-auto px-4 mb-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex items-end justify-between"
          >
            <h2 className="text-4xl md:text-6xl font-bold font-serif italic">Cerita mereka.</h2>
            <Link href="/testimoni" className="text-sm font-semibold text-primary hover:underline inline-flex items-center gap-1.5">
              Lihat semua <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>

        {recentTestimonials.length > 0 ? (
          <div className="relative overflow-hidden">
            {(() => {
              const minCopiesPerHalf = Math.max(1, Math.ceil(5 / Math.max(recentTestimonials.length, 1)));
              const singleRun = Array.from({ length: minCopiesPerHalf }, () => recentTestimonials).flat();
              const displayItems = [...singleRun, ...singleRun];
              return (
                <div
                  className="flex gap-5 animate-marquee"
                  style={{ width: "max-content" }}
                >
                  {displayItems.map((t, i) => (
                    <Card key={`${t.id}-${i}`} className="shrink-0 w-[320px] sm:w-[360px] border-border bg-background">
                      <CardContent className="p-6">
                        <div className="flex gap-0.5 text-amber-400 mb-3">
                          {Array(5).fill(0).map((_, j) => (
                            <Star key={j} size={14} fill={j < t.rating ? "currentColor" : "none"} />
                          ))}
                        </div>
                        <p className="text-sm leading-relaxed line-clamp-4 mb-5">"{t.komentar}"</p>
                        <div className="flex items-center gap-3">
                          {t.fotoUrl ? (
                            <AppImage src={t.fotoUrl} alt={t.namaTampil} className="w-10 h-10 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary uppercase text-sm shrink-0">
                              {t.namaTampil?.charAt(0) ?? "?"}
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
              );
            })()}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-white to-transparent z-10" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-white to-transparent z-10" />
          </div>
        ) : (
          <div className="container mx-auto px-4 text-center text-muted-foreground py-10">
            Belum ada testimoni yang disetujui.
          </div>
        )}
      </section>

      {/* ── FINAL CTA ── */}
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

      <PromoModal
        promoId={selectedPromoId}
        onClose={() => setSelectedPromoId(null)}
      />

      {/* ── PORTFOLIO LIGHTBOX ── */}
      <AnimatePresence>
        {lightboxIdx !== null && galleryItems[lightboxIdx] && (
          <motion.div
            key="lightbox-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/92 backdrop-blur-sm"
            onClick={closeLightbox}
          >
            {/* Close button */}
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 z-10 bg-white/10 hover:bg-white/25 text-white rounded-full p-2.5 transition-colors"
              aria-label="Tutup"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Counter */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-sm font-medium tabular-nums select-none">
              {lightboxIdx + 1} / {galleryItems.length}
            </div>

            {/* Prev arrow */}
            {galleryItems.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); lbPrev(); }}
                className="absolute left-3 md:left-6 z-10 bg-white/10 hover:bg-white/25 text-white rounded-full p-3 transition-colors"
                aria-label="Foto sebelumnya"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}

            {/* Next arrow */}
            {galleryItems.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); lbNext(); }}
                className="absolute right-3 md:right-6 z-10 bg-white/10 hover:bg-white/25 text-white rounded-full p-3 transition-colors"
                aria-label="Foto berikutnya"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}

            {/* Image */}
            <motion.div
              key={lightboxIdx}
              initial={{ opacity: 0, scale: 0.93 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.93 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="relative max-w-[92vw] max-h-[82vh] flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => { lbDragX.current = e.clientX; }}
              onPointerUp={(e) => {
                if (lbDragX.current === null) return;
                const diff = e.clientX - lbDragX.current;
                if (Math.abs(diff) > 40) { diff < 0 ? lbNext() : lbPrev(); }
                lbDragX.current = null;
              }}
            >
              <img
                src={galleryItems[lightboxIdx].src}
                alt={galleryItems[lightboxIdx].label}
                className="max-w-[92vw] max-h-[78vh] w-auto h-auto object-contain rounded-xl shadow-2xl select-none"
                draggable={false}
              />
              {galleryItems[lightboxIdx].label && (
                <div className="mt-3 text-white/80 text-sm font-medium tracking-wide">
                  {galleryItems[lightboxIdx].label}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
