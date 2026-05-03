import { Sparkles } from "lucide-react";
import { useListPromo } from "@workspace/api-client-react";

const FALLBACK_TEXT = "Selamat datang di AideaCreative — Studio foto profesional di Pujodadi, Pringsewu";

export function PromoMarquee() {
  const { data, isFetched } = useListPromo();
  const now = Date.now();
  const items = (Array.isArray(data) ? data : []).filter((p) => {
    if (!p.isAktif) return false;
    if (p.tanggalMulai && new Date(p.tanggalMulai).getTime() > now) return false;
    if (p.tanggalBerakhir && new Date(p.tanggalBerakhir).getTime() < now) return false;
    return true;
  });

  if (isFetched && items.length === 0) return null;

  const looped = items.length > 0 ? [...items, ...items] : [];

  return (
    <div className="bg-primary text-primary-foreground overflow-hidden">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center gap-4 py-2 text-xs md:text-sm">
          <div className="hidden sm:flex items-center gap-1.5 shrink-0 font-semibold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" />
            Promo
          </div>
          <div className="relative flex-1 overflow-hidden">
            {looped.length === 0 ? (
              <span className="block whitespace-nowrap font-medium opacity-90">{FALLBACK_TEXT}</span>
            ) : (
              <div className="flex gap-10 whitespace-nowrap animate-marquee">
                {looped.map((p, i) => (
                  <span key={`${p.id}-${i}`} className="inline-flex items-center gap-2">
                    {p.badge && (
                      <span className="inline-block rounded-full bg-primary-foreground/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                        {p.badge}
                      </span>
                    )}
                    <span className="font-medium">{p.judul}</span>
                    <span className="text-primary-foreground/80">— {p.deskripsi}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
