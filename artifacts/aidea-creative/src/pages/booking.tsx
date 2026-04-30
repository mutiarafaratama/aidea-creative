import { useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useListPaket, getListPaketQueryKey, useCreateBooking, useListJadwal, getListJadwalQueryKey } from "@workspace/api-client-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { CalendarIcon, Loader2, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

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

export default function Booking() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, profile } = useAuth();
  
  const { data: paketList, isLoading: loadingPaket } = useListPaket();
  const { data: jadwalList } = useListJadwal();
  const createBooking = useCreateBooking();

  const form = useForm<z.infer<typeof bookingSchema>>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      namaPemesan: "",
      email: "",
      telepon: "",
      catatanPelanggan: "",
      konsepFoto: "",
      paketId: "",
      jamSesi: "",
    },
  });

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const paketIdParam = searchParams.get('paket');
    if (paketIdParam) {
      form.setValue('paketId', paketIdParam);
    }
  }, [form]);

  useEffect(() => {
    if (!user) return;
    if (profile?.nama_lengkap) form.setValue("namaPemesan", profile.nama_lengkap);
    if (profile?.no_telepon) form.setValue("telepon", profile.no_telepon);
    if (user.email) form.setValue("email", user.email);
  }, [user, profile, form]);

  const onSubmit = (values: z.infer<typeof bookingSchema>) => {
    createBooking.mutate({
      data: {
        namaPemesan: values.namaPemesan,
        email: values.email,
        telepon: values.telepon,
        paketId: values.paketId,
        tanggalSesi: format(values.tanggalSesi, "yyyy-MM-dd"),
        jamSesi: values.jamSesi,
        catatanPelanggan: values.catatanPelanggan || undefined,
        konsepFoto: values.konsepFoto || undefined,
      }
    }, {
      onSuccess: (data) => {
        toast({
          title: "Booking Berhasil!",
          description: `Terima kasih! Kode booking Anda: ${data.kodeBooking}. Kami akan segera menghubungi Anda.`,
        });
        setLocation("/");
      },
      onError: () => {
        toast({
          title: "Gagal",
          description: "Terjadi kesalahan saat memproses booking Anda. Silakan coba lagi.",
          variant: "destructive"
        });
      }
    });
  };

  const selectedPaketId = form.watch("paketId");
  const selectedTanggal = form.watch("tanggalSesi");
  const selectedPaket = Array.isArray(paketList) ? paketList.find(p => p.id === selectedPaketId) : undefined;

  const jadwalArray = Array.isArray(jadwalList) ? jadwalList : [];
  const tanggalTersediaSet = new Set(jadwalArray.map((j) => j.tanggal));
  const jamTersedia = jadwalArray
    .filter(j => selectedTanggal && j.tanggal === format(selectedTanggal, "yyyy-MM-dd"))
    .map(j => `${j.jamMulai} - ${j.jamSelesai}`);

  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl min-h-screen flex items-center justify-center">
      <Card className="w-full border-border shadow-lg">
        <div className="bg-primary/5 p-8 border-b border-border text-center">
          <CardTitle className="text-3xl font-serif font-bold mb-2">Booking Jadwal</CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            Isi formulir di bawah ini untuk mereservasi jadwal pemotretan Anda.
          </CardDescription>
        </div>
        <CardContent className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Informasi Data Diri */}
                <div className="space-y-6">
                  <h3 className="font-serif font-semibold text-lg border-b border-border pb-2">Informasi Kontak</h3>
                  
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

                {/* Detail Pemesanan */}
                <div className="space-y-6">
                  <h3 className="font-serif font-semibold text-lg border-b border-border pb-2">Detail Reservasi</h3>

                  <FormField
                    control={form.control}
                    name="paketId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pilih Paket</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                          disabled={loadingPaket}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={loadingPaket ? "Memuat paket..." : "Pilih Paket Foto"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Array.isArray(paketList) && paketList.map((paket) => (
                              <SelectItem key={paket.id} value={paket.id}>
                                {paket.namaPaket} - Rp {paket.harga.toLocaleString('id-ID')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
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
                                variant={"outline"}
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
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={(date) => {
                                field.onChange(date);
                                form.setValue('jamSesi', '');
                              }}
                              disabled={(date) => {
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                if (date < today) return true;
                                const yyyy = date.getFullYear();
                                const mm = String(date.getMonth() + 1).padStart(2, "0");
                                const dd = String(date.getDate()).padStart(2, "0");
                                const key = `${yyyy}-${mm}-${dd}`;
                                // If we already have rule-derived availability, only enable open dates.
                                if (tanggalTersediaSet.size > 0 && !tanggalTersediaSet.has(key)) return true;
                                return false;
                              }}
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
                        {jamTersedia.length > 0 ? (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih jam tersedia" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {jamTersedia.map((jam) => (
                                <SelectItem key={jam} value={jam}>
                                  <div className="flex items-center gap-2">
                                    <Clock size={14} /> {jam}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <FormControl>
                            <Input 
                              placeholder={selectedTanggal ? "Tidak ada jadwal untuk tanggal ini — ketik manual" : "Pilih tanggal terlebih dahulu"} 
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

              {selectedPaket && (
                <div className="bg-muted p-4 rounded-lg flex justify-between items-center mt-8 border border-border">
                  <div>
                    <div className="text-sm text-muted-foreground">Total Pembayaran</div>
                    <div className="font-bold text-2xl">Rp {selectedPaket.harga.toLocaleString('id-ID')}</div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="text-sm font-medium">{selectedPaket.namaPaket}</div>
                    <div className="text-xs text-muted-foreground">{selectedPaket.durasiSesi} menit · {selectedPaket.jumlahFoto} foto</div>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full h-14 text-lg mt-8" disabled={createBooking.isPending}>
                {createBooking.isPending ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memproses...</>
                ) : (
                  <><CheckCircle2 className="mr-2 h-5 w-5" /> Konfirmasi Booking</>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
