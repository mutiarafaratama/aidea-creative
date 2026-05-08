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
  isMobile,
  onBook,
}: {
  promo: PromoDetail;
  isMobile: boolean;
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

  const hasImage = !!(promo.gambarUrl && !imgError);

  const statusBadge = isBerlaku && !kuotaHabis ? (
    <Badge className="bg-green-500 text-white border-0 text-[11px] px-2 py-0.5 shrink-0">Berlaku</Badge>
  ) : kuotaHabis ? (
    <Badge className="bg-red-500 text-white border-0 text-[11px] px-2 py-0.5 shrink-0">Kuota Habis</Badge>
  ) : (
    <Badge className="bg-gray-400 text-white border-0 text-[11px] px-2 py-0.5 shrink-0">Tidak Aktif</Badge>
  );

  const contentBody = (
    <div className="flex-1 overflow-y-auto min-h-0">
      <div className="p-5 space-y-4">
        {/* Title + badges */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {promo.badge && (
              <Badge className="bg-primary text-primary-foreground border-0 text-[11px] px-2 py-0.5">
                {promo.badge}
              </Badge>
            )}
            {statusBadge}
          </div>
          <h2 className="text-lg font-bold leading-tight">{promo.judul}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{promo.deskripsi}</p>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {berakhir && (
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5 text-primary shrink-0" />
              Berakhir {format(berakhir, "dd MMM yyyy", { locale: idLocale })}
            </span>
          )}
          {promo.kuota != null && (
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-primary shrink-0" />
              Sisa {Math.max(0, promo.kuota - promo.terpakai)} / {promo.kuota} kuota
            </span>
          )}
        </div>

        <Separator />

        {/* Paket detail */}
        {paket && (
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Paket Terpilih</div>
            <div>
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

            {/* Pricing */}
            <div className="space-y-1 pt-1 border-t border-border">
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
              <div className="flex justify-between items-center font-bold text-base pt-1">
                <span>Total</span>
                <span className="text-primary">{formatRp(diskon > 0 ? hargaSetelahDiskon : paket.harga)}</span>
              </div>
            </div>

            {/* Fasilitas */}
            {paket.fasilitas.length > 0 && (
              <div className="grid grid-cols-1 gap-1 pt-1 border-t border-border">
                {paket.fasilitas.slice(0, 5).map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
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
        )}

        {/* Diskon info jika tidak ada paket */}
        {!paket && promo.tipeDiskon && promo.nilaiDiskon && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <BadgePercent className="h-4 w-4 text-primary" />
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

        {/* Syarat */}
        {promo.syarat && (
          <div>
            <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Syarat & Ketentuan
            </h3>
            <ul className="space-y-1.5">
              {promo.syarat.split("\n").filter(Boolean).map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                  {s.trim().replace(/^[-•*]\s*/, "")}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="h-1" />
      </div>
    </div>
  );

  const ctaBar = (
    <div className="shrink-0 border-t border-border bg-background p-4 space-y-2">
      <Button
        className="w-full gap-2 h-11 font-semibold"
        disabled={!isBerlaku || kuotaHabis}
        onClick={onBook}
      >
        {kuotaHabis ? "Kuota Habis" : !isBerlaku ? "Promo Tidak Aktif" : (
          <>
            <CheckCircle2 className="h-4 w-4" />
            Booking dengan Promo
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>
      <p className="text-center text-[11px] text-muted-foreground">
        Promo diterapkan otomatis · Pembayaran via WhatsApp
      </p>
    </div>
  );

  /* ── Mobile: stacked with compact image header ── */
  if (isMobile) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Compact header row: thumbnail left, info right */}
        {hasImage && (
          <div className="shrink-0 p-4 pb-0 flex gap-3">
            <div className="shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-muted border border-border">
              <img
                src={promo.gambarUrl!}
                alt={promo.judul}
                className="w-full h-full object-contain"
                onError={() => setImgError(true)}
              />
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
              <div className="flex flex-wrap gap-1">
                {promo.badge && (
                  <Badge className="bg-primary text-primary-foreground border-0 text-[10px] px-1.5 py-0.5">
                    {promo.badge}
                  </Badge>
                )}
                {statusBadge}
              </div>
              <h2 className="font-bold text-base leading-tight line-clamp-2">{promo.judul}</h2>
            </div>
          </div>
        )}
        {contentBody}
        {ctaBar}
      </div>
    );
  }

  /* ── Desktop: side-by-side ── */
  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: image panel */}
      {hasImage ? (
        <div className="shrink-0 w-56 bg-muted flex items-center justify-center overflow-hidden">
          <img
            src={promo.gambarUrl!}
            alt={promo.judul}
            className="w-full h-full object-contain"
            onError={() => setImgError(true)}
          />
        </div>
      ) : (
        <div className="shrink-0 w-48 bg-gradient-to-b from-primary/10 to-muted flex items-center justify-center">
          <ImageOff className="h-10 w-10 text-muted-foreground/30" />
        </div>
      )}

      {/* Right: content + CTA */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {contentBody}
        {ctaBar}
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

  const loadingNode = (
    <div className="flex items-center justify-center py-20 px-8">
      <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
    </div>
  );

  const notFoundNode = (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center gap-3">
      <p className="text-muted-foreground text-sm">Promo tidak ditemukan.</p>
      <Button variant="outline" size="sm" onClick={onClose}>Tutup</Button>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
        <DrawerContent className="max-h-[92dvh] p-0 rounded-t-3xl overflow-hidden flex flex-col">
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            {loading ? loadingNode : promo ? (
              <PromoContent promo={promo} isMobile={true} onBook={handleBook} />
            ) : notFoundNode}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent
        className="p-0 gap-0 max-w-2xl w-full rounded-3xl overflow-hidden flex flex-col"
        style={{ maxHeight: "88vh" }}
      >
        <DialogClose className="absolute right-3 top-3 z-20 rounded-full bg-black/40 text-white hover:bg-black/60 p-1.5 transition-colors">
          <X className="h-4 w-4" />
          <span className="sr-only">Tutup</span>
        </DialogClose>
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col" style={{ minHeight: 0 }}>
          {loading ? loadingNode : promo ? (
            <PromoContent promo={promo} isMobile={false} onBook={handleBook} />
          ) : notFoundNode}
        </div>
      </DialogContent>
    </Dialog>
  );
}
