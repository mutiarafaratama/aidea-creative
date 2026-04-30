import { useListProduk, getListProdukQueryKey } from "@workspace/api-client-react";
import { ShoppingBag, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

const kategoriLabel: Record<string, string> = {
  cetak_foto: "Cetak Foto",
  frame: "Frame / Bingkai",
  album: "Album",
  photobook: "Photobook",
  merchandise: "Merchandise",
};

export default function Toko() {
  const { data: produkList, isLoading } = useListProduk({ query: { queryKey: getListProdukQueryKey() } });
  const [searchQuery, setSearchQuery] = useState("");

  const produkArray = Array.isArray(produkList) ? produkList : [];
  const filteredProducts = produkArray.filter(p => 
    p.namaProduk.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.kategori.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen container mx-auto px-4 py-16">
      <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">Toko <span className="text-primary italic">Produk</span></h1>
          <p className="text-lg text-muted-foreground max-w-xl">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {isLoading ? (
          Array(8).fill(0).map((_, i) => (
            <Card key={i} className="overflow-hidden border-border">
              <Skeleton className="h-64 w-full rounded-none" />
              <CardContent className="p-5">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/4 mb-4" />
                <Skeleton className="h-4 w-full mb-6" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))
        ) : filteredProducts.length > 0 ? (
          filteredProducts.map(produk => {
            const gambarPertama = Array.isArray(produk.gambarUrl) ? produk.gambarUrl[0] : null;
            return (
              <Card key={produk.id} className="overflow-hidden border-border hover:border-primary/50 transition-colors flex flex-col">
                <div className="h-64 bg-muted relative p-4 flex items-center justify-center">
                  {gambarPertama ? (
                    <img src={gambarPertama} alt={produk.namaProduk} className="max-w-full max-h-full object-contain mix-blend-multiply drop-shadow-sm" />
                  ) : (
                    <ShoppingBag className="text-muted-foreground opacity-20" size={60} />
                  )}
                  {produk.stok < 5 && produk.stok > 0 && (
                    <div className="absolute top-3 left-3 bg-destructive/10 text-destructive px-2 py-1 text-xs font-bold rounded">
                      Sisa {produk.stok}
                    </div>
                  )}
                  {produk.stok === 0 && (
                    <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center z-10">
                      <span className="bg-destructive text-destructive-foreground px-3 py-1 font-bold rounded">Habis Terjual</span>
                    </div>
                  )}
                </div>
                <CardContent className="p-5 flex flex-col flex-1">
                  <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">
                    {kategoriLabel[produk.kategori] ?? produk.kategori}
                    {produk.ukuran && ` · ${produk.ukuran}`}
                  </div>
                  <h3 className="font-bold text-lg mb-1 leading-tight">{produk.namaProduk}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{produk.deskripsi}</p>
                  <div className="mt-auto pt-4 flex items-center justify-between">
                    <div className="font-bold text-lg">Rp {produk.harga.toLocaleString('id-ID')}</div>
                    <Button size="sm" disabled={produk.stok === 0}>Beli</Button>
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
    </div>
  );
}
