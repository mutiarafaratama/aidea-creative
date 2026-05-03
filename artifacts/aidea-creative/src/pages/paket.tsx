import { useEffect, useState } from "react";
import { Link, useSearch } from "wouter";
import { useListPaket, useListKategori, useAiRecommend } from "@workspace/api-client-react";
import { Clock, Check, Sparkles, Loader2, Camera, ImageIcon, ChevronRight, Star, X } from "lucide-react";
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
  const [aiSheetOpen, setAiSheetOpen] = useState(false);

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

      <div className="container mx-auto px-4 pt-8 pb-10 md:pt-10 md:pb-14">

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

          {/* Sidebar AI — desktop only */}
          <div className="hidden lg:block lg:w-72 xl:w-80 shrink-0 lg:sticky lg:top-24 max-h-[calc(100vh-7rem)] flex flex-col">
            <Card className="overflow-hidden border-primary/20 flex flex-col max-h-full">
              <div className="h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40 shrink-0" />
              <CardContent className="p-5 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
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
          </div>

        </div>
      </div>

      {/* Mobile: floating AI button — icon-only circle, bottom-left */}
      <button
        onClick={() => setAiSheetOpen(true)}
        className="lg:hidden fixed bottom-6 left-4 z-40 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center"
        aria-label="Buka Asisten Cerdas"
      >
        <Sparkles size={20} />
      </button>

      {/* Mobile: bottom sheet overlay */}
      {aiSheetOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <button
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setAiSheetOpen(false)}
            aria-label="Tutup"
          />

          {/* Sheet panel */}
          <div className="relative bg-background rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-300">
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary">
                  <Sparkles size={15} />
                </div>
                <div>
                  <p className="font-semibold text-sm leading-tight">Asisten Cerdas</p>
                  <p className="text-[10px] text-muted-foreground">Rekomendasi paket via AI</p>
                </div>
              </div>
              <button
                onClick={() => setAiSheetOpen(false)}
                className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-muted"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
              <form onSubmit={(e) => { handleRecommend(e); }} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="m-kebutuhan" className="text-xs font-medium">Kebutuhan Anda *</Label>
                  <Textarea
                    id="m-kebutuhan"
                    placeholder="Contoh: Foto prewedding outdoor rustic untuk 2 orang..."
                    className="resize-none h-24 text-sm bg-muted/40"
                    value={kebutuhan}
                    onChange={(e) => setKebutuhan(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="m-budget" className="text-xs font-medium">Maksimal Budget (Opsional)</Label>
                  <Input
                    id="m-budget"
                    type="number"
                    placeholder="1500000"
                    className="text-sm bg-muted/40"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="m-acara" className="text-xs font-medium">Jenis Acara (Opsional)</Label>
                  <Input
                    id="m-acara"
                    placeholder="Pernikahan, Wisuda, Ulang Tahun..."
                    className="text-sm bg-muted/40"
                    value={acara}
                    onChange={(e) => setAcara(e.target.value)}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full rounded-full"
                  disabled={!kebutuhan || recommendMutation.isPending}
                >
                  {recommendMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menganalisis...</>
                  ) : (
                    <><Sparkles size={14} className="mr-2" /> Rekomendasikan Paket</>
                  )}
                </Button>
              </form>

              {recommendMutation.isSuccess && (
                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/15 text-sm text-foreground leading-relaxed">
                  <p className="font-semibold text-primary mb-1.5 flex items-center gap-1.5">
                    <Sparkles size={13} /> Hasil Analisis
                  </p>
                  <p className="whitespace-pre-wrap text-xs">{recommendMutation.data.rekomendasi}</p>
                </div>
              )}

              {/* Safe area spacer */}
              <div className="h-4" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
