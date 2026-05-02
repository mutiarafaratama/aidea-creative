import { useEffect, useState } from "react";
import { Link, useSearch } from "wouter";
import { useListPaket, useListKategori, useAiRecommend } from "@workspace/api-client-react";
import { Clock, Check, Sparkles, Loader2, Camera, Users, ImageIcon, ChevronRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export default function Paket() {
  const { data: paketList, isLoading } = useListPaket();
  const { data: kategoriList } = useListKategori();
  const search = useSearch();
  const [filter, setFilter] = useState<string>("Semua");

  useEffect(() => {
    const params = new URLSearchParams(search);
    const k = params.get("kategori");
    if (k) setFilter(k);
  }, [search]);

  const [kebutuhan, setKebutuhan] = useState("");
  const [budget, setBudget] = useState("");
  const [acara, setAcara] = useState("");

  const recommendMutation = useAiRecommend();

  const paketArray = Array.isArray(paketList) ? paketList : [];
  const kategoriArray = Array.isArray(kategoriList) ? kategoriList : [];
  const kategoriMap = Object.fromEntries(kategoriArray.map(k => [k.id, k.nama]));
  const categories = ["Semua", ...kategoriArray.map(k => k.nama)];

  const filteredPaket = paketArray.filter(p => {
    if (filter === "Semua") return true;
    return kategoriMap[p.kategoriId ?? ""] === filter;
  });

  const handleRecommend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kebutuhan) return;
    recommendMutation.mutate({
      data: {
        kebutuhan,
        budget: budget ? parseInt(budget) : undefined,
        acara: acara || undefined,
      },
    });
  };

  return (
    <div className="min-h-screen bg-background">

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/5 border-b border-border py-16 md:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-4 py-1.5 rounded-full mb-5 border border-primary/20">
            <Camera size={14} /> Studio Foto Profesional
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold mb-4 leading-tight">
            Pilih <span className="text-primary italic">Paket</span> Anda
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto">
            Harga transparan, hasil premium. Setiap paket dirancang untuk momen spesial Anda.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-10 md:py-14">

        {/* Filter tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-8 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 border ${
                filter === cat
                  ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20"
                  : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-10 items-start">

          {/* Paket grid */}
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {[1, 2, 3, 4].map(i => (
                  <Card key={i} className="animate-pulse overflow-hidden">
                    <div className="h-44 bg-muted" />
                    <CardContent className="p-5 space-y-3">
                      <div className="h-4 bg-muted rounded w-1/3" />
                      <div className="h-6 bg-muted rounded w-2/3" />
                      <div className="h-4 bg-muted rounded w-full" />
                      <div className="h-9 bg-muted rounded w-1/2 mt-4" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredPaket.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {filteredPaket.map(paket => {
                  const isRecommended =
                    recommendMutation.isSuccess &&
                    Array.isArray(recommendMutation.data?.paketDisarankan) &&
                    recommendMutation.data.paketDisarankan.includes(paket.id);
                  const kategoriNama = kategoriMap[paket.kategoriId ?? ""] ?? "Layanan";

                  return (
                    <Card
                      key={paket.id}
                      className={`group overflow-hidden flex flex-col transition-all duration-300 ${
                        isRecommended
                          ? "border-primary ring-2 ring-primary/20 shadow-lg shadow-primary/10"
                          : "border-border hover:border-primary/30 hover:shadow-md"
                      }`}
                    >
                      {/* Image area */}
                      <div className="relative h-44 bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center overflow-hidden">
                        <Camera className="text-muted-foreground/20" size={52} />

                        {/* Category badge */}
                        <span className="absolute top-3 left-3 bg-background/90 backdrop-blur-sm text-foreground text-[11px] font-semibold px-2.5 py-1 rounded-full border border-border/60">
                          {kategoriNama}
                        </span>

                        {/* Badges */}
                        <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
                          {paket.isPopuler && (
                            <span className="flex items-center gap-1 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                              <Star size={9} fill="currentColor" /> Populer
                            </span>
                          )}
                          {isRecommended && (
                            <span className="flex items-center gap-1 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                              <Sparkles size={9} /> AI Pick
                            </span>
                          )}
                        </div>

                        {/* Price strip */}
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-3 flex items-end justify-between">
                          <span className="text-white font-bold text-lg leading-none">
                            Rp {paket.harga.toLocaleString("id-ID")}
                          </span>
                          <span className="flex items-center gap-1 text-white/80 text-xs">
                            <Clock size={11} /> {paket.durasiSesi} menit
                          </span>
                        </div>
                      </div>

                      {/* Body */}
                      <CardContent className="p-5 flex flex-col flex-1">
                        <h3 className="font-serif font-bold text-xl leading-snug mb-1.5">{paket.namaPaket}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{paket.deskripsi}</p>

                        {/* Stats row */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                          <span className="flex items-center gap-1.5">
                            <ImageIcon size={13} className="text-primary" /> {paket.jumlahFoto} foto
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock size={13} className="text-primary" /> {paket.durasiSesi} menit
                          </span>
                        </div>

                        {/* Facilities */}
                        {Array.isArray(paket.fasilitas) && paket.fasilitas.length > 0 && (
                          <ul className="space-y-1.5 mb-5">
                            {paket.fasilitas.slice(0, 4).map((f, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                                <Check size={13} className="text-primary shrink-0 mt-0.5" />
                                {f}
                              </li>
                            ))}
                            {paket.fasilitas.length > 4 && (
                              <li className="text-xs text-muted-foreground pl-5">+{paket.fasilitas.length - 4} lainnya</li>
                            )}
                          </ul>
                        )}

                        <div className="mt-auto">
                          <Link href={`/booking?paket=${paket.id}`}>
                            <Button className="w-full rounded-full group-hover:bg-primary/90 transition-colors">
                              Pilih Paket <ChevronRight size={15} className="ml-1" />
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20 border border-dashed border-border rounded-2xl">
                <Camera className="mx-auto mb-3 text-muted-foreground/30" size={40} />
                <p className="text-muted-foreground text-sm">Tidak ada paket untuk kategori ini.</p>
              </div>
            )}
          </div>

          {/* Sidebar AI */}
          <div className="lg:w-72 xl:w-80 w-full shrink-0 lg:sticky lg:top-24">
            <Card className="overflow-hidden border-primary/20">
              <div className="h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-primary shrink-0">
                    <Sparkles size={17} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm leading-tight">Asisten Cerdas</h3>
                    <p className="text-[11px] text-muted-foreground">Rekomendasi paket via AI</p>
                  </div>
                </div>

                <form onSubmit={handleRecommend} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="kebutuhan" className="text-xs">Kebutuhan Anda *</Label>
                    <Textarea
                      id="kebutuhan"
                      placeholder="Contoh: Foto prewedding outdoor rustic untuk 2 orang..."
                      className="resize-none h-20 text-sm bg-background"
                      value={kebutuhan}
                      onChange={(e) => setKebutuhan(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="budget" className="text-xs">Maksimal Budget (Opsional)</Label>
                    <Input
                      id="budget"
                      type="number"
                      placeholder="1500000"
                      className="text-sm bg-background"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="acara" className="text-xs">Jenis Acara (Opsional)</Label>
                    <Input
                      id="acara"
                      placeholder="Pernikahan, Wisuda, Ulang Tahun..."
                      className="text-sm bg-background"
                      value={acara}
                      onChange={(e) => setAcara(e.target.value)}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full rounded-full text-sm"
                    disabled={!kebutuhan || recommendMutation.isPending}
                  >
                    {recommendMutation.isPending ? (
                      <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Menganalisis...</>
                    ) : (
                      <><Sparkles size={13} className="mr-2" /> Rekomendasikan Paket</>
                    )}
                  </Button>
                </form>

                {recommendMutation.isSuccess && (
                  <div className="mt-4 p-3.5 bg-primary/5 rounded-xl border border-primary/15 text-xs text-foreground leading-relaxed animate-in fade-in slide-in-from-bottom-2">
                    <p className="font-semibold text-primary mb-1 flex items-center gap-1">
                      <Sparkles size={11} /> Hasil Analisis
                    </p>
                    <p className="whitespace-pre-wrap">{recommendMutation.data.rekomendasi}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* CTA card */}
            <Card className="mt-4 bg-primary text-primary-foreground border-0 overflow-hidden">
              <CardContent className="p-5">
                <h4 className="font-semibold text-sm mb-1">Bingung pilih paket?</h4>
                <p className="text-xs text-primary-foreground/75 mb-4 leading-relaxed">
                  Hubungi kami via WhatsApp dan konsultasikan kebutuhan foto Anda secara langsung.
                </p>
                <a
                  href="https://wa.me/6281234567890"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="secondary" className="w-full rounded-full text-sm">
                    Chat WhatsApp
                  </Button>
                </a>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
