import { useState } from "react";
import { useGetRecentBookings, getGetRecentBookingsQueryKey, useUpdateBookingStatus } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Clock, X, Search, Eye, MessageCircle, CalendarDays, Phone, Mail, FileText, Package, Banknote, Lightbulb, Wallet } from "lucide-react";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { QueryError } from "@/components/query-error";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const statuses = ["semua", "menunggu", "dikonfirmasi", "selesai", "dibatalkan"] as const;

function toWANumber(telepon: string): string {
  const digits = telepon.replace(/\D/g, "");
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("62")) return digits;
  return "62" + digits;
}

function formatTanggal(tgl: string) {
  try {
    return format(new Date(`${tgl}T12:00:00`), "EEE, dd MMM yyyy", { locale: idLocale });
  } catch {
    return tgl;
  }
}

export default function AdminBookings() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading, error, refetch, isFetching } = useGetRecentBookings();
  const mutate = useUpdateBookingStatus();
  const [filter, setFilter] = useState<(typeof statuses)[number]>("semua");
  const [search, setSearch] = useState("");
  const [detailBooking, setDetailBooking] = useState<any>(null);
  const [rejectDialog, setRejectDialog] = useState<{ booking: any; alasan: string } | null>(null);

  const bookings = Array.isArray(data) ? data : [];
  const filtered = bookings.filter((b: any) =>
    (filter === "semua" || b.status === filter) &&
    (search === "" ||
      b.namaPemesan.toLowerCase().includes(search.toLowerCase()) ||
      b.kodeBooking.toLowerCase().includes(search.toLowerCase()) ||
      (b.namaPaket ?? "").toLowerCase().includes(search.toLowerCase()))
  );

  const setStatus = (id: string, status: "dikonfirmasi" | "selesai" | "dibatalkan", alasanPembatalan?: string) => {
    const curStatusBayar = detailBooking?.statusPembayaran ?? "belum_bayar";
    mutate.mutate({ id, data: { status, statusPembayaran: curStatusBayar, ...(alasanPembatalan ? { alasanPembatalan } : {}) } }, {
      onSuccess: () => {
        toast({ title: "Status diperbarui" });
        qc.invalidateQueries({ queryKey: getGetRecentBookingsQueryKey() });
        if (detailBooking?.id === id) {
          setDetailBooking((prev: any) => prev ? { ...prev, status, ...(alasanPembatalan !== undefined ? { alasanPembatalan, dibatalkanOleh: "admin" } : {}) } : prev);
        }
        setRejectDialog(null);
      },
      onError: () => {
        toast({ title: "Gagal memperbarui status", variant: "destructive" });
      },
    });
  };

  const setStatusBayar = (id: string, statusPembayaran: "belum_bayar" | "dp" | "lunas") => {
    const curStatus = detailBooking?.status ?? "menunggu";
    mutate.mutate({ id, data: { status: curStatus, statusPembayaran } }, {
      onSuccess: () => {
        toast({ title: "Status pembayaran diperbarui" });
        qc.invalidateQueries({ queryKey: getGetRecentBookingsQueryKey() });
        if (detailBooking?.id === id) {
          setDetailBooking((prev: any) => prev ? { ...prev, statusPembayaran } : prev);
        }
      },
      onError: () => {
        toast({ title: "Gagal memperbarui status pembayaran", variant: "destructive" });
      },
    });
  };

  const handleReject = (booking: any) => {
    setRejectDialog({ booking, alasan: "" });
  };

  const confirmReject = (openWA: boolean) => {
    if (!rejectDialog) return;
    setStatus(rejectDialog.booking.id, "dibatalkan", rejectDialog.alasan || undefined);
    if (openWA && rejectDialog.booking.telepon) {
      const msg = encodeURIComponent(
        `Halo ${rejectDialog.booking.namaPemesan}, mohon maaf booking Anda dengan kode *${rejectDialog.booking.kodeBooking}* tidak dapat kami konfirmasi.${rejectDialog.alasan ? `\n\nAlasan: ${rejectDialog.alasan}` : ""}\n\nSilakan hubungi kami untuk jadwal alternatif. Terima kasih.`
      );
      window.open(`https://wa.me/${toWANumber(rejectDialog.booking.telepon)}?text=${msg}`, "_blank");
    }
  };

  const statusBadge = (s: string) => ({
    menunggu: <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20" variant="outline"><Clock className="mr-1 h-3 w-3" />Menunggu</Badge>,
    dikonfirmasi: <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/20" variant="outline"><Check className="mr-1 h-3 w-3" />Dikonfirmasi</Badge>,
    selesai: <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20" variant="outline"><Check className="mr-1 h-3 w-3" />Selesai</Badge>,
    dibatalkan: <Badge className="bg-red-500/10 text-red-700 border-red-500/20" variant="outline"><X className="mr-1 h-3 w-3" />Dibatalkan</Badge>,
  } as any)[s] ?? <Badge>{s}</Badge>;

  const bayarBadge = (s: string) => ({
    belum_bayar: <Badge className="bg-orange-500/10 text-orange-700 border-orange-500/20" variant="outline"><Wallet className="mr-1 h-3 w-3" />Belum Bayar</Badge>,
    dp: <Badge className="bg-sky-500/10 text-sky-700 border-sky-500/20" variant="outline"><Wallet className="mr-1 h-3 w-3" />DP</Badge>,
    lunas: <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20" variant="outline"><Check className="mr-1 h-3 w-3" />Lunas</Badge>,
  } as any)[s] ?? <Badge>{s}</Badge>;

  const cancelledByLabel = (dibatalkanOleh: string | null | undefined) =>
    dibatalkanOleh === "pelanggan" ? "Dibatalkan oleh Pelanggan" : "Dibatalkan oleh Studio";

  return (
    <AdminLayout title="Manajemen Booking" subtitle="Setujui, tinjau, dan kelola semua reservasi pelanggan.">
      <Card className="mb-4">
        <CardContent className="p-4 flex flex-col md:flex-row gap-3 md:items-center justify-between">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
            <TabsList>
              {statuses.map((s) => (
                <TabsTrigger key={s} value={s} className="capitalize">{s}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama / kode / paket..."
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {error && !isFetching && (
        <div className="mb-4">
          <QueryError error={error} onRetry={() => refetch()} title="Gagal memuat daftar booking" />
        </div>
      )}

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-6 space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Paket</TableHead>
                  <TableHead>Tanggal & Jam</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      Tidak ada booking.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((b: any) => (
                    <TableRow key={b.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setDetailBooking(b)}>
                      <TableCell className="font-mono text-xs">{b.kodeBooking}</TableCell>
                      <TableCell>
                        <div className="font-medium">{b.namaPemesan}</div>
                        <div className="text-xs text-muted-foreground">{b.telepon}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{b.namaPaket ?? <span className="text-muted-foreground text-xs">—</span>}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{formatTanggal(b.tanggalSesi)}</div>
                        <div className="text-xs text-muted-foreground">{b.jamSesi}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {statusBadge(b.status)}
                          {bayarBadge(b.statusPembayaran)}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">Rp {Number(b.totalHarga).toLocaleString("id-ID")}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            title="Lihat detail"
                            onClick={() => setDetailBooking(b)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <a
                            href={`https://wa.me/${toWANumber(b.telepon)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" title="Hubungi via WhatsApp">
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                          </a>
                          {b.status === "menunggu" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 h-8"
                                onClick={() => setStatus(b.id, "dikonfirmasi")}
                              >
                                Setujui
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-700 border-red-200 hover:bg-red-50 h-8"
                                onClick={() => handleReject(b)}
                              >
                                Tolak
                              </Button>
                            </>
                          )}
                          {b.status === "dikonfirmasi" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8"
                              onClick={() => setStatus(b.id, "selesai")}
                            >
                              Selesaikan
                            </Button>
                          )}
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
      <Sheet open={!!detailBooking} onOpenChange={(o) => !o && setDetailBooking(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {detailBooking && (
            <>
              <SheetHeader className="mb-6">
                <SheetTitle className="font-mono text-lg">{detailBooking.kodeBooking}</SheetTitle>
                <SheetDescription>Detail lengkap reservasi pelanggan</SheetDescription>
              </SheetHeader>

              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status Booking</span>
                  <div className="flex flex-col items-end gap-1">
                    {statusBadge(detailBooking.status)}
                    {detailBooking.status === "dibatalkan" && (
                      <span className="text-[10px] text-muted-foreground">
                        {cancelledByLabel(detailBooking.dibatalkanOleh)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status Pembayaran</span>
                  {bayarBadge(detailBooking.statusPembayaran)}
                </div>
                {detailBooking.status === "dibatalkan" && (
                  <div className={`rounded-lg border px-3 py-2.5 flex gap-2 ${
                    detailBooking.dibatalkanOleh === "pelanggan"
                      ? "border-orange-200 bg-orange-50"
                      : "border-red-200 bg-red-50"
                  }`}>
                    <X className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${
                      detailBooking.dibatalkanOleh === "pelanggan" ? "text-orange-500" : "text-red-500"
                    }`} />
                    <div>
                      <p className={`text-[10px] font-semibold uppercase tracking-wider mb-0.5 ${
                        detailBooking.dibatalkanOleh === "pelanggan" ? "text-orange-600" : "text-red-600"
                      }`}>Alasan Pembatalan</p>
                      <p className={`text-xs ${
                        detailBooking.dibatalkanOleh === "pelanggan" ? "text-orange-700" : "text-red-700"
                      }`}>
                        {detailBooking.alasanPembatalan || <span className="italic opacity-60">Tidak ada alasan yang diberikan</span>}
                      </p>
                    </div>
                  </div>
                )}

                <Separator />

                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Informasi Pelanggan</p>
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-primary">{detailBooking.namaPemesan.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <div className="font-semibold">{detailBooking.namaPemesan}</div>
                      <a href={`mailto:${detailBooking.email}`} className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 hover:text-foreground">
                        <Mail className="h-3 w-3" /> {detailBooking.email}
                      </a>
                      <a href={`https://wa.me/${toWANumber(detailBooking.telepon)}`} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 hover:text-emerald-600">
                        <Phone className="h-3 w-3" /> {detailBooking.telepon}
                      </a>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Detail Sesi</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-start gap-2">
                      <Package className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs text-muted-foreground">Paket</div>
                        <div className="text-sm font-medium">{detailBooking.namaPaket ?? "—"}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Banknote className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs text-muted-foreground">Total</div>
                        <div className="text-sm font-semibold">Rp {Number(detailBooking.totalHarga).toLocaleString("id-ID")}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 col-span-2">
                      <CalendarDays className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs text-muted-foreground">Tanggal & Jam Sesi</div>
                        <div className="text-sm font-medium">{formatTanggal(detailBooking.tanggalSesi)}</div>
                        <div className="text-xs text-muted-foreground">{detailBooking.jamSesi}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {(detailBooking.konsepFoto || detailBooking.catatanPelanggan) && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Catatan Pelanggan</p>
                      {detailBooking.konsepFoto && (
                        <div className="flex items-start gap-2">
                          <Lightbulb className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div>
                            <div className="text-xs text-muted-foreground">Konsep Foto</div>
                            <div className="text-sm">{detailBooking.konsepFoto}</div>
                          </div>
                        </div>
                      )}
                      {detailBooking.catatanPelanggan && (
                        <div className="flex items-start gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div>
                            <div className="text-xs text-muted-foreground">Catatan Khusus</div>
                            <div className="text-sm whitespace-pre-line">{detailBooking.catatanPelanggan}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <Separator />

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ubah Status Pembayaran</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(["belum_bayar", "dp", "lunas"] as const).map((s) => {
                      const labels = { belum_bayar: "Belum Bayar", dp: "DP", lunas: "Lunas" };
                      const active = detailBooking.statusPembayaran === s;
                      return (
                        <Button
                          key={s}
                          size="sm"
                          variant={active ? "default" : "outline"}
                          className={
                            active
                              ? s === "lunas"
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                : s === "dp"
                                ? "bg-sky-600 hover:bg-sky-700 text-white"
                                : "bg-orange-500 hover:bg-orange-600 text-white"
                              : "text-muted-foreground"
                          }
                          disabled={active || mutate.isPending}
                          onClick={() => setStatusBayar(detailBooking.id, s)}
                        >
                          {labels[s]}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <a
                    href={`https://wa.me/${toWANumber(detailBooking.telepon)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700">
                      <MessageCircle className="h-4 w-4" /> Hubungi via WhatsApp
                    </Button>
                  </a>
                  {detailBooking.status === "menunggu" && (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                        onClick={() => setStatus(detailBooking.id, "dikonfirmasi")}
                      >
                        <Check className="h-4 w-4 mr-1" /> Setujui
                      </Button>
                      <Button
                        variant="outline"
                        className="text-red-700 border-red-200 hover:bg-red-50"
                        onClick={() => handleReject(detailBooking)}
                      >
                        <X className="h-4 w-4 mr-1" /> Tolak
                      </Button>
                    </div>
                  )}
                  {detailBooking.status === "dikonfirmasi" && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setStatus(detailBooking.id, "selesai")}
                    >
                      <Check className="h-4 w-4 mr-1" /> Tandai Selesai
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Rejection Dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={(o) => !o && setRejectDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tolak Booking</DialogTitle>
          </DialogHeader>
          {rejectDialog && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Anda akan menolak booking <span className="font-semibold font-mono">{rejectDialog.booking.kodeBooking}</span> dari <span className="font-semibold">{rejectDialog.booking.namaPemesan}</span>.
              </p>
              <div>
                <Label className="text-sm mb-1.5 block">Alasan Penolakan (Opsional)</Label>
                <Textarea
                  placeholder="Contoh: Jadwal sudah penuh, studio dalam perbaikan, dll."
                  className="resize-none"
                  rows={3}
                  value={rejectDialog.alasan}
                  onChange={(e) => setRejectDialog((prev) => prev ? { ...prev, alasan: e.target.value } : prev)}
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setRejectDialog(null)}>
              Batal
            </Button>
            <Button
              variant="outline"
              className="flex-1 text-red-700 border-red-200 hover:bg-red-50"
              onClick={() => confirmReject(false)}
              disabled={mutate.isPending}
            >
              <X className="h-4 w-4 mr-1" /> Tolak
            </Button>
            <Button
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              onClick={() => confirmReject(true)}
              disabled={mutate.isPending}
            >
              <MessageCircle className="h-4 w-4 mr-1" /> Tolak & WA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
