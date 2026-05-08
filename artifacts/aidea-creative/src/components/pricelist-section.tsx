import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, X, ImageOff, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";

type PricelistItem = {
  id: string;
  kategori: string;
  gambarUrl: string;
  urutan: number;
  createdAt: string;
};

type CategoryGroup = {
  kategori: string;
  items: PricelistItem[];
};

const KATEGORI_LABELS: Record<string, string> = {
  Photobox: "Photobox",
  SelfPhoto: "Self Photo",
  PhotoStudio: "Photo Studio",
};

function usePricelist() {
  return useQuery<PricelistItem[]>({
    queryKey: ["pricelist"],
    queryFn: async () => {
      const res = await fetch("/api/pricelist");
      if (!res.ok) throw new Error("Gagal memuat pricelist");
      return res.json();
    },
    staleTime: 60_000,
  });
}

function PricelistModal({
  group,
  startIndex,
  onClose,
}: {
  group: CategoryGroup;
  startIndex: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(startIndex);
  const [dir, setDir] = useState(1);
  const n = group.items.length;

  const go = useCallback((newIdx: number, d: number) => {
    setDir(d);
    setIdx((newIdx + n) % n);
  }, [n]);

  const next = useCallback(() => go(idx + 1, 1), [idx, go]);
  const prev = useCallback(() => go(idx - 1, -1), [idx, go]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev, onClose]);

  const currentItem = group.items[idx];

  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? "60%" : "-60%", opacity: 0, scale: 0.96 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (d: number) => ({ x: d > 0 ? "-60%" : "60%", opacity: 0, scale: 0.96 }),
  };

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent
        className="p-0 gap-0 max-w-2xl w-full rounded-2xl overflow-hidden bg-black border-0"
        style={{ maxHeight: "92dvh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-black/80 backdrop-blur-sm shrink-0">
          <div>
            <p className="text-white font-bold text-sm">
              {KATEGORI_LABELS[group.kategori] ?? group.kategori}
            </p>
            <p className="text-white/50 text-xs">{idx + 1} / {n}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Image area */}
        <div className="relative flex-1 overflow-hidden bg-black" style={{ minHeight: 300, maxHeight: "75dvh" }}>
          <AnimatePresence custom={dir} mode="popLayout" initial={false}>
            <motion.div
              key={idx}
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 380, damping: 38, mass: 0.8 }}
              className="w-full h-full flex items-center justify-center"
              style={{ minHeight: 300, maxHeight: "75dvh" }}
            >
              <img
                src={currentItem.gambarUrl}
                alt={`${group.kategori} ${idx + 1}`}
                className="max-w-full max-h-full object-contain"
                style={{ maxHeight: "72dvh" }}
                draggable={false}
              />
            </motion.div>
          </AnimatePresence>

          {/* Prev/Next arrows */}
          {n > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors z-10"
                aria-label="Sebelumnya"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={next}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors z-10"
                aria-label="Berikutnya"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
        </div>

        {/* Dot indicators */}
        {n > 1 && (
          <div className="flex items-center justify-center gap-1.5 py-3 bg-black/80 shrink-0">
            {group.items.map((_, i) => (
              <button
                key={i}
                onClick={() => go(i, i > idx ? 1 : -1)}
                style={{
                  width: i === idx ? 20 : 6, height: 6,
                  borderRadius: 999,
                  background: i === idx ? "white" : "rgba(255,255,255,0.3)",
                  border: "none", padding: 0, cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
                aria-label={`Gambar ${i + 1}`}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CategoryCard({
  group,
  onClick,
}: {
  group: CategoryGroup;
  onClick: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const cover = group.items[0]?.gambarUrl;
  const label = KATEGORI_LABELS[group.kategori] ?? group.kategori;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      onClick={onClick}
      className="group cursor-pointer"
    >
      <div className="relative overflow-hidden rounded-2xl border border-border/60 shadow-sm hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/30 transition-all duration-400 bg-muted aspect-[3/4]">
        {cover && !imgError ? (
          <img
            src={cover}
            alt={label}
            className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-muted">
            <ImageOff className="h-10 w-10 text-muted-foreground/30" />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {/* Count badge */}
        {group.items.length > 1 && (
          <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-[11px] font-semibold px-2.5 py-1 rounded-full border border-white/20">
            {group.items.length} halaman
          </div>
        )}

        {/* Label + CTA at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-white font-bold text-lg leading-tight">{label}</h3>
          <p className="text-white/70 text-xs mt-0.5 group-hover:text-white/90 transition-colors">
            Tap untuk lihat pricelist
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-white text-xs font-semibold opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300">
            Lihat semua <ChevronRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function PricelistSection() {
  const { data, isLoading } = usePricelist();
  const [openGroup, setOpenGroup] = useState<CategoryGroup | null>(null);

  const groups: CategoryGroup[] = (() => {
    const items: PricelistItem[] = Array.isArray(data) ? data : [];
    const map: Record<string, PricelistItem[]> = {};
    for (const item of items) {
      if (!map[item.kategori]) map[item.kategori] = [];
      map[item.kategori].push(item);
    }
    const ORDER = ["Photobox", "SelfPhoto", "PhotoStudio"];
    return Object.keys(map)
      .sort((a, b) => {
        const ai = ORDER.indexOf(a), bi = ORDER.indexOf(b);
        if (ai === -1 && bi === -1) return a.localeCompare(b);
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      })
      .map((k) => ({ kategori: k, items: map[k] }));
  })();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="aspect-[3/4] rounded-2xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-16 border border-dashed border-border rounded-2xl">
        <ImageOff className="mx-auto mb-3 text-muted-foreground/30 h-10 w-10" />
        <p className="text-muted-foreground text-sm">Pricelist belum tersedia.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {groups.map((group) => (
          <CategoryCard
            key={group.kategori}
            group={group}
            onClick={() => setOpenGroup(group)}
          />
        ))}
      </div>

      {openGroup && (
        <PricelistModal
          group={openGroup}
          startIndex={0}
          onClose={() => setOpenGroup(null)}
        />
      )}
    </>
  );
}
