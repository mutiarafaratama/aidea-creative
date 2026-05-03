import { useState, useEffect } from "react";
import { Search, Eye, MessageCircle, Package, Phone, Mail, Check, X, Wallet, Trash2 } from "lucide-react";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { adminFetch } from "@/lib/admin-api";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const STATUSES = ["semua", "diproses", "dikerjakan", "selesai", "dibatalkan"] as const;
type StatusFilter = (typeof STATUSES)[number];

type ItemPesanan = {
  id: string;
  produkId: string;
  namaProduk: string;
  jumlah: number;
  hargaSatuan: number;
  subtotal: number;
};

type Pesanan = {
  id: string;
  kodePesanan: string;
  namaPemesan: string;
  email: string;
  telepon: string;
  status: string;
  statusPembayaran: string;
  totalHarga: number;
  catatan: string | null;
  createdAt: string;
  items: ItemPesanan[];
};

function toWANumber(telepon: string): string {
  const digits = telepon.replace(/\D/g, "");
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("62")) return digits;
  return "62" + digits;
}

const STATUS_LABELS: Record<string, string> = {
  diproses: "Diproses",
  dikerjakan: "Dikerjakan",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

const BAYAR_LABELS: Record<string, string> = {
  belum_bayar: "Belum Bayar",
  dp: "DP",
  lunas: "Lunas",
};

function statusBadge(s: string) {
  const map: Record<string, string> = {
    diproses: "bg-amber-500/10 text-amber-700 border-amber-500/20",
    dikerjakan: "bg-blue-500/10 text-blue-700 border-blue-500/20",
    selesai: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    dibatalkan: "bg-red-500/10 text-red-700 border-red-500/20",
  };
  return <Badge className={map[s] ?? ""} variant="outline">{STATUS_LABELS[s] ?? s}</Badge>;
}

function bayarBadge(s: string) {
  const map: Record<string, string> = {
    belum_bayar: "bg-orange-500/10 text-orange-700 border-orange-500/20",
    dp: "bg-sky-500/10 text-sky-700 border-sky-500/20",
    lunas: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  };
  return <Badge className={map[s] ?? ""} variant="outline"><Wallet className="mr-1 h-3 w-3" />{BAYAR_LABELS[s] ?? s}</Badge>;
}

export default function AdminPesanan() {
  const { toast } = useToast();
  const [pesanan, setPesanan] = useState<Pesanan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("semua");
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<Pesanan | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [hapusDialog, setHapusDialog] = useState<Pesanan | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = async () => {
    try {
      const data = await adminFetch<Pesanan[]>("/api/pesanan");
      setPesanan(data);
    } catch {
      toast({ title: "Gagal memuat pesanan", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel("admin-pesanan-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "pesanan_produk" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const updateStatus = async (id: string, status: string, statusPembayaran?: string) => {
    setIsUpdating(true);
    try {
      const updated = await adminFetch<Pesanan>(`/api/pesanan/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status, ...(statusPembayaran ? { statusPembayaran } : {}) }),
      });
      setPesanan((prev) => prev.map((p) => (p.id === id ? updated : p)));
      setDetail((prev) => (prev?.id === id ? updated : prev));
      toast({ title: "Status diperbarui" });
    } catch {
      toast({ title: "Gagal memperbarui status", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const updateBayar = async (id: string, statusPembayaran: string) => {
    const cur = detail?.status ?? "diproses";
    setIsUpdating(true);
    try {
      const updated = await adminFetch<Pesanan>(`/api/pesanan/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: cur, statusPembayaran }),
      });
      setPesanan((prev) => prev.map((p) => (p.id === id ? updated : p)));
      setDetail((prev) => (prev?.id === id ? updated : prev));
      toast({ title: "Status pembayaran diperbarui" });
    } catch {
      toast({ title: "Gagal", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const hapusPesanan = async (p: Pesanan) => {
    setIsDeleting(true);
    try {
      await adminFetch(`/api/pesanan/${p.id}`, { method: "DELETE" });
      setPesanan((prev) => prev.filter((x) => x.id !== p.id));
      setHapusDialog(null);
      setDetail(null);
      toast({ title: "Pesanan dihapus", description: `#${p.kodePesanan} telah dihapus.` });
    } catch {
      toast({ title: "Gagal menghapus pesanan", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = pesanan.filter((p) =>
    (filter === "semua" || p.status === filter) &&
    (search === "" ||
      p.namaPemesan.toLowerCase().includes(search.toLowerCase()) ||
      p.kodePesanan.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <AdminLayout title="Pesanan Toko" subtitle="Kelola semua pesanan produk dari pelanggan.">
      <Card className="mb-4">
        <CardContent className="p-4 flex flex-col md:flex-row gap-3 md:items-center justify-between">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as StatusFilter)}>
            <TabsList>
              {STATUSES.map((s) => (
                <TabsTrigger key={s} value={s} className="capitalize">{s === "semua" ? "Semua" : STATUS_LABELS[s]}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama / kode..." className="pl-9" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-6 space-y-2">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      Tidak ada pesanan.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((p) => (
                    <TableRow key={p.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setDetail(p)}>
                      <TableCell className="font-mono text-xs">{p.kodePesanan}</TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{p.namaPemesan}</div>
                        <div className="text-xs text-muted-foreground">{p.telepon}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{p.items.length} item</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {p.items.map((i) => i.namaProduk).join(", ")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {statusBadge(p.status)}
                          {bayarBadge(p.statusPembayaran)}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">Rp {p.totalHarga.toLocaleString("id-ID")}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setDetail(p)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <a href={`https://wa.me/${toWANumber(p.telepon)}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                          </a>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                            onClick={(e) => { e.stopPropagation(); setHapusDialog(p); }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {detail && (
            <>
              <SheetHeader className="mb-6">
                <SheetTitle className="font-mono text-lg">{detail.kodePesanan}</SheetTitle>
                <SheetDescription>Detail pesanan produk pelanggan</SheetDescription>
              </SheetHeader>

              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status Pesanan</span>
                  {statusBadge(detail.status)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status Pembayaran</span>
                  {bayarBadge(detail.statusPembayaran)}
                </div>

                <Separator />

                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Informasi Pelanggan</p>
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary">{detail.namaPemesan.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{detail.namaPemesan}</div>
                      <a href={`mailto:${detail.email}`} className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 hover:text-foreground">
                        <Mail className="h-3 w-3" /> {detail.email}
                      </a>
                      <a href={`https://wa.me/${toWANumber(detail.telepon)}`} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 hover:text-emerald-600">
                        <Phone className="h-3 w-3" /> {detail.telepon}
                      </a>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Dipesan: {format(new Date(detail.createdAt), "dd MMM yyyy, HH:mm", { locale: idLocale })}
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Item Pesanan</p>
                  {detail.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium leading-tight">{item.namaProduk}</p>
                          <p className="text-xs text-muted-foreground">× {item.jumlah} · Rp {item.hargaSatuan.toLocaleString("id-ID")}/item</p>
                        </div>
                      </div>
                      <span className="font-semibold shrink-0">Rp {item.subtotal.toLocaleString("id-ID")}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold pt-2 border-t border-border text-sm">
                    <span>Total</span>
                    <span>Rp {detail.totalHarga.toLocaleString("id-ID")}</span>
                  </div>
                </div>

                {detail.catatan && (
                  <>
                    <Separator />
                    <div className="text-sm">
                      <p className="text-xs text-muted-foreground mb-1">Catatan Pelanggan</p>
                      <p className="whitespace-pre-line">{detail.catatan}</p>
                    </div>
                  </>
                )}

                <Separator />

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ubah Status Pembayaran</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(["belum_bayar", "dp", "lunas"] as const).map((s) => {
                      const active = detail.statusPembayaran === s;
                      const colors = { belum_bayar: "bg-orange-500 hover:bg-orange-600", dp: "bg-sky-600 hover:bg-sky-700", lunas: "bg-emerald-600 hover:bg-emerald-700" };
                      return (
                        <Button
                          key={s}
                          size="sm"
                          variant={active ? "default" : "outline"}
                          className={active ? `${colors[s]} text-white` : "text-muted-foreground"}
                          disabled={active || isUpdating}
                          onClick={() => updateBayar(detail.id, s)}
                        >
                          {BAYAR_LABELS[s]}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <a href={`https://wa.me/${toWANumber(detail.telepon)}`} target="_blank" rel="noopener noreferrer">
                    <Button className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700">
                      <MessageCircle className="h-4 w-4" /> Hubungi via WhatsApp
                    </Button>
                  </a>
                  {detail.status === "diproses" && (
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" className="text-emerald-700 border-emerald-200 hover:bg-emerald-50" disabled={isUpdating} onClick={() => updateStatus(detail.id, "dikerjakan")}>
                        <Check className="h-4 w-4 mr-1" /> Proses
                      </Button>
                      <Button variant="outline" className="text-red-700 border-red-200 hover:bg-red-50" disabled={isUpdating} onClick={() => updateStatus(detail.id, "dibatalkan")}>
                        <X className="h-4 w-4 mr-1" /> Batalkan
                      </Button>
                    </div>
                  )}
                  {detail.status === "dikerjakan" && (
                    <Button variant="outline" className="w-full" disabled={isUpdating} onClick={() => updateStatus(detail.id, "selesai")}>
                      <Check className="h-4 w-4 mr-1" /> Tandai Selesai
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="w-full gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                    onClick={() => setHapusDialog(detail)}
                  >
                    <Trash2 className="h-4 w-4" /> Hapus Pesanan
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Konfirmasi Hapus Pesanan ── */}
      <Dialog open={!!hapusDialog} onOpenChange={(open) => !open && setHapusDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          {hapusDialog && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <Trash2 className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <DialogTitle>Hapus Pesanan?</DialogTitle>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">{hapusDialog.kodePesanan}</p>
                  </div>
                </div>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Pesanan <span className="font-semibold text-foreground">{hapusDialog.namaPemesan}</span> akan dihapus permanen beserta semua item-nya. Tindakan ini tidak dapat dibatalkan.
              </p>
              <div className="flex gap-2 mt-1">
                <Button variant="outline" className="flex-1" onClick={() => setHapusDialog(null)} disabled={isDeleting}>
                  Batal
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 gap-2"
                  onClick={() => hapusPesanan(hapusDialog)}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Ya, Hapus
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
