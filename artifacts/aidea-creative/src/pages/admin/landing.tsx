import { useEffect, useState } from "react";
import { Save, Loader2 } from "lucide-react";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { SupabaseUploader } from "@/components/supabase-uploader";
import { useToast } from "@/hooks/use-toast";
import { adminFetch } from "@/lib/admin-api";

type Settings = {
  heroImage?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroBadge?: string;
  loginBgImage?: string;
  aboutTitle?: string;
  aboutText?: string;
  contactWhatsapp?: string;
  contactEmail?: string;
  contactAddress?: string;
  instagramUrl?: string;
};

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function AdminLanding() {
  const { toast } = useToast();
  const [s, setS] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/settings`);
      const data = await res.json();
      setS(data ?? {});
    } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      await adminFetch("/admin/settings", { method: "PUT", body: JSON.stringify(s) });
      toast({ title: "Pengaturan disimpan", description: "Perubahan langsung tampil di situs." });
    } catch (err: any) {
      toast({ title: "Gagal menyimpan", description: err?.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const upd = (k: keyof Settings, v: string) => setS({ ...s, [k]: v });

  if (loading) return <AdminLayout title="Kelola Konten Landing Page"><Skeleton className="h-96 w-full" /></AdminLayout>;

  return (
    <AdminLayout title="Kelola Konten Landing Page" subtitle="Atur teks, gambar hero, dan background halaman login. Perubahan langsung tampil — tidak mengubah tata letak.">
      <div className="space-y-6 max-w-4xl">
        <Card>
          <CardHeader><CardTitle>Hero Section (Beranda)</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              <strong className="text-foreground">Foto kolase di hero homepage</strong> diambil otomatis dari menu{" "}
              <strong className="text-foreground">Portfolio</strong>. Tambah/hapus foto di sana dan ditandai
              <strong className="text-foreground"> Featured</strong> agar tampil paling depan.
            </div>
            <SupabaseUploader
              bucket="landing"
              folder="hero"
              label="Gambar Sampul Tambahan (opsional)"
              value={s.heroImage}
              onChange={(v) => upd("heroImage", v)}
            />
            <div className="grid md:grid-cols-2 gap-4">
              <div><Label>Badge Atas</Label><Input value={s.heroBadge ?? ""} onChange={(e) => upd("heroBadge", e.target.value)} placeholder="Studio Foto #1 di Pringsewu" /></div>
              <div><Label>Judul Hero (opsional)</Label><Input value={s.heroTitle ?? ""} onChange={(e) => upd("heroTitle", e.target.value)} placeholder="Abadikan momenmu..." /></div>
            </div>
            <div><Label>Sub-judul Hero</Label><Textarea rows={2} value={s.heroSubtitle ?? ""} onChange={(e) => upd("heroSubtitle", e.target.value)} placeholder="Studio foto profesional dengan paket lengkap..." /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Halaman Login</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <SupabaseUploader
              bucket="landing"
              folder="login"
              label="Background panel kanan halaman login (akan menggantikan gallery default jika diisi)"
              value={s.loginBgImage}
              onChange={(v) => upd("loginBgImage", v)}
            />
            <p className="text-xs text-muted-foreground">Tip: gunakan gambar potret beresolusi tinggi (min. 1200px) untuk hasil terbaik.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Tentang & Kontak</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Judul Tentang</Label><Input value={s.aboutTitle ?? ""} onChange={(e) => upd("aboutTitle", e.target.value)} placeholder="Tentang AideaCreative" /></div>
            <div><Label>Teks Tentang</Label><Textarea rows={4} value={s.aboutText ?? ""} onChange={(e) => upd("aboutText", e.target.value)} /></div>
            <div className="grid md:grid-cols-2 gap-4">
              <div><Label>Nomor WhatsApp</Label><Input value={s.contactWhatsapp ?? ""} onChange={(e) => upd("contactWhatsapp", e.target.value)} placeholder="6281234567890" /></div>
              <div><Label>Email</Label><Input value={s.contactEmail ?? ""} onChange={(e) => upd("contactEmail", e.target.value)} placeholder="hello@aideacreative.id" /></div>
            </div>
            <div><Label>Alamat</Label><Textarea rows={2} value={s.contactAddress ?? ""} onChange={(e) => upd("contactAddress", e.target.value)} placeholder="Pujodadi, Pringsewu, Lampung" /></div>
            <div><Label>URL Instagram</Label><Input value={s.instagramUrl ?? ""} onChange={(e) => upd("instagramUrl", e.target.value)} placeholder="https://instagram.com/aideacreative" /></div>
          </CardContent>
        </Card>

        <div className="flex justify-end sticky bottom-4">
          <Button onClick={save} disabled={saving} size="lg" className="shadow-lg">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Simpan Semua Perubahan
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
