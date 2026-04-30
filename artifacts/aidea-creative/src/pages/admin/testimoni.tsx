import { useEffect, useState } from "react";
import { Check, X, Star, Trash2 } from "lucide-react";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { adminFetch } from "@/lib/admin-api";

type Testi = { id: string; namaTampil: string; rating: number; komentar: string; isApproved: boolean; createdAt: string; fotoUrl?: string | null };

export default function AdminTestimoni() {
  const { toast } = useToast();
  const [items, setItems] = useState<Testi[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"semua" | "pending" | "approved">("semua");

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminFetch<Testi[]>("/testimoni?all=true");
      setItems(Array.isArray(res) ? res : []);
    } catch (err: any) { toast({ title: "Gagal", description: err?.message, variant: "destructive" }); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const setApproved = async (id: string, isApproved: boolean) => {
    try {
      await adminFetch(`/testimoni/${id}`, { method: "PATCH", body: JSON.stringify({ isApproved }) });
      toast({ title: isApproved ? "Testimoni disetujui" : "Testimoni disembunyikan" });
      load();
    } catch (err: any) { toast({ title: "Gagal", description: err?.message, variant: "destructive" }); }
  };
  const remove = async (id: string) => {
    if (!confirm("Hapus testimoni ini?")) return;
    try {
      await adminFetch(`/testimoni/${id}`, { method: "DELETE" });
      toast({ title: "Dihapus" });
      load();
    } catch (err: any) { toast({ title: "Gagal", description: err?.message, variant: "destructive" }); }
  };

  const filtered = items.filter((t) => filter === "semua" || (filter === "pending" ? !t.isApproved : t.isApproved));

  return (
    <AdminLayout title="Moderasi Testimoni" subtitle="Setujui atau tolak ulasan sebelum tampil di situs.">
      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="mb-4">
        <TabsList><TabsTrigger value="semua">Semua ({items.length})</TabsTrigger><TabsTrigger value="pending">Menunggu ({items.filter(t=>!t.isApproved).length})</TabsTrigger><TabsTrigger value="approved">Disetujui ({items.filter(t=>t.isApproved).length})</TabsTrigger></TabsList>
      </Tabs>
      {loading ? <Skeleton className="h-40 w-full" /> : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.length === 0 ? <p className="text-muted-foreground col-span-full">Tidak ada testimoni.</p> : filtered.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold">{t.namaTampil}</p>
                    <div className="flex items-center gap-0.5 mt-0.5">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3.5 w-3.5 ${i < t.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />)}</div>
                  </div>
                  {t.isApproved ? <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20" variant="outline">Tayang</Badge> : <Badge variant="outline">Menunggu</Badge>}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">"{t.komentar}"</p>
                <div className="flex gap-2">
                  {!t.isApproved ? (
                    <Button size="sm" onClick={() => setApproved(t.id, true)} className="bg-emerald-600 hover:bg-emerald-700"><Check className="mr-1 h-4 w-4" /> Setujui</Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setApproved(t.id, false)}><X className="mr-1 h-4 w-4" /> Sembunyikan</Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-red-600" onClick={() => remove(t.id)}><Trash2 className="mr-1 h-4 w-4" /> Hapus</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
