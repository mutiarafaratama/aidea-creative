import { Link } from "wouter";
import { ArrowRight, Tag } from "lucide-react";
import { useListPromo, getListPromoQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function PromoSection() {
  const { data } = useListPromo({ query: { queryKey: getListPromoQueryKey() } });
  const now = Date.now();
  const items = (Array.isArray(data) ? data : []).filter((p) => {
    if (!p.isAktif || !p.tampilCard) return false;
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.slice(0, 6).map((p) => (
            <Card key={p.id} className="overflow-hidden border-border hover:shadow-lg transition-shadow group">
              {p.gambarUrl && (
                <div className="aspect-[16/9] overflow-hidden bg-muted">
                  <img src={p.gambarUrl} alt={p.judul} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
              )}
              <CardContent className="p-6">
                {p.badge && <Badge className="mb-3 bg-primary text-primary-foreground">{p.badge}</Badge>}
                <h3 className="text-lg font-semibold text-foreground mb-2">{p.judul}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{p.deskripsi}</p>
                {p.link && (
                  <Link href={p.link}>
                    <Button variant="outline" size="sm" className="rounded-full">
                      {p.ctaLabel ?? "Lihat Detail"} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
