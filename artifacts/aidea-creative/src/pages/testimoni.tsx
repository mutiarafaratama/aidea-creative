import { useState } from "react";
import { useListTestimoni } from "@workspace/api-client-react";
import { Star, Quote, BadgeCheck, BarChart2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-rose-100 text-rose-700",
  "bg-emerald-100 text-emerald-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-cyan-100 text-cyan-700",
  "bg-pink-100 text-pink-700",
  "bg-lime-100 text-lime-700",
];

function getAvatarColor(name: string) {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

function timeAgo(dateStr: string | undefined) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "Hari ini";
  if (days < 7) return `${days} hari lalu`;
  if (days < 30) return `${Math.floor(days / 7)} minggu lalu`;
  if (days < 365) return `${Math.floor(days / 30)} bulan lalu`;
  return `${Math.floor(days / 365)} tahun lalu`;
}

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array(5).fill(0).map((_, i) => (
        <Star key={i} size={size} fill={i < rating ? "currentColor" : "none"}
          className={i < rating ? "text-amber-400" : "text-muted-foreground/30"} />
      ))}
    </div>
  );
}

export default function Testimoni() {
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const { data: testimoniList, isLoading } = useListTestimoni({
    query: { refetchInterval: 5000, staleTime: 0 },
  });

  const allList = testimoniList ?? [];
  const avgRating = allList.length > 0
    ? (allList.reduce((s, t) => s + t.rating, 0) / allList.length).toFixed(1)
    : null;
  const ratingCounts = [5, 4, 3, 2, 1].map(r => ({
    star: r,
    count: allList.filter(t => t.rating === r).length,
  }));

  const filtered = filterRating ? allList.filter(t => t.rating === filterRating) : allList;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">

        {/* Filter row: filters + stats icon */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {!isLoading && allList.length > 0 && (<>
            <button
              onClick={() => setFilterRating(null)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${filterRating === null ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:border-primary/40"}`}
            >
              Semua
            </button>
            {[5, 4, 3, 2, 1].filter(r => ratingCounts.find(rc => rc.star === r)!.count > 0).map(r => (
              <button
                key={r}
                onClick={() => setFilterRating(r === filterRating ? null : r)}
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border transition-all ${filterRating === r ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:border-primary/40"}`}
              >
                {r} <Star size={10} fill="currentColor" className="text-amber-400" />
                <span className="ml-0.5 opacity-70">({ratingCounts.find(rc => rc.star === r)!.count})</span>
              </button>
            ))}
            <button
              onClick={() => setStatsOpen(true)}
              className="w-7 h-7 rounded-full border border-border bg-background flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 transition-all"
              aria-label="Lihat statistik rating"
            >
              <BarChart2 size={14} />
            </button>
          </>)}
        </div>

        {/* Stats modal */}
        <Dialog open={statsOpen} onOpenChange={setStatsOpen}>
          <DialogContent className="sm:max-w-xs">
            <DialogHeader>
              <DialogTitle className="font-serif">Statistik Rating</DialogTitle>
              <DialogDescription>Ringkasan penilaian dari seluruh pelanggan AideaCreative.</DialogDescription>
            </DialogHeader>
            {avgRating && (
              <div className="flex items-center gap-6 pt-2">
                <div className="text-center shrink-0">
                  <div className="text-5xl font-bold text-foreground leading-none mb-1">{avgRating}</div>
                  <StarRow rating={Math.round(Number(avgRating))} size={16} />
                  <div className="text-xs text-muted-foreground mt-2">{allList.length} ulasan</div>
                </div>
                <div className="flex flex-col gap-2 flex-1">
                  {ratingCounts.map(({ star, count }) => (
                    <div key={star} className="flex items-center gap-2">
                      <span className="text-xs w-3 text-right text-muted-foreground">{star}</span>
                      <Star size={10} fill="currentColor" className="text-amber-400 shrink-0" />
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full transition-all duration-500"
                          style={{ width: allList.length ? `${(count / allList.length) * 100}%` : "0%" }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-4 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Cards */}
        <div className="columns-1 md:columns-2 lg:columns-3 gap-5 space-y-5">
          {isLoading ? (
            Array(6).fill(0).map((_, i) => (
              <Card key={i} className="break-inside-avoid border-border">
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-24 mb-4" />
                  <Skeleton className="h-16 w-full mb-6" />
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div><Skeleton className="h-4 w-24 mb-1" /><Skeleton className="h-3 w-16" /></div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : filtered.length > 0 ? (
            filtered.map((testimoni) => (
              <Card key={testimoni.id} className="break-inside-avoid border-border bg-card hover:shadow-md transition-all duration-200 group">
                <CardContent className="p-6 relative">
                  <Quote size={36} className="absolute top-4 right-4 text-primary/8 group-hover:text-primary/15 transition-colors" />
                  <div className="mb-3">
                    <StarRow rating={testimoni.rating} size={13} />
                  </div>
                  <p className="text-foreground/90 text-sm leading-relaxed mb-5">
                    "{testimoni.komentar}"
                  </p>
                  <div className="flex items-center justify-between border-t border-border pt-4">
                    <div className="flex items-center gap-3">
                      {testimoni.fotoUrl ? (
                        <img src={testimoni.fotoUrl} alt={testimoni.namaTampil} className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${getAvatarColor(testimoni.namaTampil)}`}>
                          {testimoni.namaTampil.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-sm flex items-center gap-1">
                          {testimoni.namaTampil}
                          <BadgeCheck size={13} className="text-primary" />
                        </div>
                        <div className="text-xs text-muted-foreground">Pelanggan AideaCreative</div>
                      </div>
                    </div>
                    {(testimoni as any).createdAt && (
                      <span className="text-[11px] text-muted-foreground/60 shrink-0">
                        {timeAgo((testimoni as any).createdAt)}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full py-20 text-center text-muted-foreground">
              {filterRating ? `Belum ada ulasan ${filterRating} bintang.` : "Belum ada testimoni."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
