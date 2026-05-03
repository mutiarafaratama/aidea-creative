import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, X, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useListPortfolio } from "@workspace/api-client-react";
import type { Portfolio } from "@workspace/api-client-react";

export default function PortfolioPage() {
  const { data, isLoading } = useListPortfolio({}, { refetchInterval: 5000 });
  const items: Portfolio[] = Array.isArray(data) ? data : [];

  const [active, setActive] = useState("Semua");
  const [query, setQuery] = useState("");
  const [lightbox, setLightbox] = useState<Portfolio | null>(null);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(items.map((i) => i.kategori))).filter(Boolean);
    return ["Semua", ...cats];
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      const matchCat = active === "Semua" || i.kategori === active;
      const matchQ =
        query.trim() === "" ||
        `${i.judul} ${i.kategori} ${i.tags.join(" ")}`.toLowerCase().includes(query.toLowerCase());
      return matchCat && matchQ;
    });
  }, [items, active, query]);

  return (
    <div className="bg-muted/30 min-h-screen">
      <div className="container mx-auto px-4 md:px-6 py-8 md:py-10">

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

        {isLoading ? (
          <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="mb-4 break-inside-avoid">
                <Skeleton className="w-full rounded-2xl" style={{ aspectRatio: i % 3 === 0 ? "4/5" : i % 2 === 0 ? "3/4" : "1" }} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center py-20 text-muted-foreground">
            {items.length === 0 ? "Belum ada foto portfolio." : "Belum ada karya untuk filter ini."}
          </p>
        ) : (
          <div className="columns-2 md:columns-3 lg:columns-4 gap-4 [column-fill:_balance]">
            {filtered.map((item, idx) => {
              const firstImg = Array.isArray(item.gambarUrl) ? item.gambarUrl[0] : null;
              if (!firstImg) return null;
              const ratios = [4 / 5, 3 / 4, 1, 4 / 5, 3 / 4];
              const ratio = ratios[idx % ratios.length];
              return (
                <motion.button
                  key={item.id}
                  type="button"
                  onClick={() => setLightbox(item)}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: Math.min(idx * 0.04, 0.4) }}
                  className="mb-4 break-inside-avoid block w-full text-left relative group overflow-hidden rounded-2xl bg-card shadow-sm hover:shadow-xl ring-1 ring-border hover:ring-primary/30 transition-all"
                >
                  <div style={{ aspectRatio: ratio }} className="w-full overflow-hidden bg-muted">
                    <img
                      src={firstImg}
                      alt={item.judul}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  </div>
                  <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-background/85 backdrop-blur-sm border border-border px-2.5 py-1 text-[10px] font-semibold text-foreground capitalize">
                    {item.isFeatured && <Star className="h-2.5 w-2.5 text-amber-500 fill-amber-500" />}
                    {item.kategori}
                  </span>
                  <div className="absolute inset-0 flex items-end p-4 bg-gradient-to-t from-[#0e1b2e]/85 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div>
                      <p className="text-white font-semibold text-sm leading-tight">{item.judul}</p>
                      <p className="text-white/70 text-xs mt-0.5">AideaCreative Studio</p>
                    </div>
                  </div>
                </motion.button>
              );
            })}
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
            <img
              src={lightbox.gambarUrl[0]}
              alt={lightbox.judul}
              className="max-h-[80vh] w-full object-contain rounded-xl"
            />
            <div className="mt-4 flex items-center justify-between gap-3 flex-wrap text-white">
              <div>
                <p className="font-semibold">{lightbox.judul}</p>
                <p className="text-sm text-white/60 capitalize">{lightbox.kategori}</p>
                {lightbox.deskripsi && (
                  <p className="text-sm text-white/50 mt-1">{lightbox.deskripsi}</p>
                )}
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
