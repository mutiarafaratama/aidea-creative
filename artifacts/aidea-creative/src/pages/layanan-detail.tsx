import { Link, useParams } from "wouter";
import {
  Camera,
  Sparkles,
  Aperture,
  Heart,
  PartyPopper,
  Check,
  ArrowRight,
  ArrowLeft,
  Film,
  Glasses,
  Crown,
  Shirt,
  Users,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getLayananBySlug } from "@/lib/layanan-data";
import NotFound from "@/pages/not-found";
import { useListPaket, getListPaketQueryKey, useListKategori, getListKategoriQueryKey } from "@workspace/api-client-react";

const iconMap = {
  Aperture,
  Camera,
  Heart,
  PartyPopper,
};

const photoboxSpots = [
  {
    nama: "Photobox Retro",
    deskripsi: "Vibes vintage 90an dengan poster dinding dan latar warm. Cocok buat squad goals!",
    icon: Film,
    warna: "bg-amber-500/10 text-amber-700 border-amber-200",
  },
  {
    nama: "Photobox Cinema",
    deskripsi: "Latar bertemakan bioskop klasik, dengan tata cahaya sinematik dan moody.",
    icon: Aperture,
    warna: "bg-rose-500/10 text-rose-700 border-rose-200",
  },
  {
    nama: "Photobox Blue",
    deskripsi: "Latar biru bersih dengan lighting clean — minimalis, modern, dan instagrammable.",
    icon: Camera,
    warna: "bg-blue-500/10 text-blue-700 border-blue-200",
  },
];

const aksesoris = [
  { nama: "Kostum Tematik", icon: Shirt, ket: "Costume tema retro, formal, casual (biaya tambahan)" },
  { nama: "Kacamata Lucu", icon: Glasses, ket: "Berbagai bentuk & warna untuk gaya seru" },
  { nama: "Bando & Mahkota", icon: Crown, ket: "Aksesoris kepala buat tambah aesthetic" },
  { nama: "Props Lainnya", icon: Sparkles, ket: "Tulisan papan, balon, bunga, dan banyak lagi" },
];

const studioServices = [
  { icon: Users, label: "Family Portrait", ket: "Foto keluarga lengkap dengan koreografi & arahan pose." },
  { icon: GraduationCap, label: "Wisuda", ket: "Foto wisuda solo, bersama keluarga, atau geng wisuda." },
  { icon: Heart, label: "Maternity & Newborn", ket: "Sesi lembut untuk momen kehamilan & bayi baru lahir." },
];

export default function LayananDetail() {
  const params = useParams<{ slug: string }>();
  const layanan = getLayananBySlug(params.slug ?? "");

  const { data: kategoriList } = useListKategori({ query: { queryKey: getListKategoriQueryKey() } });
  const { data: paketList, isLoading: loadingPaket } = useListPaket({ query: { queryKey: getListPaketQueryKey() } });

  if (!layanan) return <NotFound />;

  const targetKategori = (Array.isArray(kategoriList) ? kategoriList : []).find((k) => k.nama.toLowerCase() === layanan.filter.toLowerCase());
  const Icon = iconMap[layanan.iconName];
  const relatedPakets = (Array.isArray(paketList) ? paketList : [])
    .filter((p) => (targetKategori ? p.kategoriId === targetKategori.id : false))
    .slice(0, 3);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className={`bg-gradient-to-br ${layanan.warna} border-b border-border py-16`}>
        <div className="container mx-auto px-4">
          <Link href="/layanan" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-6">
            <ArrowLeft size={16} className="mr-1" /> Kembali ke Layanan
          </Link>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div>
              <Badge className="mb-4 bg-background/80 text-foreground hover:bg-background border-0">
                <Icon className="mr-1 h-3 w-3" /> {layanan.tagline}
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold mb-5">
                {layanan.nama.split(" ").slice(0, -1).join(" ")}{" "}
                <span className="text-primary italic">{layanan.nama.split(" ").slice(-1)}</span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed mb-6">{layanan.longDescription}</p>
              <div className="flex flex-wrap gap-3">
                <Link href={`/paket?kategori=${encodeURIComponent(layanan.filter)}`}>
                  <Button size="lg" className="rounded-full">
                    Lihat Paket <ArrowRight size={16} className="ml-1" />
                  </Button>
                </Link>
                <Link href="/booking">
                  <Button size="lg" variant="outline" className="rounded-full bg-background/60">
                    Booking Sekarang
                  </Button>
                </Link>
              </div>
            </div>
            <div className="rounded-3xl overflow-hidden bg-muted aspect-[4/3] border border-border shadow-lg">
              <img src={layanan.hero} alt={layanan.nama} className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* Detail features */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mb-10">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Apa yang Anda Dapatkan</h2>
          <p className="text-muted-foreground">Semua yang termasuk dalam layanan {layanan.nama.toLowerCase()}.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {layanan.detail.map((d) => (
            <Card key={d.judul} className="border-border hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Check size={20} />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{d.judul}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{d.isi}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Photobox-only sections */}
      {layanan.slug === "photobox" && (
        <>
          <section className="bg-card border-y border-border py-16">
            <div className="container mx-auto px-4">
              <div className="max-w-2xl mb-10">
                <Badge className="mb-3 bg-rose-500/10 text-rose-700 hover:bg-rose-500/15 border-0">
                  3 Spot Berbeda
                </Badge>
                <h2 className="text-2xl md:text-3xl font-bold mb-3">Pilih Spot Favoritmu</h2>
                <p className="text-muted-foreground">Setiap spot punya karakter visual yang khas.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {photoboxSpots.map((spot) => {
                  const SpotIcon = spot.icon;
                  return (
                    <Card key={spot.nama} className="border-border hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className={`h-12 w-12 rounded-xl border flex items-center justify-center mb-4 ${spot.warna}`}>
                          <SpotIcon size={22} />
                        </div>
                        <h3 className="text-lg font-bold mb-2">{spot.nama}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{spot.deskripsi}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="container mx-auto px-4 py-16">
            <div className="bg-card rounded-2xl border border-border p-6 md:p-8">
              <div className="flex items-start gap-3 mb-6">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-1">Aksesoris & Kostum</h3>
                  <p className="text-sm text-muted-foreground">
                    Lengkapi gaya kamu dengan koleksi aksesoris kami. Sebagian gratis, kostum tematik dikenakan biaya tambahan
                    sesuai paket.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {aksesoris.map((a) => {
                  const AIcon = a.icon;
                  return (
                    <div key={a.nama} className="rounded-xl border border-border bg-background p-4 hover:border-primary/40 transition-colors">
                      <AIcon size={22} className="text-primary mb-2" />
                      <p className="font-semibold text-sm mb-1">{a.nama}</p>
                      <p className="text-xs text-muted-foreground leading-snug">{a.ket}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </>
      )}

      {/* Studio-only section */}
      {layanan.slug === "studio" && (
        <section className="bg-card border-y border-border py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mb-10">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">Pilihan Sesi Studio</h2>
              <p className="text-muted-foreground">Berbagai jenis sesi yang bisa Anda booking.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {studioServices.map((s) => {
                const SIcon = s.icon;
                return (
                  <Card key={s.label} className="border-border">
                    <CardContent className="p-6">
                      <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-700 border border-blue-200 flex items-center justify-center mb-4">
                        <SIcon size={22} />
                      </div>
                      <h3 className="text-lg font-bold mb-2">{s.label}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{s.ket}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Related pakets */}
      {(loadingPaket || relatedPakets.length > 0) && (
        <section className="bg-card border-y border-border py-16">
          <div className="container mx-auto px-4">
            <div className="flex items-end justify-between mb-8 gap-4 flex-wrap">
              <div>
                <Badge className="mb-3 bg-primary/10 text-primary hover:bg-primary/15 border-0">Paket Terkait</Badge>
                <h2 className="text-2xl md:text-3xl font-bold mb-2">Paket {layanan.nama} Pilihan</h2>
                <p className="text-muted-foreground">Pilih paket yang paling sesuai dengan kebutuhan Anda.</p>
              </div>
              <Link href={`/paket?kategori=${encodeURIComponent(layanan.filter)}`}>
                <Button variant="outline" className="rounded-full">Lihat Semua <ArrowRight size={14} className="ml-1" /></Button>
              </Link>
            </div>
            {loadingPaket ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedPakets.map((p) => (
                  <Card key={p.id} className="border-border hover:shadow-md transition-shadow flex flex-col">
                    <CardContent className="p-6 flex flex-col flex-1">
                      <div className="flex items-center justify-between mb-3">
                        {p.isPopuler ? <Badge className="bg-primary text-primary-foreground">Populer</Badge> : <span />}
                        <span className="text-xs text-muted-foreground">{p.durasiSesi} menit</span>
                      </div>
                      <h3 className="text-lg font-bold mb-2">{p.namaPaket}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-3 flex-1">{p.deskripsi}</p>
                      <div className="flex items-end justify-between mt-auto">
                        <div>
                          <p className="text-xs text-muted-foreground">Mulai dari</p>
                          <p className="text-xl font-bold text-primary">Rp {p.harga.toLocaleString("id-ID")}</p>
                        </div>
                        <Link href={`/booking?paketId=${p.id}`}>
                          <Button size="sm" className="rounded-full">Booking <ArrowRight size={14} className="ml-1" /></Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="container mx-auto px-4 py-16">
        <div className="rounded-3xl bg-primary text-primary-foreground p-10 md:p-14 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 80%, white 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }} />
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Siap booking {layanan.nama.toLowerCase()}?</h2>
            <p className="opacity-90 mb-8">Pilih paket yang sesuai atau diskusikan kebutuhan custom dengan tim kami.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href={`/paket?kategori=${encodeURIComponent(layanan.filter)}`}>
                <Button size="lg" variant="secondary" className="rounded-full">
                  <Sparkles className="mr-2 h-4 w-4" /> Lihat Paket Tersedia
                </Button>
              </Link>
              <Link href="/booking">
                <Button size="lg" variant="outline" className="rounded-full bg-transparent border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                  Booking Langsung
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
