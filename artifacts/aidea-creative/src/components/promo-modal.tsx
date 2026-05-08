import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  X,
  CalendarClock,
  Users,
  CheckCircle2,
  ArrowRight,
  Loader2,
  BadgePercent,
  ShieldCheck,
  ImageOff,
  Clock,
  Camera,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerClose,
} from "@/components/ui/drawer";
import { useAuth } from "@/lib/auth";

type PaketDetail = {
  id: string;
  namaPaket: string;
  deskripsi: string;
  harga: number;
  durasiSesi: number;
  jumlahFoto: number;
  fasilitas: string[];
  fotoUrl: string | null;
};

type PromoDetail = {
  id: string;
  judul: string;
  deskripsi: string;
  badge: string | null;
  gambarUrl: string | null;
  tanggalMulai: string | null;
  tanggalBerakhir: string | null;
  isAktif: boolean;
  paketId: string | null;
  namaPaket: string | null;
  tipeDiskon: string | null;
  nilaiDiskon: number | null;
  syarat: string | null;
  kuota: number | null;
  terpakai: number;
  paketDetail: PaketDetail | null;
};

function hitungDiskon(harga: number, tipe: string | null, nilai: number | null): number {
  if (!tipe || !nilai) return 0;
  if (tipe === "persen") return Math.floor(harga * nilai / 100);
  if (tipe === "nominal") return Math.min(nilai, harga);
  return 0;
}

function formatRp(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    setIsMobile(mq.matches);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

function PromoContent({
  promo,
  onClose,
  onBook,
}: {
  promo: PromoDetail;
  onClose: () => void;
  onBook: () => void;
}) {
  const [imgError, setImgError] = useState(false);

  const now = new Date();
  const mulai = promo.tanggalMulai ? new Date(promo.tanggalMulai) : null;
  const berakhir = promo.tanggalBerakhir ? new Date(promo.tanggalBerakhir) : null;
  const isBerlaku = promo.isAktif && (!mulai || now >= mulai) && (!berakhir || now <= berakhir);
  const kuotaHabis = promo.kuota != null && promo.terpakai >= promo.kuota;

  const paket = promo.paketDetail;
  const diskon = paket ? hitungDiskon(paket.harga, promo.tipeDiskon, promo.nilaiDiskon) : 0;
  const hargaSetelahDiskon = paket ? paket.harga - diskon : 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Hero image */}
      <div className="relative w-full shrink-0" style={{ height: "200px" }}>
        {promo.gambarUrl && !imgError ? (
          <img
            src={promo.gambarUrl}
            alt={promo.judul}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <ImageOff className="h-12 w-12 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Badges on image */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {promo.badge && (
            <Badge className="bg-primary text-primary-foreground border-0 shadow text-[11px] px-2 py-0.5">
              {promo.badge}
            </Badge>
          )}
          {isBerlaku && !kuotaHabis ? (
            <Badge className="bg-green-500 text-white border-0 shadow text-[11px] px-2 py-0.5">
              Promo Berlaku
            </Badge>
          ) : kuotaHabis ? (
            <Badge className="bg-red-500 text-white border-0 text-[11px] px-2 py-0.5">
              Kuota Habis
            </Badge>
          ) : (
            <Badge className="bg-gray-500 text-white border-0 text-[11px] px-2 py-0.5">
              Tidak Berlaku
            </Badge>
          )}
        </div>

        {/* Title on image */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h2 className="text-white text-xl font-bold leading-tight">{promo.judul}</h2>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-5 space-y-5">

          {/* Meta info */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {berakhir && (
              <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5 text-primary" />
                Berakhir {format(berakhir, "dd MMM yyyy", { locale: idLocale })}
              </span>
            )}
            {promo.kuota != null && (
              <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-primary" />
                Sisa {Math.max(0, promo.kuota - promo.terpakai)} dari {promo.kuota} kuota
              </span>
            )}
          </div>

          {/* Deskripsi */}
          <p className="text-sm text-muted-foreground leading-relaxed">{promo.deskripsi}</p>

          {/* Paket + Harga */}
          {paket && (
            <div className="rounded-2xl border border-border overflow-hidden bg-muted/30">
              {paket.fotoUrl && (
                <img
                  src={paket.fotoUrl}
                  alt={paket.namaPaket}
                  className="w-full h-32 object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Paket</div>
                    <div className="font-semibold text-base">{paket.namaPaket}</div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {paket.durasiSesi} menit
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Camera className="h-3 w-3" /> {paket.jumlahFoto} foto
                      </span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Pricing */}
                <div className="space-y-1">
                  {diskon > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Harga normal</span>
                      <span className="line-through text-muted-foreground">{formatRp(paket.harga)}</span>
                    </div>
                  )}
                  {diskon > 0 && (
                    <div className="flex justify-between text-sm text-green-600 font-medium">
                      <span className="flex items-center gap-1">
                        <Zap className="h-3.5 w-3.5" />
                        {promo.tipeDiskon === "persen" ? `Diskon ${promo.nilaiDiskon}%` : "Potongan harga"}
                      </span>
                      <span>− {formatRp(diskon)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center font-bold text-lg pt-1 border-t border-border">
                    <span>Total</span>
                    <span className="text-primary">{formatRp(diskon > 0 ? hargaSetelahDiskon : paket.harga)}</span>
                  </div>
                </div>

                {/* Fasilitas */}
                {paket.fasilitas.length > 0 && (
                  <div className="grid grid-cols-1 gap-1.5 pt-1">
                    {paket.fasilitas.slice(0, 5).map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                        {f}
                      </div>
                    ))}
                    {paket.fasilitas.length > 5 && (
                      <div className="text-xs text-muted-foreground pl-5">
                        +{paket.fasilitas.length - 5} fasilitas lainnya
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Diskon info (if no paket attached) */}
          {!paket && promo.tipeDiskon && promo.nilaiDiskon && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <BadgePercent className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-semibold text-sm">
                  {promo.tipeDiskon === "persen"
                    ? `Diskon ${promo.nilaiDiskon}%`
                    : `Potongan ${formatRp(promo.nilaiDiskon)}`}
                </div>
                <div className="text-xs text-muted-foreground">
                  {promo.namaPaket ? `Berlaku untuk paket ${promo.namaPaket}` : "Berlaku untuk semua paket"}
                </div>
              </div>
            </div>
          )}

          {/* Syarat & Ketentuan */}
          {promo.syarat && (
            <div>
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
                <ShieldCheck className="h-4 w-4 text-primary" /> Syarat & Ketentuan
              </h3>
              <ul className="space-y-1.5">
                {promo.syarat.split("\n").filter(Boolean).map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                    {s.trim().replace(/^[-•*]\s*/, "")}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Bottom padding for sticky CTA */}
          <div className="h-2" />
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="shrink-0 border-t border-border bg-background p-4 space-y-2">
        <Button
          className="w-full gap-2 h-12 text-base font-semibold"
          disabled={!isBerlaku || kuotaHabis}
          onClick={onBook}
        >
          {kuotaHabis ? (
            "Kuota Habis"
          ) : !isBerlaku ? (
            "Promo Tidak Aktif"
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Booking dengan Promo
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Promo diterapkan otomatis · Pembayaran via WhatsApp setelah konfirmasi admin
        </p>
      </div>
    </div>
  );
}

export function PromoModal({
  promoId,
  onClose,
}: {
  promoId: string | null;
  onClose: () => void;
}) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [promo, setPromo] = useState<PromoDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const open = !!promoId;

  useEffect(() => {
    if (!promoId) { setPromo(null); return; }
    setLoading(true);
    setPromo(null);
    fetch(`/api/promo/${promoId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setPromo(data))
      .catch(() => setPromo(null))
      .finally(() => setLoading(false));
  }, [promoId]);

  const handleBook = () => {
    if (!promo) return;
    const params = new URLSearchParams();
    if (promo.paketId) params.set("paket", promo.paketId);
    params.set("promo", promo.id);
    const bookingUrl = `/booking?${params.toString()}`;
    onClose();
    if (!user) {
      setLocation(`/login?redirect=${encodeURIComponent(bookingUrl)}`);
    } else {
      setLocation(bookingUrl);
    }
  };

  const inner = loading ? (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  ) : promo ? (
    <PromoContent promo={promo} onClose={onClose} onBook={handleBook} />
  ) : (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center gap-3">
      <p className="text-muted-foreground text-sm">Promo tidak ditemukan.</p>
      <Button variant="outline" size="sm" onClick={onClose}>Tutup</Button>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
        <DrawerContent className="max-h-[92dvh] p-0 rounded-t-3xl overflow-hidden flex flex-col">
          {/* Drag handle already rendered by DrawerContent */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            {inner}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent
        className="p-0 gap-0 max-w-2xl w-full rounded-3xl overflow-hidden flex flex-col"
        style={{ maxHeight: "90vh" }}
      >
        <DialogClose className="absolute right-3 top-3 z-20 rounded-full bg-black/40 text-white hover:bg-black/60 p-1.5 transition-colors">
          <X className="h-4 w-4" />
          <span className="sr-only">Tutup</span>
        </DialogClose>
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {inner}
        </div>
      </DialogContent>
    </Dialog>
  );
}
