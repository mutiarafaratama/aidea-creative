import { useState } from "react";
import { Minus, Plus, ShoppingCart, X, Loader2, ShoppingBag } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useCart } from "@/contexts/cart-context";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const SNAP_SRC = "https://app.sandbox.midtrans.com/snap/snap.js";
const CLIENT_KEY = import.meta.env.VITE_MIDTRANS_CLIENT_KEY as string | undefined;

function loadSnapScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).snap) { resolve(); return; }
    if (document.getElementById("midtrans-snap")) { resolve(); return; }
    const script = document.createElement("script");
    script.id = "midtrans-snap";
    script.src = SNAP_SRC;
    if (CLIENT_KEY) script.setAttribute("data-client-key", CLIENT_KEY);
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Gagal memuat gateway pembayaran"));
    document.head.appendChild(script);
  });
}

function CheckoutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { items, totalHarga, clearCart, setIsOpen: setCartOpen } = useCart();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [nama, setNama] = useState(profile?.nama_lengkap ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [telepon, setTelepon] = useState(profile?.no_telepon ?? "");
  const [catatan, setCatatan] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim() || !email.trim() || !telepon.trim()) {
      toast({ title: "Isi semua data diri", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem("auth_token");

      const res = await fetch("/api/pesanan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          items: items.map((i) => ({ produkId: i.produkId, jumlah: i.qty })),
          namaPemesan: nama,
          email,
          telepon,
          catatan: catatan || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal membuat pesanan");

      if (data.snapToken && CLIENT_KEY) {
        // Tutup semua modal/drawer SEBELUM snap.pay() agar Radix melepas
        // scroll-lock pada body — tanpa ini Snap popup tidak bisa discroll.
        onClose();
        setCartOpen(false);

        await loadSnapScript();

        // Beri waktu 1 frame agar Radix selesai cleanup overflow:hidden
        await new Promise((r) => setTimeout(r, 80));

        const verifyPayment = async () => {
          try {
            await fetch("/api/pesanan/verify", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({ kodePesanan: data.kodePesanan }),
            });
          } catch { /* gagal verify — tidak blokir flow */ }
        };

        (window as any).snap.pay(data.snapToken, {
          onSuccess: async () => {
            await verifyPayment();
            clearCart();
            toast({ title: "Pembayaran berhasil! 🎉", description: `Kode pesanan: ${data.kodePesanan}` });
            setLocation("/profil");
          },
          onPending: async () => {
            await verifyPayment();
            clearCart();
            toast({ title: "Pembayaran tertunda", description: "Selesaikan pembayaran sesuai instruksi yang dikirim." });
            setLocation("/profil");
          },
          onError: () => {
            toast({ title: "Pembayaran gagal", description: "Coba lagi atau hubungi admin.", variant: "destructive" });
          },
          onClose: () => {},
        });
      } else {
        // Tanpa Midtrans (snap token tidak tersedia): tampilkan toast & redirect
        clearCart();
        onClose();
        setCartOpen(false);
        toast({ title: "Pesanan berhasil dibuat!", description: `Kode: ${data.kodePesanan} — Hubungi admin untuk konfirmasi pembayaran.` });
        setLocation("/profil");
      }
    } catch (err: any) {
      toast({ title: "Gagal checkout", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Konfirmasi Pesanan</DialogTitle>
          <DialogDescription>
            Isi data diri untuk menyelesaikan pemesanan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Item yang Dipesan</p>
          {items.map((item) => (
            <div key={item.produkId} className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">{item.namaProduk} × {item.qty}</span>
              <span className="font-medium">Rp {(item.harga * item.qty).toLocaleString("id-ID")}</span>
            </div>
          ))}
          <Separator />
          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span>Rp {totalHarga.toLocaleString("id-ID")}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-sm mb-1.5 block">Nama Lengkap</Label>
            <Input value={nama} readOnly className="bg-muted/50 cursor-not-allowed text-muted-foreground" />
          </div>
          <div>
            <Label className="text-sm mb-1.5 block">Email</Label>
            <Input type="email" value={email} readOnly className="bg-muted/50 cursor-not-allowed text-muted-foreground" />
          </div>
          <div>
            <Label className="text-sm mb-1.5 block">No. WhatsApp</Label>
            <Input value={telepon} onChange={(e) => setTelepon(e.target.value)} placeholder="08xxxxxxxxxx" required />
          </div>
          <div>
            <Label className="text-sm mb-1.5 block">Catatan (Opsional)</Label>
            <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Catatan tambahan..." className="resize-none" rows={2} />
          </div>
          <div className="rounded-md bg-muted/50 border border-border px-3 py-2.5 text-xs text-muted-foreground">
            🏪 Pengambilan di studio — Jl. A. Yani No.12, Pringsewu, Lampung
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Memproses...</>
            ) : (
              "Bayar Sekarang"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CartDrawer() {
  const { items, removeFromCart, updateQty, totalItems, totalHarga, isOpen, setIsOpen } = useCart();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const handleCheckout = () => {
    if (!user) {
      setIsOpen(false);
      setLocation("/login");
      return;
    }
    setCheckoutOpen(true);
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="w-full sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" /> Keranjang
              {totalItems > 0 && (
                <span className="ml-auto text-sm font-normal text-muted-foreground">{totalItems} item</span>
              )}
            </SheetTitle>
          </SheetHeader>

          {items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 opacity-20" />
              <p className="text-sm">Keranjang masih kosong</p>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto space-y-3 py-2">
                {items.map((item) => (
                  <div key={item.produkId} className="flex gap-3 p-3 rounded-lg border border-border bg-muted/20">
                    {item.gambarUrl ? (
                      <img src={item.gambarUrl} alt={item.namaProduk} className="w-14 h-14 rounded-md object-cover shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-md bg-muted flex items-center justify-center shrink-0">
                        <ShoppingBag className="h-6 w-6 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight line-clamp-2">{item.namaProduk}</p>
                      <p className="text-sm font-bold text-primary mt-0.5">
                        Rp {item.harga.toLocaleString("id-ID")}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center border border-border rounded-md">
                          <button
                            type="button"
                            className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40"
                            onClick={() => updateQty(item.produkId, item.qty - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-8 text-center text-sm font-medium">{item.qty}</span>
                          <button
                            type="button"
                            className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40"
                            onClick={() => updateQty(item.produkId, item.qty + 1)}
                            disabled={item.qty >= item.stok}
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <span className="text-xs text-muted-foreground ml-auto">
                          Rp {(item.harga * item.qty).toLocaleString("id-ID")}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.produkId)}
                          className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                <div className="flex justify-between items-center font-bold text-base">
                  <span>Total</span>
                  <span>Rp {totalHarga.toLocaleString("id-ID")}</span>
                </div>
                <Button className="w-full" size="lg" onClick={handleCheckout}>
                  Checkout ({totalItems} item)
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <CheckoutDialog
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
      />
    </>
  );
}

export function CartButton() {
  const { totalItems, setIsOpen } = useCart();
  return (
    <button
      type="button"
      onClick={() => setIsOpen(true)}
      className="relative flex items-center justify-center h-10 w-10 rounded-full bg-background border border-border shadow-sm hover:border-primary/40 hover:shadow transition-all"
      aria-label="Buka keranjang"
    >
      <ShoppingCart className="h-5 w-5" />
      {totalItems > 0 && (
        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
          {totalItems > 99 ? "99+" : totalItems}
        </span>
      )}
    </button>
  );
}
