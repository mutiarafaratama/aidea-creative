import { useState } from "react";
import { useListProduk, getListProdukQueryKey, useCreateProduk, useUpdateProduk, useDeleteProduk } from "@workspace/api-client-react";
import { adminFetch } from "@/lib/admin-api";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Sparkles, Loader2, ImageOff } from "lucide-react";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { SupabaseMultiUploader } from "@/components/supabase-multi-uploader";
import { QueryError } from "@/components/query-error";

const kategoriOptions = ["album", "frame", "cetak", "aksesoris", "lainnya"];

type ProdukForm = {
  namaProduk: string;
  deskripsi: string;
  harga: number | string;
  stok: number | string;
  kategori: string;
  ukuran?: string;
  gambarUrl: string[];
  isAktif: boolean;
};

const emptyForm: ProdukForm = {
  namaProduk: "",
  deskripsi: "",
  harga: 0,
  stok: 0,
  kategori: "album",
  ukuran: "",
  gambarUrl: [],
  isAktif: true,
};

function destroySupabaseUrl(url: string) {
  if (!url || !/\/storage\/v1\/object\/public\//.test(url)) return;
  adminFetch("/upload/supabase/destroy", {
    method: "POST",
    body: JSON.stringify({ url }),
  }).catch(() => {});
}

export default function AdminProduk() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading, error, refetch, isFetching } = useListProduk();
  const createM = useCreateProduk();
  const updateM = useUpdateProduk();
  const deleteM = useDeleteProduk();
  const [aiPending, setAiPending] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ProdukForm>(emptyForm);
  // Track URLs that existed when the dialog opened — used to clean up images
  // the admin removed from an existing product upon save.
  const [originalUrls, setOriginalUrls] = useState<string[]>([]);

  const items = Array.isArray(data) ? data : [];

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setOriginalUrls([]);
    setOpen(true);
  };

  const openEdit = (p: any) => {
    setEditing(p);
    const urls = Array.isArray(p.gambarUrl) ? p.gambarUrl.filter(Boolean) : [];
    setForm({
      namaProduk: p.namaProduk ?? "",
      deskripsi: p.deskripsi ?? "",
      harga: p.harga ?? 0,
      stok: p.stok ?? 0,
      kategori: p.kategori ?? "album",
      ukuran: p.ukuran ?? "",
      gambarUrl: urls,
      isAktif: p.isAktif ?? true,
    });
    setOriginalUrls(urls);
    setOpen(true);
  };

  const closeDialog = () => {
    // If the admin uploaded new images then cancelled, drop the orphans.
    const newlyUploaded = form.gambarUrl.filter((u) => !originalUrls.includes(u));
    newlyUploaded.forEach(destroySupabaseUrl);
    setOpen(false);
  };

  const save = () => {
    if (!form.namaProduk.trim()) {
      toast({ title: "Nama produk wajib diisi", variant: "destructive" });
      return;
    }
    const payload = {
      ...form,
      ukuran: form.ukuran || null,
      harga: Number(form.harga) || 0,
      stok: Number(form.stok) || 0,
      gambarUrl: form.gambarUrl.filter(Boolean),
    };
    const onSuccess = () => {
      toast({ title: editing ? "Produk diperbarui" : "Produk ditambahkan" });
      qc.invalidateQueries({ queryKey: getListProdukQueryKey() });
      // Clean up images the admin removed from the original product.
      if (editing) {
        const removed = originalUrls.filter((u) => !form.gambarUrl.includes(u));
        removed.forEach(destroySupabaseUrl);
      }
      setOpen(false);
    };
    if (editing) updateM.mutate({ id: editing.id, data: payload as any }, { onSuccess });
    else createM.mutate({ data: payload as any }, { onSuccess });
  };

  const remove = (p: any) => {
    if (!confirm(`Hapus produk "${p.namaProduk}"?`)) return;
    const urls: string[] = Array.isArray(p.gambarUrl) ? p.gambarUrl : [];
    deleteM.mutate(
      { id: p.id },
      {
        onSuccess: () => {
          toast({ title: "Produk dihapus" });
          qc.invalidateQueries({ queryKey: getListProdukQueryKey() });
          urls.forEach(destroySupabaseUrl);
        },
      },
    );
  };

  const generateDesc = async () => {
    if (!form.namaProduk) {
      toast({ title: "Isi nama produk dulu", variant: "destructive" });
      return;
    }
    setAiPending(true);
    try {
      const res = await adminFetch<{ text: string }>("/ai/generate", {
        method: "POST",
        body: JSON.stringify({
          system: "Kamu copywriter studio foto. Tulis deskripsi produk yang singkat (2-3 kalimat), menarik, casual, dan persuasif dalam Bahasa Indonesia. Jawab langsung tanpa pembuka, tanpa tanda kutip.",
          prompt: `Tulis deskripsi produk studio foto:\nNama: ${form.namaProduk}\nKategori: ${form.kategori || "umum"}${form.ukuran ? `\nUkuran: ${form.ukuran}` : ""}`,
          maxTokens: 250,
        }),
      });
      const text = (res?.text ?? "").trim();
      if (!text) {
        toast({ title: "AI belum berhasil membuat teks", description: "Coba sekali lagi.", variant: "destructive" });
      } else {
        setForm((f) => ({ ...f, deskripsi: text }));
      }
    } catch (err: any) {
      toast({ title: "AI tidak tersedia", description: err?.message ?? "Coba lagi sebentar.", variant: "destructive" });
    } finally {
      setAiPending(false);
    }
  };

  return (
    <AdminLayout title="Manajemen Produk" subtitle="Kelola produk toko + AI pembuat deskripsi.">
      <div className="flex justify-end mb-4">
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" /> Tambah Produk
        </Button>
      </div>
      {error && !isFetching && (
        <div className="mb-4">
          <QueryError
            error={error}
            onRetry={() => refetch()}
            title="Gagal memuat daftar produk"
          />
        </div>
      )}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-6 space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Foto</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Harga</TableHead>
                  <TableHead>Stok</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      Belum ada produk.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((p: any) => {
                    const firstImg = Array.isArray(p.gambarUrl) ? p.gambarUrl[0] : null;
                    const count = Array.isArray(p.gambarUrl) ? p.gambarUrl.length : 0;
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="relative h-12 w-12 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                            {firstImg ? (
                              <img src={firstImg} alt={p.namaProduk} className="h-full w-full object-cover" />
                            ) : (
                              <ImageOff className="h-4 w-4 text-muted-foreground/60" />
                            )}
                            {count > 1 && (
                              <span className="absolute -bottom-1 -right-1 text-[9px] px-1 rounded bg-foreground text-background">
                                +{count - 1}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{p.namaProduk}</div>
                          <div className="text-xs text-muted-foreground line-clamp-1 max-w-xs">{p.deskripsi}</div>
                        </TableCell>
                        <TableCell className="capitalize">{p.kategori}</TableCell>
                        <TableCell>Rp {Number(p.harga).toLocaleString("id-ID")}</TableCell>
                        <TableCell>{p.stok}</TableCell>
                        <TableCell>
                          {p.isAktif ? (
                            <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20" variant="outline">
                              Aktif
                            </Badge>
                          ) : (
                            <Badge variant="outline">Nonaktif</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="text-red-600" onClick={() => remove(p)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : closeDialog())}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Produk" : "Tambah Produk"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nama Produk</Label>
              <Input value={form.namaProduk} onChange={(e) => setForm({ ...form, namaProduk: e.target.value })} />
            </div>

            <SupabaseMultiUploader
              value={form.gambarUrl}
              onChange={(urls) => setForm((f) => ({ ...f, gambarUrl: urls }))}
              folder="produk"
              bucket="produk"
              label="Foto Produk"
              max={8}
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Kategori</Label>
                <Select value={form.kategori} onValueChange={(v) => setForm({ ...form, kategori: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {kategoriOptions.map((k) => (
                      <SelectItem key={k} value={k} className="capitalize">
                        {k}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Harga (Rp)</Label>
                <Input type="number" value={form.harga} onChange={(e) => setForm({ ...form, harga: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Stok</Label>
                <Input type="number" value={form.stok} onChange={(e) => setForm({ ...form, stok: e.target.value })} />
              </div>
              <div>
                <Label>Ukuran</Label>
                <Input
                  value={form.ukuran ?? ""}
                  onChange={(e) => setForm({ ...form, ukuran: e.target.value })}
                  placeholder="10x15, A4, dll"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Deskripsi</Label>
                <Button type="button" size="sm" variant="ghost" onClick={generateDesc} disabled={aiPending}>
                  {aiPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                  AI Generate
                </Button>
              </div>
              <Textarea rows={4} value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isAktif}
                onChange={(e) => setForm({ ...form, isAktif: e.target.checked })}
              />
              Tampilkan produk di toko (aktif)
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Batal
            </Button>
            <Button onClick={save} disabled={createM.isPending || updateM.isPending}>
              {(createM.isPending || updateM.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
