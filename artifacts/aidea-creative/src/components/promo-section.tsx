import { Tag } from "lucide-react";
import { useListPromo } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";

export function PromoSection() {
  const { data } = useListPromo();
  const now = Date.now();
  const items = (Array.isArray(data) ? data : []).filter((p) => {
    if (!p.isAktif) return false;
    if (p.tanggalMulai && new Date(p.tanggalMulai).getTime() > now) return false;
    if (p.tanggalBerakhir && new Date(p.tanggalBerakhir).getTime() < now) return false;
    return true;
  });

  if (items.length === 0) return null;

  return (
    <section className="py-16 md:py-20 bg-muted/30">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-3">
              <Tag className="h-3.5 w-3.5" /> Promo Berjalan
            </div>
            <h2 className="text-3xl md:text-4xl font-sans font-bold text-foreground">Penawaran Spesial</h2>
            <p className="text-muted-foreground mt-2 max-w-xl">Jangan lewatkan promo terbatas dari AideaCreative untuk paket foto dan produk pilihan.</p>
          </div>
        </div>

        {/* Horizontal scroll container */}
        <div className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide -mx-4 px-4 md:-mx-6 md:px-6">
          {items.map((p) => (
            <div
              key={p.id}
              className="snap-start shrink-0 w-72 md:w-80 rounded-2xl overflow-hidden border border-border bg-card hover:shadow-lg transition-shadow group"
            >
              {p.gambarUrl ? (
                <div className="aspect-[16/9] overflow-hidden bg-muted">
                  <img
                    src={p.gambarUrl}
                    alt={p.judul}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              ) : (
                <div className="aspect-[16/9] bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                  <Tag className="h-10 w-10 text-primary/30" />
                </div>
              )}
              <div className="p-5">
                {p.badge && <Badge className="mb-2 bg-primary text-primary-foreground">{p.badge}</Badge>}
                <h3 className="text-base font-semibold text-foreground mb-1">{p.judul}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{p.deskripsi}</p>
                {p.tanggalBerakhir && (
                  <p className="text-[11px] text-muted-foreground/70 mt-3">
                    Berlaku s/d {new Date(p.tanggalBerakhir).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
