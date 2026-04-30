import { useState } from "react";
import { useListPortfolio, getListPortfolioQueryKey, useCreatePortfolio, useDeletePortfolio } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Loader2, Star } from "lucide-react";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SupabaseUploader } from "@/components/supabase-uploader";
import { adminFetch } from "@/lib/admin-api";
import { useToast } from "@/hooks/use-toast";
import { QueryError } from "@/components/query-error";

export default function AdminPortfolio() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading, error, refetch, isFetching } = useListPortfolio();
  const createM = useCreatePortfolio();
  const deleteM = useDeletePortfolio();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ judul: "", deskripsi: "", kategori: "wedding", gambarUrl: [""], tags: [], isFeatured: false });

  const items = Array.isArray(data) ? data : [];

  const save = () => {
    const payload = { ...form, gambarUrl: form.gambarUrl.filter(Boolean), tags: Array.isArray(form.tags) ? form.tags : String(form.tags).split(",").map((t: string) => t.trim()).filter(Boolean) };
    createM.mutate({ data: payload }, {
      onSuccess: () => { toast({ title: "Portfolio ditambahkan" }); qc.invalidateQueries({ queryKey: getListPortfolioQueryKey() }); setOpen(false); setForm({ judul: "", deskripsi: "", kategori: "wedding", gambarUrl: [""], tags: [], isFeatured: false }); },
    });
  };

  const remove = (id: string, urls: string[]) => {
    if (!confirm("Hapus portfolio ini?")) return;
    deleteM.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Portfolio dihapus" });
        qc.invalidateQueries({ queryKey: getListPortfolioQueryKey() });
        // Best-effort: drop the underlying storage assets too.
        urls.filter(Boolean).forEach((u) => {
          if (/\/storage\/v1\/object\/public\//.test(u)) {
            adminFetch("/upload/supabase/destroy", { method: "POST", body: JSON.stringify({ url: u, bucket: "portfolio" }) }).catch(() => {});
          } else if (/cloudinary\.com/i.test(u)) {
            // Legacy assets uploaded to Cloudinary before migration.
            adminFetch("/upload/cloudinary/destroy", { method: "POST", body: JSON.stringify({ url: u }) }).catch(() => {});
          }
        });
      },
    });
  };

  return (
    <AdminLayout title="Manajemen Portfolio" subtitle="Foto hasil kerja — tampil di homepage & halaman login.">
      <div className="flex justify-end mb-4"><Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> Tambah Portfolio</Button></div>
      {error && !isFetching && (
        <div className="mb-4"><QueryError error={error} onRetry={() => refetch()} title="Gagal memuat portfolio" /></div>
      )}
      {isLoading ? <Skeleton className="h-40 w-full" /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.length === 0 ? <p className="text-muted-foreground col-span-full">Belum ada portfolio.</p> : items.map((p: any) => {
            const firstImg = Array.isArray(p.gambarUrl) ? p.gambarUrl[0] : null;
            return (
              <Card key={p.id} className="overflow-hidden group">
                <div className="aspect-[4/3] bg-muted relative">
                  {firstImg && <img src={firstImg} alt={p.judul} className="w-full h-full object-cover" />}
                  {p.isFeatured && <Badge className="absolute top-2 left-2 bg-amber-500 text-white"><Star className="h-3 w-3 mr-1" /> Featured</Badge>}
                  <Button size="icon" variant="destructive" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition" onClick={() => remove(p.id, Array.isArray(p.gambarUrl) ? p.gambarUrl : [])}><Trash2 className="h-4 w-4" /></Button>
                </div>
                <CardContent className="p-4">
                  <p className="font-semibold">{p.judul}</p>
                  <p className="text-xs text-muted-foreground capitalize">{p.kategori}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.deskripsi}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah Portfolio</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Judul</Label><Input value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} /></div>
            <div><Label>Kategori</Label><Input value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value })} placeholder="wedding, family, graduation, product..." /></div>
            <SupabaseUploader
              bucket="portfolio"
              label="Foto Portfolio"
              value={form.gambarUrl[0]}
              onChange={(url) => setForm({ ...form, gambarUrl: [url] })}
            />
            <div><Label>Deskripsi</Label><Textarea rows={3} value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} /></div>
            <div><Label>Tags (pisah koma)</Label><Input value={Array.isArray(form.tags) ? form.tags.join(", ") : form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} /> Jadikan featured (tampil di homepage)</label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={save} disabled={createM.isPending}>{createM.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
