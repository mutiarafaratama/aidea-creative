import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  Tag, CalendarClock, Users, CheckCircle2, ArrowRight, Loader2,
  Ticket, BadgePercent, ShieldCheck, ImageOff, ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

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

export default function PromoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [promo, setPromo] = useState<PromoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`${API_BASE}/api/promo/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => setPromo(data))
      .catch(() => setPromo(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!promo) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
        <Ticket className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Promo tidak ditemukan</h2>
        <p className="text-muted-foreground text-sm">Promo ini mungkin sudah berakhir atau tidak tersedia.</p>
        <Button variant="outline" onClick={() => setLocation("/")}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Kembali ke Beranda
        </Button>
      </div>
    );
  }

  const now = new Date();
  const mulai = promo.tanggalMulai ? new Date(promo.tanggalMulai) : null;
  const berakhir = promo.tanggalBerakhir ? new Date(promo.tanggalBerakhir) : null;
  const isBerlaku = promo.isAktif && (!mulai || now >= mulai) && (!berakhir || now <= berakhir);
  const kuotaHabis = promo.kuota != null && promo.terpakai >= promo.kuota;

  const paket = promo.paketDetail;
  const diskon = paket ? hitungDiskon(paket.harga, promo.tipeDiskon, promo.nilaiDiskon) : 0;
  const hargaSetelahDiskon = paket ? paket.harga - diskon : 0;

  const handleBooking = () => {
    const params = new URLSearchParams();
    if (promo.paketId) params.set("paket", promo.paketId);
    params.set("promo", promo.id);
    const bookingUrl = `/booking?${params.toString()}`;
    if (!user) {
      setLocation(`/login?redirect=${encodeURIComponent(bookingUrl)}`);
      return;
    }
    setLocation(bookingUrl);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero banner */}
      <div className="relative w-full h-64 md:h-80 bg-gradient-to-br from-primary/20 to-primary/5 overflow-hidden">
        {promo.gambarUrl && !imgError ? (
          <img
            src={promo.gambarUrl}
            alt={promo.judul}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff className="h-16 w-16 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <button
            onClick={() => setLocation("/")}
            className="inline-flex items-center gap-1 text-sm text-white/80 hover:text-white mb-3 transition"
          >
            <ChevronLeft className="h-4 w-4" /> Kembali
          </button>
          {promo.badge && (
            <Badge className="mb-2 bg-primary text-primary-foreground border-0">{promo.badge}</Badge>
          )}
          <h1 className="text-2xl md:text-3xl font-serif font-bold">{promo.judul}</h1>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Kiri: Detail promo */}
          <div className="md:col-span-2 space-y-6">
            {/* Status & periode */}
            <div className="flex flex-wrap gap-2 items-center">
              {isBerlaku && !kuotaHabis ? (
                <Badge className="bg-green-500/10 text-green-700 border-green-200">Promo Berlaku</Badge>
              ) : kuotaHabis ? (
                <Badge variant="destructive">Kuota Habis</Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">Tidak Berlaku</Badge>
              )}
              {berakhir && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <CalendarClock className="h-3.5 w-3.5" />
                  Berakhir {format(berakhir, "dd MMMM yyyy", { locale: idLocale })}
                </span>
              )}
              {promo.kuota != null && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  Sisa {Math.max(0, promo.kuota - promo.terpakai)} dari {promo.kuota} kuota
                </span>
              )}
            </div>

            {/* Deskripsi */}
            <div>
              <h2 className="font-semibold text-lg mb-2">Tentang Promo</h2>
              <p className="text-muted-foreground leading-relaxed">{promo.deskripsi}</p>
            </div>

            {/* Info diskon */}
            {promo.tipeDiskon && promo.nilaiDiskon && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <BadgePercent className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold">
                      {promo.tipeDiskon === "persen"
                        ? `Diskon ${promo.nilaiDiskon}%`
                        : `Potongan ${formatRp(promo.nilaiDiskon)}`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {promo.namaPaket ? `Berlaku untuk paket ${promo.namaPaket}` : "Berlaku untuk semua paket"}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Syarat & ketentuan */}
            {promo.syarat && (
              <div>
                <h2 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" /> Syarat & Ketentuan
                </h2>
                <ul className="space-y-2">
                  {promo.syarat.split("\n").filter(Boolean).map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      {s.trim().replace(/^[-•*]\s*/, "")}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Kanan: Paket & harga */}
          <div className="space-y-4">
            {paket && (
              <Card className="border-border shadow-sm">
                <CardContent className="p-5 space-y-4">
                  {paket.fotoUrl && (
                    <img
                      src={paket.fotoUrl}
                      alt={paket.namaPaket}
                      className="w-full h-36 object-cover rounded-lg"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  )}
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Paket</div>
                    <div className="font-semibold text-base">{paket.namaPaket}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {paket.durasiSesi} menit · {paket.jumlahFoto} foto
                    </div>
                  </div>

                  <Separator />

                  {/* Harga */}
                  <div className="space-y-1">
                    {diskon > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Harga normal</span>
                        <span className="line-through text-muted-foreground">{formatRp(paket.harga)}</span>
                      </div>
                    )}
                    {diskon > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Diskon promo</span>
                        <span>- {formatRp(diskon)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg pt-1">
                      <span>Total</span>
                      <span className="text-primary">{formatRp(diskon > 0 ? hargaSetelahDiskon : paket.harga)}</span>
                    </div>
                  </div>

                  {/* Fasilitas */}
                  {paket.fasilitas.length > 0 && (
                    <div className="space-y-1.5">
                      {paket.fasilitas.slice(0, 4).map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                          {f}
                        </div>
                      ))}
                      {paket.fasilitas.length > 4 && (
                        <div className="text-xs text-muted-foreground pl-5">
                          +{paket.fasilitas.length - 4} fasilitas lainnya
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {!paket && promo.tipeDiskon && (
              <Card className="border-border shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Tag className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm">Cara Pakai Promo</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Pilih paket foto saat booking dan masukkan kode promo untuk mendapatkan diskon.
                  </p>
                </CardContent>
              </Card>
            )}

            <Button
              className="w-full gap-2"
              size="lg"
              disabled={!isBerlaku || kuotaHabis}
              onClick={handleBooking}
            >
              {kuotaHabis ? "Kuota Habis" : !isBerlaku ? "Promo Tidak Aktif" : (
                <><CheckCircle2 className="h-4 w-4" /> Booking dengan Promo <ArrowRight className="h-4 w-4" /></>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Promo otomatis diterapkan saat booking
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
