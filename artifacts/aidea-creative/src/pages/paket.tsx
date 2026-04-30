import { useEffect, useState } from "react";
import { Link, useSearch } from "wouter";
import { useListPaket, getListPaketQueryKey, useListKategori, getListKategoriQueryKey, useAiRecommend } from "@workspace/api-client-react";
import { Clock, Check, Sparkles, Filter, Loader2, Camera } from "lucide-react";
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
        acara: acara || undefined
      }
    });
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="bg-card py-10 sm:py-16 md:py-20 border-b border-border">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold mb-4 sm:mb-6">Pilih <span className="text-primary italic">Paket</span> Anda</h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Berbagai pilihan paket fotografi yang dirancang untuk memenuhi kebutuhan momen spesial Anda dengan harga transparan.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8 sm:py-12 lg:py-16 flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
        
        {/* Main Content - List Paket */}
        <div className="lg:w-2/3 order-2 lg:order-1">
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <h2 className="text-2xl font-serif font-bold">Katalog Paket</h2>
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              <Filter size={16} className="text-muted-foreground mr-2 shrink-0" />
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                    filter === cat 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-6">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-6 bg-muted rounded w-1/4 mb-4"></div>
                    <div className="h-8 bg-muted rounded w-1/2 mb-4"></div>
                    <div className="h-4 bg-muted rounded w-full mb-8"></div>
                    <div className="h-10 bg-muted rounded w-1/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredPaket.length > 0 ? (
            <div className="space-y-6">
              {filteredPaket.map(paket => {
                const isRecommended = recommendMutation.isSuccess && 
                  Array.isArray(recommendMutation.data?.paketDisarankan) &&
                  recommendMutation.data.paketDisarankan.includes(paket.id);
                const kategoriNama = kategoriMap[paket.kategoriId ?? ""] ?? "Layanan";
                
                return (
                  <Card 
                    key={paket.id} 
                    className={`overflow-hidden transition-all duration-300 ${
                      isRecommended ? "border-primary shadow-lg ring-1 ring-primary/20 ring-offset-2" : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div className="flex flex-col md:flex-row">
                      <div className="md:w-1/4 h-48 md:h-auto bg-muted flex items-center justify-center">
                        <Camera className="text-muted-foreground opacity-20" size={40} />
                      </div>
                      <CardContent className="p-6 md:p-8 flex-1 flex flex-col md:w-3/4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-sm font-medium text-primary">{kategoriNama}</span>
                              {paket.isPopuler && <Badge variant="secondary" className="text-xs">Populer</Badge>}
                              {isRecommended && <Badge className="bg-primary text-primary-foreground text-xs"><Sparkles size={12} className="mr-1" /> Rekomendasi AI</Badge>}
                            </div>
                            <h3 className="text-2xl font-serif font-bold">{paket.namaPaket}</h3>
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-2xl font-bold text-foreground">Rp {paket.harga.toLocaleString('id-ID')}</div>
                            <div className="text-sm text-muted-foreground flex items-center justify-end gap-1 mt-1">
                              <Clock size={14} /> {paket.durasiSesi} menit
                            </div>
                          </div>
                        </div>
                        
                        <p className="text-muted-foreground my-4">{paket.deskripsi}</p>
                        
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 mb-8">
                          {Array.isArray(paket.fasilitas) && paket.fasilitas.map((f, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm">
                              <Check size={16} className="text-primary shrink-0 mt-0.5" />
                              <span className="text-foreground">{f}</span>
                            </div>
                          ))}
                        </div>
                        
                        <div className="mt-auto pt-4 flex items-center justify-between">
                          <div className="text-sm text-muted-foreground">{paket.jumlahFoto} foto termasuk</div>
                          <Link href={`/booking?paket=${paket.id}`}>
                            <Button>Pilih Paket Ini</Button>
                          </Link>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 border border-dashed border-border rounded-xl">
              <p className="text-muted-foreground">Tidak ada paket untuk kategori ini.</p>
            </div>
          )}
        </div>

        {/* Sidebar - AI Recommend */}
        <div className="lg:w-1/3 order-1 lg:order-2 w-full lg:sticky lg:top-24">
          <Card className="bg-primary/5 border-primary/20 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40"></div>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg leading-tight">Asisten Cerdas</h3>
                  <p className="text-xs text-muted-foreground">Rekomendasi paket AI</p>
                </div>
              </div>

              <form onSubmit={handleRecommend} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="kebutuhan">Kebutuhan Anda *</Label>
                  <Textarea 
                    id="kebutuhan" 
                    placeholder="Contoh: Saya butuh foto prewedding outdoor dengan tema rustic..."
                    className="resize-none h-24 bg-background"
                    value={kebutuhan}
                    onChange={(e) => setKebutuhan(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budget">Maksimal Budget (Opsional)</Label>
                  <Input 
                    id="budget" 
                    type="number" 
                    placeholder="Contoh: 1500000"
                    className="bg-background"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="acara">Jenis Acara (Opsional)</Label>
                  <Input 
                    id="acara" 
                    placeholder="Contoh: Pernikahan, Wisuda, Ulang Tahun"
                    className="bg-background"
                    value={acara}
                    onChange={(e) => setAcara(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full mt-2" disabled={!kebutuhan || recommendMutation.isPending}>
                  {recommendMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menganalisis...</>
                  ) : (
                    "Dapatkan Rekomendasi"
                  )}
                </Button>
              </form>

              {recommendMutation.isSuccess && (
                <div className="mt-6 p-4 bg-background rounded-lg border border-border/50 text-sm shadow-sm relative animate-in fade-in slide-in-from-bottom-4">
                  <div className="absolute -top-2 left-6 w-4 h-4 bg-background border-t border-l border-border/50 rotate-45"></div>
                  <p className="text-foreground relative z-10 whitespace-pre-wrap">{recommendMutation.data.rekomendasi}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
