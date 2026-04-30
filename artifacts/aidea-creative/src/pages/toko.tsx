import { useState } from "react";
import { useListProduk } from "@workspace/api-client-react";
import { ShoppingBag, Search, ChevronLeft, ChevronRight, X, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const kategoriLabel: Record<string, string> = {
  cetak_foto: "Cetak Foto",
  frame: "Frame / Bingkai",
  album: "Album",
  photobook: "Photobook",
  merchandise: "Merchandise",
};

type Produk = {
  id: string;
  namaProduk: string;
  kategori: string;
  ukuran?: string | null;
  harga: number;
  stok: number;
  deskripsi?: string | null;
  gambarUrl?: string[] | null;
};

function ProductDetail({ produk, onClose }: { produk: Produk; onClose: () => void }) {
  const images = (produk.gambarUrl ?? []).filter(Boolean);
  const [idx, setIdx] = useState(0);
  const total = images.length;
  const current = images[idx];

  const prev = () => setIdx((i) => (i - 1 + total) % total);
  const next = () => setIdx((i) => (i + 1) % total);

  const waText = encodeURIComponent(`Halo, saya tertarik dengan produk *${produk.namaProduk}* (Rp ${produk.harga.toLocaleString("id-ID")}). Apakah masih tersedia?`);
  const waHref = `https://wa.me/?text=${waText}`;

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden gap-0 max-h-[90vh] overflow-y-auto">
        <DialogTitle className="sr-only">{produk.namaProduk}</DialogTitle>
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="relative bg-muted aspect-square md:aspect-auto md:min-h-[400px] flex items-center justify-center">
            {current ? (
              <img src={current} alt={produk.namaProduk} className="max-h-full max-w-full object-contain p-6" />
            ) : (
              <ShoppingBag className="text-muted-foreground opacity-20" size={80} />
            )}
            {total > 1 && (
              <>
                <button
                  type="button"
                  onClick={prev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background border border-border rounded-full h-9 w-9 flex items-center justify-center shadow"
                  aria-label="Sebelumnya"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={next}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background border border-border rounded-full h-9 w-9 flex items-center justify-center shadow"
                  aria-label="Selanjutnya"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur px-2 py-0.5 rounded-full text-xs border border-border">
                  {idx + 1} / {total}
                </div>
              </>
            )}
            {produk.stok === 0 && (
              <div className="absolute top-3 left-3 bg-destructive text-destructive-foreground px-2 py-1 text-xs font-bold rounded">
                Habis Terjual
              </div>
            )}
          </div>

          <div className="p-6 flex flex-col">
            <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">
              {kategoriLabel[produk.kategori] ?? produk.kategori}
              {produk.ukuran && ` · ${produk.ukuran}`}
            </div>
            <h2 className="text-2xl font-serif font-bold leading-tight mb-3">{produk.namaProduk}</h2>
            <div className="text-2xl font-bold text-primary mb-4">Rp {produk.harga.toLocaleString("id-ID")}</div>
            <p className="text-sm text-muted-foreground whitespace-pre-line mb-4">{produk.deskripsi || "Tidak ada deskripsi."}</p>
            <div className="text-xs text-muted-foreground mb-6">
              {produk.stok > 0 ? <>Stok tersedia: <span className="font-semibold text-foreground">{produk.stok}</span></> : "Stok habis"}
            </div>

            {total > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                {images.map((src, i) => (
                  <button
                    key={`${src}-${i}`}
                    type="button"
                    onClick={() => setIdx(i)}
                    className={`shrink-0 w-14 h-14 rounded-md overflow-hidden border-2 ${
                      i === idx ? "border-primary" : "border-border opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div className="mt-auto flex gap-2 pt-4 border-t border-border">
              <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none">
                <X className="h-4 w-4 mr-1" /> Tutup
              </Button>
              <Button asChild className="flex-1" disabled={produk.stok === 0}>
                <a href={waHref} target="_blank" rel="noreferrer">
                  <Phone className="h-4 w-4 mr-1" /> Pesan via WhatsApp
                </a>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Toko() {
  const { data: produkList, isLoading } = useListProduk();
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState<Produk | null>(null);

  const produkArray = (Array.isArray(produkList) ? produkList : []) as Produk[];
  const filteredProducts = produkArray.filter(p =>
    p.namaProduk.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.kategori.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen container mx-auto px-4 py-10 sm:py-16">
      <div className="flex flex-col md:flex-row justify-between md:items-end mb-8 sm:mb-12 gap-4 sm:gap-6">
        <div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold mb-3">Toko <span className="text-primary italic">Produk</span></h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-xl">
            Lengkapi kenangan Anda dengan produk cetak foto, bingkai elegan, dan album eksklusif berkualitas premium.
          </p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            placeholder="Cari produk..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
        {isLoading ? (
          Array(8).fill(0).map((_, i) => (
            <Card key={i} className="overflow-hidden border-border">
              <Skeleton className="h-40 sm:h-64 w-full rounded-none" />
              <CardContent className="p-3 sm:p-5">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/4 mb-3" />
                <Skeleton className="h-9 w-full" />
              </CardContent>
            </Card>
          ))
        ) : filteredProducts.length > 0 ? (
          filteredProducts.map(produk => {
            const gambarPertama = Array.isArray(produk.gambarUrl) ? produk.gambarUrl[0] : null;
            const totalGambar = Array.isArray(produk.gambarUrl) ? produk.gambarUrl.filter(Boolean).length : 0;
            return (
              <Card
                key={produk.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelected(produk)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(produk); }
                }}
                className="overflow-hidden border-border hover:border-primary/50 hover:shadow-md transition-all flex flex-col cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <div className="h-40 sm:h-64 bg-muted relative p-3 sm:p-4 flex items-center justify-center">
                  {gambarPertama ? (
                    <img src={gambarPertama} alt={produk.namaProduk} className="max-w-full max-h-full object-contain mix-blend-multiply drop-shadow-sm" />
                  ) : (
                    <ShoppingBag className="text-muted-foreground opacity-20" size={48} />
                  )}
                  {totalGambar > 1 && (
                    <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur text-foreground border border-border px-1.5 py-0.5 text-[10px] font-medium rounded">
                      +{totalGambar - 1} foto
                    </div>
                  )}
                  {produk.stok < 5 && produk.stok > 0 && (
                    <div className="absolute top-2 left-2 bg-destructive/10 text-destructive px-2 py-0.5 text-[10px] sm:text-xs font-bold rounded">
                      Sisa {produk.stok}
                    </div>
                  )}
                  {produk.stok === 0 && (
                    <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center z-10">
                      <span className="bg-destructive text-destructive-foreground px-2 py-1 text-xs font-bold rounded">Habis</span>
                    </div>
                  )}
                </div>
                <CardContent className="p-3 sm:p-5 flex flex-col flex-1">
                  <div className="text-[10px] sm:text-xs text-muted-foreground mb-1 uppercase tracking-wider">
                    {kategoriLabel[produk.kategori] ?? produk.kategori}
                    {produk.ukuran && ` · ${produk.ukuran}`}
                  </div>
                  <h3 className="font-bold text-sm sm:text-lg mb-1 leading-tight line-clamp-2">{produk.namaProduk}</h3>
                  <p className="hidden sm:block text-sm text-muted-foreground line-clamp-2 mb-4">{produk.deskripsi}</p>
                  <div className="mt-auto pt-2 sm:pt-4 flex items-center justify-between gap-2">
                    <div className="font-bold text-sm sm:text-lg">Rp {produk.harga.toLocaleString('id-ID')}</div>
                    <Button
                      size="sm"
                      disabled={produk.stok === 0}
                      onClick={(e) => { e.stopPropagation(); setSelected(produk); }}
                      className="px-3"
                    >
                      Beli
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full py-20 text-center text-muted-foreground border border-dashed border-border rounded-xl">
            Produk tidak ditemukan. Coba kata kunci lain.
          </div>
        )}
      </div>

      {selected && <ProductDetail produk={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
