import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useListPaket, useCreateBooking } from "@workspace/api-client-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  CalendarIcon, Loader2, CheckCircle2, Clock, PartyPopper, Copy,
  MessageCircle, AlertTriangle, Tag, BadgePercent, XCircle, Lock, ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useSiteSettings } from "@/lib/settings";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type JadwalSlot = { tanggal: string; jamMulai: string; jamSelesai: string; isTersedia: boolean };
type BlacklistEntry = { tanggal: string; alasan: string };
type PromoInfo = {
  id: string;
  judul: string;
  badge: string | null;
  tipeDiskon: string | null;
  nilaiDiskon: number | null;
  paketId: string | null;
  kuota: number | null;
  terpakai: number;
  tanggalBerakhir: string | null;
  isAktif: boolean;
};
type BookedResult = {
  kodeBooking: string;
  namaPaket: string;
  tanggalSesi: Date;
  jamSesi: string;
  totalHarga: number;
  hargaAsli: number;
  diskonAmount: number;
  namaPromo: string | null;
};

const bookingSchema = z.object({
  namaPemesan: z.string().min(2, "Nama lengkap harus diisi"),
  email: z.string().email("Format email tidak valid"),
  telepon: z.string().min(10, "Nomor telepon tidak valid"),
  paketId: z.string().min(1, "Silakan pilih paket"),
  tanggalSesi: z.date({ required_error: "Pilih tanggal sesi" }),
  jamSesi: z.string().min(1, "Pilih jam sesi"),
  catatanPelanggan: z.string().optional(),
  konsepFoto: z.string().optional(),
});

function formatRp(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

function hitungDiskon(harga: number, promo: PromoInfo | null, paketId: string): number {
  if (!promo || !promo.isAktif) return 0;
  if (promo.paketId && promo.paketId !== paketId) return 0;
  const now = new Date();
  if (promo.tanggalBerakhir && now > new Date(promo.tanggalBerakhir)) return 0;
  if (promo.kuota != null && promo.kuota > 0 && promo.terpakai >= promo.kuota) return 0;
  if (!promo.tipeDiskon || promo.nilaiDiskon == null || promo.nilaiDiskon <= 0) return 0;
  const h = Number(harga);
  if (promo.tipeDiskon === "persen") return Math.floor(h * promo.nilaiDiskon / 100);
  if (promo.tipeDiskon === "nominal") return Math.min(promo.nilaiDiskon, h);
  return 0;
}

export default function Booking() {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const { data: siteSettings } = useSiteSettings();

  const { data: paketList, isLoading: loadingPaket } = useListPaket();
  const createBooking = useCreateBooking();

  const [jamSlots, setJamSlots] = useState<JadwalSlot[]>([]);
  const [loadingJam, setLoadingJam] = useState(false);
  const [bookedResult, setBookedResult] = useState<BookedResult | null>(null);
  const [closedDays, setClosedDays] = useState<Set<number>>(new Set());
  const [blacklistDates, setBlacklistDates] = useState<Map<string, string>>(new Map());
  const [promoInfo, setPromoInfo] = useState<PromoInfo | null>(null);
  const [promoId, setPromoId] = useState<string | null>(null);
  const [loadingPromo, setLoadingPromo] = useState(false);

  const searchParams = new URLSearchParams(window.location.search);
  const paketIdFromUrl = searchParams.get("paket");
  const promoIdFromUrl = searchParams.get("promo");
  const isLockedPaket = !!paketIdFromUrl;

  useEffect(() => {
    fetch(`${API_BASE}/api/jadwal/aturan`)
      .then((r) => r.json())
      .then((data) => {
        const closed = new Set<number>();
        if (data.rules) {
          Object.entries(data.rules).forEach(([day, rule]: [string, any]) => {
            if (!rule.isBuka) closed.add(Number(day));
          });
        }
        setClosedDays(closed);
      })
      .catch(() => {});

    fetch(`${API_BASE}/api/jadwal/blackout`)
      .then((r) => r.json())
      .then((data: BlacklistEntry[]) => {
        if (Array.isArray(data)) {
          setBlacklistDates(new Map(data.map((d) => [d.tanggal, d.alasan])));
        }
      })
      .catch(() => {});
  }, []);

  const form = useForm<z.infer<typeof bookingSchema>>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      namaPemesan: "",
      email: "",
      telepon: "",
      catatanPelanggan: "",
      konsepFoto: "",
      paketId: paketIdFromUrl ?? "",
      jamSesi: "",
    },
  });

  useEffect(() => {
    if (promoIdFromUrl) {
      setPromoId(promoIdFromUrl);
      setLoadingPromo(true);
      fetch(`${API_BASE}/api/promo/${promoIdFromUrl}`)
        .then((r) => r.json())
        .then((data) => setPromoInfo(data))
        .catch(() => setPromoInfo(null))
        .finally(() => setLoadingPromo(false));
    }
  }, [promoIdFromUrl]);

  useEffect(() => {
    if (paketIdFromUrl && Array.isArray(paketList) && paketList.length > 0) {
      form.setValue("paketId", paketIdFromUrl, { shouldValidate: true });
    }
  }, [paketList, paketIdFromUrl]);

  useEffect(() => {
    if (!user) return;
    if (profile?.nama_lengkap) form.setValue("namaPemesan", profile.nama_lengkap);
    if (profile?.no_telepon) form.setValue("telepon", profile.no_telepon);
    if (user.email) form.setValue("email", user.email);
  }, [user, profile, form]);

  const selectedTanggal = form.watch("tanggalSesi");
  const selectedPaketId = form.watch("paketId");

  useEffect(() => {
    if (!selectedTanggal) {
      setJamSlots([]);
      return;
    }
    const tanggalStr = format(selectedTanggal, "yyyy-MM-dd");
    setLoadingJam(true);
    fetch(`${API_BASE}/api/jadwal?tanggal=${tanggalStr}`)
      .then((r) => r.json())
      .then((data: JadwalSlot[]) => {
        setJamSlots(Array.isArray(data) ? data : []);
      })
      .catch(() => setJamSlots([]))
      .finally(() => setLoadingJam(false));
  }, [selectedTanggal]);

  const onSubmit = (values: z.infer<typeof bookingSchema>) => {
    createBooking.mutate(
      {
        data: {
          namaPemesan: values.namaPemesan,
          email: values.email,
          telepon: values.telepon,
          paketId: values.paketId,
          tanggalSesi: format(values.tanggalSesi, "yyyy-MM-dd"),
          jamSesi: values.jamSesi,
          catatanPelanggan: values.catatanPelanggan || undefined,
          konsepFoto: values.konsepFoto || undefined,
          ...(promoId ? { promoId } : {}),
        } as any,
      },
      {
        onSuccess: (data: any) => {
          const paket = Array.isArray(paketList)
            ? paketList.find((p) => p.id === values.paketId)
            : undefined;
          setBookedResult({
            kodeBooking: data.kodeBooking,
            namaPaket: data.namaPaket ?? paket?.namaPaket ?? "—",
            tanggalSesi: values.tanggalSesi,
            jamSesi: values.jamSesi,
            totalHarga: Number(data.totalHarga ?? paket?.harga ?? 0),
            hargaAsli: Number(data.hargaAsli ?? data.totalHarga ?? paket?.harga ?? 0),
            diskonAmount: Number(data.diskonAmount ?? 0),
            namaPromo: data.namaPromo ?? null,
          });
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.error ?? "Terjadi kesalahan saat memproses booking Anda. Silakan coba lagi.";
          toast({
            title: "Gagal",
            description: msg,
            variant: "destructive",
          });
        },
      }
    );
  };

  const selectedPaket = Array.isArray(paketList)
    ? paketList.find((p) => p.id === selectedPaketId)
    : undefined;

  const diskonCalc = selectedPaket && promoInfo
    ? hitungDiskon(selectedPaket.harga, promoInfo, selectedPaketId)
    : 0;
  const totalAfterDiskon = selectedPaket ? selectedPaket.harga - diskonCalc : 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isDateDisabled = (date: Date) => {
    if (date < today) return true;
    if (closedDays.has(date.getDay())) return true;
    const dateStr = format(date, "yyyy-MM-dd");
    if (blacklistDates.has(dateStr)) return true;
    return false;
  };

  const selectedTanggalStr = selectedTanggal ? format(selectedTanggal, "yyyy-MM-dd") : null;
  const isDayClosed = selectedTanggal ? closedDays.has(selectedTanggal.getDay()) : false;
  const isDateBlocked = selectedTanggalStr ? blacklistDates.has(selectedTanggalStr) : false;
  const blockedAlasan = selectedTanggalStr ? blacklistDates.get(selectedTanggalStr) : undefined;

  const availableSlots = jamSlots.filter((s) => s.isTersedia);
  const bookedSlots = jamSlots.filter((s) => !s.isTersedia);

  if (bookedResult) {
    const waNumber = (siteSettings?.contactWhatsapp ?? "").replace(/\D/g, "").replace(/^0/, "62");
    const waText = encodeURIComponent(
      `Halo AideaCreative! Saya baru saja melakukan booking.\nKode: *${bookedResult.kodeBooking}*\nPaket: ${bookedResult.namaPaket}\nTanggal: ${format(bookedResult.tanggalSesi, "EEEE, dd MMMM yyyy", { locale: idLocale })}\nJam: ${bookedResult.jamSesi}${bookedResult.namaPromo ? `\nPromo: ${bookedResult.namaPromo}` : ""}\nTotal: Rp ${bookedResult.totalHarga.toLocaleString("id-ID")}\n\nMohon konfirmasinya, terima kasih.`
    );

    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl min-h-screen flex items-center justify-center">
        <Card className="w-full border-border shadow-lg text-center">
          <div className="bg-emerald-500/10 p-8 border-b border-border flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <PartyPopper className="h-8 w-8 text-emerald-600" />
            </div>
            <CardTitle className="text-2xl font-serif font-bold text-emerald-700">Booking Berhasil!</CardTitle>
            <CardDescription className="text-base">
              Terima kasih! Admin kami akan menghubungi Anda dalam 1×24 jam untuk konfirmasi.
            </CardDescription>
          </div>
          <CardContent className="p-8 space-y-6">
            <div className="bg-muted rounded-xl p-6 space-y-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Kode Booking Anda</div>
              <div className="text-3xl font-mono font-bold tracking-widest text-primary">{bookedResult.kodeBooking}</div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(bookedResult.kodeBooking);
                  toast({ title: "Disalin!", description: "Kode booking berhasil disalin." });
                }}
                className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition"
              >
                <Copy className="h-3 w-3" /> Salin kode
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm text-left">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Paket</div>
                <div className="font-semibold">{bookedResult.namaPaket}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Total Bayar</div>
                {bookedResult.diskonAmount > 0 ? (
                  <div>
                    <div className="font-bold text-base text-primary">{formatRp(bookedResult.totalHarga)}</div>
                    <div className="text-xs text-muted-foreground line-through">{formatRp(bookedResult.hargaAsli)}</div>
                    {bookedResult.namaPromo && (
                      <div className="text-xs text-green-600 flex items-center gap-0.5 mt-0.5">
                        <Tag className="h-3 w-3" /> {bookedResult.namaPromo}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="font-semibold">{formatRp(bookedResult.totalHarga)}</div>
                )}
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Tanggal Sesi</div>
                <div className="font-semibold">
                  {format(bookedResult.tanggalSesi, "EEEE, dd MMM yyyy", { locale: idLocale })}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Jam Sesi</div>
                <div className="font-semibold">{bookedResult.jamSesi}</div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Simpan kode booking di atas sebagai referensi. Kami akan menghubungi Anda via WhatsApp untuk konfirmasi jadwal dan informasi pembayaran.
            </p>

            <a
              href={`https://wa.me/${waNumber}?text=${waText}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2">
                <MessageCircle className="h-4 w-4" /> Konfirmasi via WhatsApp
              </Button>
            </a>
            <Button variant="outline" className="w-full" onClick={() => window.location.href = "/"}>
              Kembali ke Beranda
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-16 max-w-4xl min-h-screen">
      <Card className="w-full border-border shadow-lg">
        <div className="bg-primary/5 p-5 md:p-8 border-b border-border text-center">
          <CardTitle className="text-3xl font-serif font-bold mb-2">Booking Jadwal</CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            Isi formulir di bawah ini untuk mereservasi jadwal pemotretan Anda.
          </CardDescription>
          {promoInfo && (
            <div className="mt-3 inline-flex items-center gap-2 bg-green-500/10 text-green-700 border border-green-200 rounded-lg px-3 py-1.5 text-sm">
              <BadgePercent className="h-4 w-4" />
              <span className="font-medium">Promo: {promoInfo.judul}</span>
              {promoInfo.tipeDiskon === "persen" ? (
                <Badge className="bg-green-600 text-white border-0 text-xs">{promoInfo.nilaiDiskon}% OFF</Badge>
              ) : promoInfo.tipeDiskon === "nominal" ? (
                <Badge className="bg-green-600 text-white border-0 text-xs">Hemat {formatRp(promoInfo.nilaiDiskon!)}</Badge>
              ) : null}
            </div>
          )}
        </div>
        <CardContent className="p-4 md:p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 md:space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                {/* Informasi Kontak */}
                <div className="space-y-6">
                  <h3 className="font-serif font-semibold text-lg border-b border-border pb-2">
                    Informasi Kontak
                  </h3>

                  <FormField
                    control={form.control}
                    name="namaPemesan"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nama Lengkap</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alamat Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="telepon"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nomor WhatsApp/Telepon</FormLabel>
                        <FormControl>
                          <Input placeholder="081234567890" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="konsepFoto"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Konsep Foto (Opsional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Contoh: Rustic, Minimalis, Outdoor" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Detail Reservasi */}
                <div className="space-y-6">
                  <h3 className="font-serif font-semibold text-lg border-b border-border pb-2">
                    Detail Reservasi
                  </h3>

                  {/* Paket — locked (from URL) or selectable */}
                  <FormField
                    control={form.control}
                    name="paketId"
                    render={({ field }) => (
                      <FormItem>
                        {isLockedPaket ? (
                          /* Read-only paket card when coming from paket/promo page */
                          <div>
                            <FormLabel className="flex items-center gap-1.5">
                              <Lock className="h-3.5 w-3.5 text-muted-foreground" /> Paket Terpilih
                            </FormLabel>
                            {loadingPaket ? (
                              <div className="flex items-center gap-2 h-20 text-sm text-muted-foreground border border-border rounded-lg px-4">
                                <Loader2 className="h-4 w-4 animate-spin" /> Memuat detail paket...
                              </div>
                            ) : selectedPaket ? (
                              <div className="border border-primary/30 bg-primary/5 rounded-xl p-4 space-y-3">
                                {(selectedPaket as any).fotoUrl && (
                                  <img
                                    src={(selectedPaket as any).fotoUrl}
                                    alt={selectedPaket.namaPaket}
                                    className="w-full h-28 object-cover rounded-lg"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                  />
                                )}
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="font-semibold text-base">{selectedPaket.namaPaket}</div>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" /> {selectedPaket.durasiSesi} menit
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <ImageIcon className="h-3 w-3" /> {selectedPaket.jumlahFoto} foto
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    {diskonCalc > 0 ? (
                                      <>
                                        <div className="text-xs text-muted-foreground line-through">{formatRp(selectedPaket.harga)}</div>
                                        <div className="font-bold text-lg text-primary">{formatRp(totalAfterDiskon)}</div>
                                        <div className="text-xs text-green-600 flex items-center gap-0.5 justify-end">
                                          <Tag className="h-3 w-3" /> Hemat {formatRp(diskonCalc)}
                                        </div>
                                      </>
                                    ) : (
                                      <div className="font-bold text-lg">{formatRp(selectedPaket.harga)}</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 h-16 text-sm text-muted-foreground border border-border rounded-lg px-4">
                                <Loader2 className="h-4 w-4 animate-spin" /> Memuat paket...
                              </div>
                            )}
                            <input type="hidden" {...field} />
                            <FormMessage />
                          </div>
                        ) : (
                          /* Normal select when visiting /booking directly */
                          <div>
                            <FormLabel>Pilih Paket</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              disabled={loadingPaket}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue
                                    placeholder={loadingPaket ? "Memuat paket..." : "Pilih Paket Foto"}
                                  />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Array.isArray(paketList) &&
                                  paketList.map((paket) => (
                                    <SelectItem key={paket.id} value={paket.id}>
                                      {paket.namaPaket} — {formatRp(paket.harga)}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </div>
                        )}
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tanggalSesi"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Tanggal Pemotretan</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "EEEE, dd MMMM yyyy", { locale: idLocale })
                                ) : (
                                  <span>Pilih Tanggal</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-[min(calc(100vw-2rem),340px)] p-0 rounded-2xl shadow-xl border-border overflow-hidden"
                            align="start"
                            sideOffset={4}
                          >
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={(date) => {
                                field.onChange(date);
                                form.setValue("jamSesi", "");
                              }}
                              disabled={isDateDisabled}
                              className="w-full"
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="jamSesi"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jam Sesi</FormLabel>
                        {loadingJam ? (
                          <div className="flex items-center gap-2 h-10 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" /> Memuat jadwal...
                          </div>
                        ) : isDayClosed || isDateBlocked ? (
                          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted text-sm text-muted-foreground">
                            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
                            <div>
                              Studio tutup pada tanggal ini.
                              {blockedAlasan && <span className="block text-xs mt-0.5">{blockedAlasan}</span>}
                              <span className="block text-xs mt-0.5">Silakan pilih tanggal lain.</span>
                            </div>
                          </div>
                        ) : jamSlots.length > 0 ? (
                          <div className="space-y-2">
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Pilih jam tersedia" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {availableSlots.map((slot) => {
                                  const jam = `${slot.jamMulai} - ${slot.jamSelesai}`;
                                  return (
                                    <SelectItem key={jam} value={jam}>
                                      <div className="flex items-center gap-2">
                                        <Clock size={14} className="text-green-500" /> {jam}
                                      </div>
                                    </SelectItem>
                                  );
                                })}
                                {bookedSlots.length > 0 && (
                                  <>
                                    {availableSlots.length > 0 && (
                                      <div className="px-2 py-1 text-xs text-muted-foreground border-t border-border mt-1 pt-2">
                                        Sudah terpesan:
                                      </div>
                                    )}
                                    {bookedSlots.map((slot) => {
                                      const jam = `${slot.jamMulai} - ${slot.jamSelesai}`;
                                      return (
                                        <SelectItem key={jam} value={jam} disabled>
                                          <div className="flex items-center gap-2 text-muted-foreground">
                                            <XCircle size={14} className="text-red-400" /> {jam} — Terpesan
                                          </div>
                                        </SelectItem>
                                      );
                                    })}
                                  </>
                                )}
                              </SelectContent>
                            </Select>
                            {bookedSlots.length > 0 && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <XCircle className="h-3 w-3 text-red-400" />
                                {bookedSlots.length} slot sudah terpesan pada hari ini
                              </p>
                            )}
                          </div>
                        ) : (
                          <FormControl>
                            <Input
                              placeholder={
                                selectedTanggal
                                  ? "Belum ada jadwal tersedia — hubungi kami"
                                  : "Pilih tanggal terlebih dahulu"
                              }
                              readOnly={!!selectedTanggal}
                              {...field}
                            />
                          </FormControl>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="catatanPelanggan"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Catatan Khusus (Opsional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tema khusus, lokasi outdoor, kostum, dll."
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Summary harga — hanya tampil jika tidak locked (locked sudah tampil di card paket di atas) */}
              {selectedPaket && !isLockedPaket && (
                <div className="bg-muted p-4 rounded-lg border border-border space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm text-muted-foreground">Paket</div>
                      <div className="font-semibold">{selectedPaket.namaPaket}</div>
                      <div className="text-xs text-muted-foreground">
                        {selectedPaket.durasiSesi} menit · {selectedPaket.jumlahFoto} foto
                      </div>
                    </div>
                    <div className="text-right">
                      {diskonCalc > 0 ? (
                        <>
                          <div className="text-sm text-muted-foreground line-through">{formatRp(selectedPaket.harga)}</div>
                          <div className="font-bold text-2xl text-primary">{formatRp(totalAfterDiskon)}</div>
                          <div className="text-xs text-green-600 flex items-center gap-0.5 justify-end">
                            <Tag className="h-3 w-3" /> Hemat {formatRp(diskonCalc)}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-sm text-muted-foreground">Total Pembayaran</div>
                          <div className="font-bold text-2xl">{formatRp(selectedPaket.harga)}</div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-14 text-lg"
                disabled={createBooking.isPending}
              >
                {createBooking.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memproses...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-5 w-5" /> Konfirmasi Booking
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
