import { useEffect, useState } from "react";
import { Camera, Loader2, LogOut, Save, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type BookingRow = {
  id: string;
  kode_booking: string;
  tanggal_sesi: string;
  jam_sesi: string;
  status: string;
  total_harga: number;
};

type PesananRow = {
  id: string;
  kode_pesanan: string;
  status: string;
  total_harga: number;
  created_at: string;
};

type TestimoniRow = {
  id: string;
  rating: number;
  komentar: string;
  is_approved: boolean;
  created_at: string;
};

export default function Profil() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { toast } = useToast();
  const [namaLengkap, setNamaLengkap] = useState("");
  const [noTelepon, setNoTelepon] = useState("");
  const [alamat, setAlamat] = useState("");
  const [fotoProfil, setFotoProfil] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [booking, setBooking] = useState<BookingRow[]>([]);
  const [pesanan, setPesanan] = useState<PesananRow[]>([]);
  const [testimoni, setTestimoni] = useState<TestimoniRow[]>([]);

  useEffect(() => {
    if (!profile) return;
    setNamaLengkap(profile.nama_lengkap ?? "");
    setNoTelepon(profile.no_telepon ?? "");
    setAlamat(profile.alamat ?? "");
    setFotoProfil(profile.foto_profil ?? "");
  }, [profile]);

  useEffect(() => {
    if (!supabase || !user) return;
    Promise.all([
      supabase
        .from("booking")
        .select("id,kode_booking,tanggal_sesi,jam_sesi,status,total_harga")
        .eq("pelanggan_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("pesanan_produk")
        .select("id,kode_pesanan,status,total_harga,created_at")
        .eq("pelanggan_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("testimoni")
        .select("id,rating,komentar,is_approved,created_at")
        .eq("pelanggan_id", user.id)
        .order("created_at", { ascending: false }),
    ]).then(([bookingResult, pesananResult, testimoniResult]) => {
      if (!bookingResult.error) setBooking((bookingResult.data ?? []) as BookingRow[]);
      if (!pesananResult.error) setPesanan((pesananResult.data ?? []) as PesananRow[]);
      if (!testimoniResult.error) setTestimoni((testimoniResult.data ?? []) as TestimoniRow[]);
    });
  }, [user]);

  const saveProfile = async () => {
    if (!supabase || !user) return;
    setIsSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        nama_lengkap: namaLengkap,
        no_telepon: noTelepon || null,
        alamat: alamat || null,
        foto_profil: fotoProfil || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    setIsSaving(false);
    if (error) {
      toast({ title: "Profil gagal disimpan", description: error.message, variant: "destructive" });
      return;
    }
    await refreshProfile();
    toast({ title: "Profil tersimpan", description: "Data profil Anda berhasil diperbarui." });
  };

  const uploadAvatar = async (file: File) => {
    if (!supabase || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Ukuran terlalu besar", description: "Maksimal 5MB.", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, cacheControl: "3600", contentType: file.type });
    if (uploadError) {
      setIsUploading(false);
      const msg = /not.found|bucket/i.test(uploadError.message)
        ? "Bucket 'avatars' belum dibuat di Supabase Storage. Buat bucket public bernama 'avatars' di dashboard Supabase."
        : uploadError.message;
      toast({ title: "Upload gagal", description: msg, variant: "destructive" });
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = data.publicUrl;
    setFotoProfil(publicUrl);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ foto_profil: publicUrl, updated_at: new Date().toISOString() })
      .eq("id", user.id);
    setIsUploading(false);
    if (updateError) {
      toast({ title: "Foto terunggah, tapi gagal disimpan", description: updateError.message, variant: "destructive" });
      return;
    }
    await refreshProfile();
    toast({ title: "Foto profil diperbarui", description: "Foto profil Anda berhasil disimpan." });
  };

  const initials = namaLengkap
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "AC";

  return (
    <div className="container mx-auto px-4 py-12 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-8">
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-3xl">Profil Saya</CardTitle>
            <CardDescription>Kelola data akun, riwayat booking, pesanan produk, dan testimoni Anda.</CardDescription>
            {user?.email && (
              <p className="text-xs text-muted-foreground mt-2">Masuk sebagai <span className="font-medium text-foreground">{user.email}</span>{user.created_at ? <> · Bergabung sejak {new Date(user.created_at).toLocaleDateString("id-ID", { year: "numeric", month: "long" })}</> : null}{profile?.role === "admin" && <span className="ml-2 inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">Admin</span>}</p>
            )}
          </CardHeader>
          <CardContent className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
            <div className="space-y-4">
              <Avatar className="h-32 w-32 mx-auto border border-border">
                <AvatarImage src={fotoProfil} />
                <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
              </Avatar>
              <Label className="block">
                <span className="sr-only">Upload foto profil</span>
                <Input type="file" accept="image/*" className="hidden" onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) uploadAvatar(file);
                }} />
                <Button type="button" variant="outline" className="w-full" disabled={isUploading} asChild>
                  <span>{isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />} Upload Foto Profil</span>
                </Button>
              </Label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="namaLengkap">Nama Lengkap</Label>
                <Input id="namaLengkap" value={namaLengkap} onChange={(event) => setNamaLengkap(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="noTelepon">No Telepon</Label>
                <Input id="noTelepon" value={noTelepon} onChange={(event) => setNoTelepon(event.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="alamat">Alamat</Label>
                <Textarea id="alamat" value={alamat} onChange={(event) => setAlamat(event.target.value)} />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <Button onClick={saveProfile} disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Simpan Profil
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="booking" className="w-full">
          <TabsList className="mb-4 flex-wrap h-auto">
            <TabsTrigger value="booking">Riwayat Booking</TabsTrigger>
            <TabsTrigger value="pesanan">Pesanan Produk</TabsTrigger>
            <TabsTrigger value="testimoni">Testimoni Saya</TabsTrigger>
          </TabsList>
          <TabsContent value="booking">
            <Card>
              <CardContent className="p-0 divide-y divide-border">
                {booking.length === 0 ? <EmptyState text="Belum ada booking." /> : booking.map((item) => (
                  <HistoryRow key={item.id} title={item.kode_booking} subtitle={`${item.tanggal_sesi} · ${item.jam_sesi}`} status={item.status} amount={item.total_harga} />
                ))}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="pesanan">
            <Card>
              <CardContent className="p-0 divide-y divide-border">
                {pesanan.length === 0 ? <EmptyState text="Belum ada pesanan produk." /> : pesanan.map((item) => (
                  <HistoryRow key={item.id} title={item.kode_pesanan} subtitle={new Date(item.created_at).toLocaleDateString("id-ID")} status={item.status} amount={item.total_harga} />
                ))}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="testimoni">
            <Card>
              <CardContent className="p-0 divide-y divide-border">
                {testimoni.length === 0 ? <EmptyState text="Belum ada testimoni." /> : testimoni.map((item) => (
                  <div key={item.id} className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <div className="font-medium">{item.rating}/5</div>
                      <p className="text-sm text-muted-foreground">{item.komentar}</p>
                    </div>
                    <Badge variant={item.is_approved ? "default" : "outline"}>{item.is_approved ? "Disetujui" : "Menunggu Review"}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="font-semibold text-foreground">Keluar dari akun</p>
              <p className="text-sm text-muted-foreground">Sesi Anda akan diakhiri di perangkat ini. Anda perlu login lagi untuk mengakses halaman pribadi.</p>
            </div>
            <Button
              variant="outline"
              onClick={async () => {
                setIsSigningOut(true);
                try { await signOut(); } finally { setIsSigningOut(false); }
              }}
              disabled={isSigningOut}
              className="rounded-full border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground self-start sm:self-auto"
            >
              {isSigningOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
              Keluar dari Akun
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="p-8 text-center text-muted-foreground">
      <Camera className="mx-auto mb-3 h-8 w-8 opacity-50" />
      {text}
    </div>
  );
}

function HistoryRow({
  title,
  subtitle,
  status,
  amount,
}: {
  title: string;
  subtitle: string;
  status: string;
  amount: number;
}) {
  return (
    <div className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-sm text-muted-foreground">{subtitle}</div>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant="outline">{status}</Badge>
        <div className="font-semibold">Rp {amount.toLocaleString("id-ID")}</div>
      </div>
    </div>
  );
}