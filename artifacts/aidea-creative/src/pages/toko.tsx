import { useState } from "react";
import { useListProduk } from "@workspace/api-client-react";
import { ShoppingBag, Search, ChevronLeft, ChevronRight, X, ShoppingCart, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useCart } from "@/contexts/cart-context";
import { CartButton, CartDrawer } from "@/components/cart-drawer";
import { AppImage } from "@/components/app-image";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile.tsx";

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

// ─── Shared product detail content ─────────────────────────────────────────
function ProductDetailContent({
  produk,
  onClose,
  variant,
}: {
  produk: Produk;
  onClose: () => void;
  variant: "sheet" | "dialog";
}) {
  const { addToCart, items, setIsOpen: setCartOpen } = useCart();
  const { toast } = useToast();
  const images = (produk.gambarUrl ?? []).filter(Boolean);
  const [idx, setIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const total = images.length;
  const current = images[idx];
  const inCart = items.find((i) => i.produkId === produk.id);

  const prev = () => setIdx((i) => (i - 1 + total) % total);
  const next = () => setIdx((i) => (i + 1) % total);

  const handleAddToCart = () => {
    addToCart(
      {
        produkId: produk.id,
        namaProduk: produk.namaProduk,
        harga: produk.harga,
        stok: produk.stok,
        gambarUrl: images[0] ?? null,
      },
      qty,
    );
    onClose();
    setCartOpen(true);
  };

  if (variant === "sheet") {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Image gallery */}
        <div className="relative bg-muted shrink-0" style={{ height: "52vw", minHeight: 200, maxHeight: 300 }}>
          {current ? (
            <AppImage
              src={current}
              alt={produk.namaProduk}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingBag className="text-muted-foreground/20" size={56} />
            </div>
          )}

          {/* Prev / Next */}
          {total > 1 && (
            <>
              <button
                type="button"
                onClick={prev}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 bg-background/85 backdrop-blur border border-border/60 rounded-full h-9 w-9 flex items-center justify-center shadow-md"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={next}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-background/85 backdrop-blur border border-border/60 rounded-full h-9 w-9 flex items-center justify-center shadow-md"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          {/* Out of stock overlay */}
          {produk.stok === 0 && (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center">
              <span className="bg-destructive text-destructive-foreground px-3 py-1 text-xs font-bold rounded-full">
                Habis Terjual
              </span>
            </div>
          )}

          {/* Dot indicators */}
          {total > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  style={{
                    width: i === idx ? 18 : 6,
                    height: 6,
                    borderRadius: 999,
                    background: i === idx ? "hsl(var(--primary))" : "rgba(0,0,0,0.25)",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    transition: "all 0.25s ease",
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Scrollable info area */}
        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-2">
          {/* Category + size badges */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
              {kategoriLabel[produk.kategori] ?? produk.kategori}
            </span>
            {produk.ukuran && (
              <span className="text-[11px] font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                {produk.ukuran}
              </span>
            )}
            {produk.stok > 0 && produk.stok < 5 && (
              <span className="text-[11px] font-bold bg-destructive/10 text-destructive px-2.5 py-1 rounded-full">
                Sisa {produk.stok}
              </span>
            )}
          </div>

          {/* Name + price */}
          <h2 className="text-xl font-bold leading-snug mb-1">{produk.namaProduk}</h2>
          <div className="text-2xl font-bold text-primary mb-3">
            Rp {produk.harga.toLocaleString("id-ID")}
          </div>

          {/* Description */}
          {produk.deskripsi && (
            <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed mb-3">
              {produk.deskripsi}
            </p>
          )}

          {/* Stock info */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
            <div className={`h-2 w-2 rounded-full ${produk.stok > 0 ? "bg-green-500" : "bg-destructive"}`} />
            {produk.stok > 0
              ? <span>Stok tersedia: <span className="font-semibold text-foreground">{produk.stok}</span></span>
              : <span className="text-destructive font-medium">Stok habis</span>
            }
          </div>

          {/* Thumbnail strip */}
          {total > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
              {images.map((src, i) => (
                <button
                  key={`${src}-${i}`}
                  type="button"
                  onClick={() => setIdx(i)}
                  className={`shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all ${
                    i === idx ? "border-primary shadow-sm shadow-primary/20" : "border-border opacity-60 hover:opacity-100"
                  }`}
                >
                  <AppImage src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Qty selector */}
          {produk.stok > 0 && (
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm text-muted-foreground">Jumlah:</span>
              <div className="flex items-center border border-border rounded-xl bg-muted/40">
                <button
                  type="button"
                  className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40 rounded-l-xl"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-10 text-center font-bold text-sm">{qty}</span>
                <button
                  type="button"
                  className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40 rounded-r-xl"
                  onClick={() => setQty((q) => Math.min(produk.stok, q + 1))}
                  disabled={qty >= produk.stok}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <span className="ml-auto text-base font-bold text-primary">
                Rp {(produk.harga * qty).toLocaleString("id-ID")}
              </span>
            </div>
          )}
        </div>

        {/* Pinned footer CTA */}
        <div className="shrink-0 px-5 pt-3 pb-6 border-t border-border bg-background">
          <Button
            className="w-full h-13 text-base font-semibold rounded-2xl shadow-lg shadow-primary/20"
            style={{ height: 52 }}
            disabled={produk.stok === 0}
            onClick={handleAddToCart}
          >
            <ShoppingCart className="h-5 w-5 mr-2" />
            {produk.stok === 0
              ? "Stok Habis"
              : inCart
                ? `Tambah Lagi — Rp ${(produk.harga * qty).toLocaleString("id-ID")}`
                : `Tambah ke Keranjang — Rp ${(produk.harga * qty).toLocaleString("id-ID")}`}
          </Button>
        </div>
      </div>
    );
  }

  // ── Desktop dialog layout (2-column) ──────────────────────────────────────
  return (
    <div className="grid grid-cols-1 md:grid-cols-2">
      <div className="relative bg-muted aspect-square md:aspect-auto md:min-h-[400px] flex items-center justify-center">
        {current ? (
          <AppImage src={current} alt={produk.namaProduk} className="max-h-full max-w-full object-contain p-6" />
        ) : (
          <ShoppingBag className="text-muted-foreground opacity-20" size={80} />
        )}
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background border border-border rounded-full h-9 w-9 flex items-center justify-center shadow"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background border border-border rounded-full h-9 w-9 flex items-center justify-center shadow"
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
        <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider flex items-center gap-2 flex-wrap">
          <span>{kategoriLabel[produk.kategori] ?? produk.kategori}</span>
          {produk.ukuran && (
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold normal-case text-[11px]">
              {produk.ukuran}
            </span>
          )}
        </div>
        <h2 className="text-2xl font-serif font-bold leading-tight mb-3">{produk.namaProduk}</h2>
        <div className="text-2xl font-bold text-primary mb-4">Rp {produk.harga.toLocaleString("id-ID")}</div>
        <p className="text-sm text-muted-foreground whitespace-pre-line mb-4">{produk.deskripsi || "Tidak ada deskripsi."}</p>
        <div className="text-xs text-muted-foreground mb-6">
          {produk.stok > 0
            ? <>Stok tersedia: <span className="font-semibold text-foreground">{produk.stok}</span></>
            : "Stok habis"}
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
                <AppImage src={src} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {produk.stok > 0 && (
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm text-muted-foreground">Jumlah:</span>
            <div className="flex items-center border border-border rounded-lg">
              <button
                type="button"
                className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1}
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center font-semibold text-sm">{qty}</span>
              <button
                type="button"
                className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40"
                onClick={() => setQty((q) => Math.min(produk.stok, q + 1))}
                disabled={qty >= produk.stok}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <span className="text-sm font-bold text-primary ml-auto">
              Rp {(produk.harga * qty).toLocaleString("id-ID")}
            </span>
          </div>
        )}

        <div className="mt-auto flex gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose} className="flex-none">
            <X className="h-4 w-4 mr-1" /> Tutup
          </Button>
          <Button
            className="flex-1"
            disabled={produk.stok === 0}
            onClick={handleAddToCart}
          >
            <ShoppingCart className="h-4 w-4 mr-1.5" />
            {inCart ? "Tambah Lagi" : "Tambah ke Keranjang"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── ProductDetail — bottom sheet on mobile, dialog on desktop ─────────────
function ProductDetail({ produk, onClose }: { produk: Produk; onClose: () => void }) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer
        open
        onOpenChange={(open) => { if (!open) onClose(); }}
        shouldScaleBackground={false}
      >
        <DrawerContent
          className="p-0 gap-0 outline-none rounded-t-3xl overflow-hidden"
          style={{ maxHeight: "92dvh" }}
        >
          <DrawerTitle className="sr-only">{produk.namaProduk}</DrawerTitle>
          <ProductDetailContent produk={produk} onClose={onClose} variant="sheet" />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden gap-0 max-h-[90vh] overflow-y-auto">
        <DialogTitle className="sr-only">{produk.namaProduk}</DialogTitle>
        <ProductDetailContent produk={produk} onClose={onClose} variant="dialog" />
      </DialogContent>
    </Dialog>
  );
}

// ─── Toko page ─────────────────────────────────────────────────────────────
export default function Toko() {
  const { data: produkList, isLoading } = useListProduk();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeKategori, setActiveKategori] = useState<string>("semua");
  const [selected, setSelected] = useState<Produk | null>(null);

  const produkArray = (Array.isArray(produkList) ? produkList : []) as Produk[];

  const kategoriOptions = [
    { value: "semua", label: "Semua" },
    ...Object.entries(kategoriLabel).map(([v, l]) => ({ value: v, label: l })),
  ];

  const filteredProducts = produkArray.filter((p) => {
    const matchSearch =
      p.namaProduk.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.kategori.toLowerCase().includes(searchQuery.toLowerCase());
    const matchKategori = activeKategori === "semua" || p.kategori === activeKategori;
    return matchSearch && matchKategori;
  });

  return (
    <div className="min-h-screen container mx-auto px-4 py-8 sm:py-10">
      {/* Search + cart */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 md:max-w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            placeholder="Cari produk..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="shrink-0">
          <CartButton />
        </div>
      </div>

      {/* Category filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-5 scrollbar-none">
        {kategoriOptions.map((k) => (
          <button
            key={k.value}
            onClick={() => setActiveKategori(k.value)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              activeKategori === k.value
                ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20"
                : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
            }`}
          >
            {k.label}
          </button>
        ))}
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {isLoading ? (
          Array(8)
            .fill(0)
            .map((_, i) => (
              <Card key={i} className="overflow-hidden border-border">
                <Skeleton className="h-36 w-full rounded-none" />
                <CardContent className="p-3">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-3" />
                  <Skeleton className="h-8 w-full" />
                </CardContent>
              </Card>
            ))
        ) : filteredProducts.length > 0 ? (
          filteredProducts.map((produk) => {
            const gambarPertama = Array.isArray(produk.gambarUrl) ? produk.gambarUrl[0] : null;
            const totalGambar = Array.isArray(produk.gambarUrl)
              ? produk.gambarUrl.filter(Boolean).length
              : 0;
            return (
              <Card
                key={produk.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelected(produk)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelected(produk);
                  }
                }}
                className="overflow-hidden border-border hover:border-primary/40 hover:shadow-lg transition-all duration-200 flex flex-col cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40 group"
              >
                <div className="h-36 sm:h-44 bg-muted relative flex items-center justify-center overflow-hidden">
                  {gambarPertama ? (
                    <AppImage
                      src={gambarPertama}
                      alt={produk.namaProduk}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <ShoppingBag className="text-muted-foreground/30" size={36} />
                  )}

                  <span className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm text-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full border border-border/50 leading-tight">
                    {kategoriLabel[produk.kategori] ?? produk.kategori}
                  </span>

                  {totalGambar > 1 && (
                    <span className="absolute bottom-2 right-2 bg-background/80 backdrop-blur text-foreground border border-border/50 px-1.5 py-0.5 text-[10px] font-medium rounded-full">
                      +{totalGambar - 1}
                    </span>
                  )}

                  {produk.stok < 5 && produk.stok > 0 && (
                    <span className="absolute top-2 right-2 bg-destructive/90 text-white px-2 py-0.5 text-[10px] font-bold rounded-full">
                      Sisa {produk.stok}
                    </span>
                  )}

                  {produk.stok === 0 && (
                    <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center z-10">
                      <span className="bg-destructive text-destructive-foreground px-2.5 py-1 text-xs font-bold rounded-full">
                        Habis
                      </span>
                    </div>
                  )}
                </div>

                <CardContent className="p-2.5 sm:p-3 flex flex-col flex-1">
                  <h3 className="font-semibold text-xs sm:text-sm leading-snug line-clamp-2 mb-2">
                    {produk.namaProduk}
                  </h3>
                  <div className="mt-auto flex flex-col gap-1.5">
                    <span className="font-bold text-xs sm:text-sm text-primary">
                      Rp {produk.harga.toLocaleString("id-ID")}
                    </span>
                    <Button
                      size="sm"
                      disabled={produk.stok === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart({
                          produkId: produk.id,
                          namaProduk: produk.namaProduk,
                          harga: produk.harga,
                          stok: produk.stok,
                          gambarUrl: gambarPertama ?? null,
                        });
                        toast({
                          title: "Ditambahkan ke keranjang",
                          description: produk.namaProduk,
                          duration: 2000,
                        });
                      }}
                      className="h-8 w-full text-xs rounded-full"
                    >
                      <ShoppingCart className="h-3 w-3 mr-1" />
                      Tambah
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
      <CartDrawer />
    </div>
  );
}
