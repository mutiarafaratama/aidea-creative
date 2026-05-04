import { useState } from "react";
import { useListPortfolio, getListPortfolioQueryKey, useCreatePortfolio, useDeletePortfolio } from "@workspace/api-client-react";
import type { Portfolio } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Pencil, Loader2, Star } from "lucide-react";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SupabaseUploader } from "@/components/supabase-uploader";
import { adminFetch } from "@/lib/admin-api";
import { useToast } from "@/hooks/use-toast";
import { QueryError } from "@/components/query-error";

type PortfolioForm = {
  judul: string;
  deskripsi: string;
  kategori: string;
  gambarUrl: string;
  tags: string;
  isFeatured: boolean;
};

const emptyForm: PortfolioForm = {
  judul: "",
  deskripsi: "",
  kategori: "wedding",
  gambarUrl: "",
  tags: "",
  isFeatured: false,
};

export default function AdminPortfolio() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading, error, refetch, isFetching } = useListPortfolio();
  const createM = useCreatePortfolio();
  const deleteM = useDeletePortfolio();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Portfolio | null>(null);
  const [form, setForm] = useState<PortfolioForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const items: Portfolio[] = Array.isArray(data) ? data : [];

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (p: Portfolio) => {
    setEditing(p);
    setForm({
      judul: p.judul,
      deskripsi: p.deskripsi ?? "",
      kategori: p.kategori,
      gambarUrl: Array.isArray(p.gambarUrl) ? p.gambarUrl[0] ?? "" : "",
      tags: Array.isArray(p.tags) ? p.tags.join(", ") : "",
      isFeatured: p.isFeatured,
    });
    setOpen(true);
  };

  const buildPayload = () => ({
    judul: form.judul.trim(),
    deskripsi: form.deskripsi.trim() || undefined,
    kategori: form.kategori.trim() || "wedding",
    gambarUrl: form.gambarUrl ? [form.gambarUrl] : [],
    tags: form.tags
      ? form.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [],
    isFeatured: form.isFeatured,
  });

  const save = async () => {
    if (!form.judul.trim()) {
      toast({ title: "Judul wajib diisi", variant: "destructive" });
      return;
    }

    if (editing) {
      setSaving(true);
      try {
        await adminFetch(`/portfolio/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(buildPayload()),
        });
        toast({ title: "Portfolio diperbarui" });
        qc.invalidateQueries({ queryKey: getListPortfolioQueryKey() });
        setOpen(false);
      } catch {
        toast({ title: "Gagal menyimpan", variant: "destructive" });
      } finally {
        setSaving(false);
      }
    } else {
      createM.mutate(
        { data: buildPayload() as any },
        {
          onSuccess: () => {
            toast({ title: "Portfolio ditambahkan" });
            qc.invalidateQueries({ queryKey: getListPortfolioQueryKey() });
            setOpen(false);
          },
          onError: () => toast({ title: "Gagal menyimpan", variant: "destructive" }),
        }
      );
    }
  };

  const remove = (p: Portfolio) => {
    if (!confirm("Hapus portfolio ini?")) return;
    deleteM.mutate(
      { id: p.id },
      {
        onSuccess: () => {
          toast({ title: "Portfolio dihapus" });
          qc.invalidateQueries({ queryKey: getListPortfolioQueryKey() });
          const urls = Array.isArray(p.gambarUrl) ? p.gambarUrl : [];
          urls.filter(Boolean).forEach((u) => {
            adminFetch("/upload/supabase/destroy", {
              method: "POST",
              body: JSON.stringify({ url: u }),
            }).catch(() => {});
          });
        },
        onError: () => toast({ title: "Gagal menghapus", variant: "destructive" }),
      }
    );
  };

  const isPending = saving || createM.isPending;

  return (
    <AdminLayout title="Manajemen Portfolio" subtitle="Foto hasil kerja — tampil di homepage & halaman portfolio.">
      <div className="flex justify-end mb-4">
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" /> Tambah Portfolio
        </Button>
      </div>

      {error && !isFetching && (
        <div className="mb-4">
          <QueryError error={error} onRetry={() => refetch()} title="Gagal memuat portfolio" />
        </div>
      )}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="aspect-[4/3] rounded-xl" />)}
        </div>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-center py-16">Belum ada portfolio. Klik "Tambah Portfolio" untuk mulai.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((p) => {
            const firstImg = Array.isArray(p.gambarUrl) ? p.gambarUrl[0] : null;
            return (
              <Card key={p.id} className="overflow-hidden group">
                <div className="aspect-[4/3] bg-muted relative">
                  {firstImg && (
                    <img src={firstImg} alt={p.judul} className="w-full h-full object-cover" />
                  )}
                  {p.isFeatured && (
                    <Badge className="absolute top-2 left-2 bg-amber-500 text-white gap-1">
                      <Star className="h-3 w-3" /> Featured
                    </Badge>
                  )}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8"
                      onClick={() => openEdit(p)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      className="h-8 w-8"
                      onClick={() => remove(p)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <CardContent className="p-4">
                  <p className="font-semibold">{p.judul}</p>
                  <p className="text-xs text-muted-foreground capitalize">{p.kategori}</p>
                  {p.deskripsi && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.deskripsi}</p>
                  )}
                  {p.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {p.tags.map((t) => (
                        <span key={t} className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Portfolio" : "Tambah Portfolio"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label>Judul *</Label>
              <Input
                value={form.judul}
                onChange={(e) => setForm({ ...form, judul: e.target.value })}
                placeholder="Wedding Romansa 2025"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Kategori</Label>
              <Input
                value={form.kategori}
                onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                placeholder="wedding, family, graduation, product..."
              />
            </div>

            <SupabaseUploader
              bucket="portfolio"
              label="Foto Portfolio"
              value={form.gambarUrl}
              onChange={(url) => setForm({ ...form, gambarUrl: url })}
            />

            <div className="space-y-1.5">
              <Label>Deskripsi</Label>
              <Textarea
                rows={3}
                value={form.deskripsi}
                onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
                placeholder="Cerita singkat tentang sesi foto ini..."
              />
            </div>

            <div className="space-y-1.5">
              <Label>Tags (pisah koma)</Label>
              <Input
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="outdoor, sunset, couple"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Featured</p>
                <p className="text-xs text-muted-foreground">Tampilkan di homepage & section unggulan</p>
              </div>
              <Switch
                checked={form.isFeatured}
                onCheckedChange={(v) => setForm({ ...form, isFeatured: v })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={save} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Perbarui" : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
