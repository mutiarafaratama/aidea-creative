import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Item = { src: string; alt: string; title: string; category: string; ratio: number };

const items: Item[] = [
  { src: "/images/portfolio-wedding.png",    alt: "Wedding",    title: "Wedding Romansa Pringsewu",     category: "Wedding",    ratio: 4 / 5 },
  { src: "/images/portfolio-family.png",     alt: "Family",     title: "Hangatnya Keluarga Aulia",      category: "Keluarga",   ratio: 3 / 4 },
  { src: "/images/portfolio-graduation.png", alt: "Graduation", title: "Wisuda Sarjana 2025",           category: "Wisuda",     ratio: 1     },
  { src: "/images/portfolio-product.png",    alt: "Product",    title: "Katalog UMKM Pringsewu",        category: "Produk",     ratio: 4 / 5 },
  { src: "/images/hero-bg.png",              alt: "Studio",     title: "Studio Indoor Cinematic",       category: "Studio",     ratio: 3 / 4 },
  { src: "/images/portfolio-wedding.png",    alt: "Pre-wed",    title: "Prewedding Outdoor Sunset",     category: "Wedding",    ratio: 3 / 4 },
  { src: "/images/portfolio-family.png",     alt: "Anak",       title: "Cerita Si Kecil",               category: "Keluarga",   ratio: 1     },
  { src: "/images/portfolio-product.png",    alt: "Kuliner",    title: "Kuliner UMKM",                  category: "Produk",     ratio: 4 / 5 },
  { src: "/images/portfolio-graduation.png", alt: "Wisuda 2",   title: "Toga & Cerita Kelulusan",       category: "Wisuda",     ratio: 3 / 4 },
];

const categories = ["Semua", "Wedding", "Keluarga", "Wisuda", "Produk", "Studio"] as const;

export default function Portfolio() {
  const [active, setActive] = useState<(typeof categories)[number]>("Semua");
  const [query, setQuery] = useState("");
  const [lightbox, setLightbox] = useState<Item | null>(null);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      const matchCat = active === "Semua" || i.category === active;
      const matchQ = query.trim() === "" || `${i.title} ${i.category}`.toLowerCase().includes(query.toLowerCase());
      return matchCat && matchQ;
    });
  }, [active, query]);

  return (
    <div className="bg-muted/30 min-h-screen">
      <div className="container mx-auto px-4 md:px-6 py-14 md:py-20">
        <div className="max-w-3xl mb-10">
          <span className="inline-block text-[11px] font-semibold tracking-[0.18em] uppercase text-primary bg-primary/10 border border-primary/20 rounded-full px-3 py-1 mb-3">
            Galeri Portfolio
          </span>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground mb-3">
            Karya <span className="text-primary">Terbaik</span> AideaCreative
          </h1>
          <p className="text-base md:text-lg text-muted-foreground">
            Jelajahi koleksi foto kami. Cari momen favorit Anda atau filter berdasarkan kategori.
          </p>
        </div>

        <div className="mb-8 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari konsep, kategori..."
              className="pl-9 rounded-full bg-background"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setActive(c)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                  active === c
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:text-primary hover:border-primary/40"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-center py-20 text-muted-foreground">Belum ada karya untuk filter ini.</p>
        ) : (
          <div className="columns-2 md:columns-3 lg:columns-4 gap-4 [column-fill:_balance]">
            {filtered.map((img, idx) => (
              <motion.button
                key={`${img.src}-${idx}`}
                type="button"
                onClick={() => setLightbox(img)}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: Math.min(idx * 0.04, 0.4) }}
                className="mb-4 break-inside-avoid block w-full text-left relative group overflow-hidden rounded-2xl bg-card shadow-sm hover:shadow-xl ring-1 ring-border hover:ring-primary/30 transition-all"
              >
                <div style={{ aspectRatio: img.ratio }} className="w-full overflow-hidden bg-muted">
                  <img
                    src={img.src}
                    alt={img.alt}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                </div>
                <span className="absolute top-3 left-3 inline-flex items-center rounded-full bg-background/85 backdrop-blur-sm border border-border px-2.5 py-1 text-[10px] font-semibold text-foreground">
                  {img.category}
                </span>
                <div className="absolute inset-0 flex items-end p-4 bg-gradient-to-t from-[#0e1b2e]/85 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div>
                    <p className="text-white font-semibold text-sm leading-tight">{img.title}</p>
                    <p className="text-white/70 text-xs mt-0.5">AideaCreative Studio</p>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => setLightbox(null)}
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <img src={lightbox.src} alt={lightbox.alt} className="max-h-[80vh] w-full object-contain rounded-xl" />
            <div className="mt-4 flex items-center justify-between gap-3 flex-wrap text-white">
              <div>
                <p className="font-semibold">{lightbox.title}</p>
                <p className="text-sm text-white/60">{lightbox.category}</p>
              </div>
              <Button asChild className="rounded-full" onClick={() => setLightbox(null)}>
                <a href="/booking">Booking Sesi Serupa</a>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
