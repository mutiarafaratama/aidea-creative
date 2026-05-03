import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListPromo,
  getListPromoQueryKey,
  useCreatePromo,
  useUpdatePromo,
  useDeletePromo,
  type Promo,
} from "@workspace/api-client-react";
import { Plus, Pencil, Trash2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { SupabaseUploader } from "@/components/supabase-uploader";
import { adminFetch } from "@/lib/admin-api";
import { useToast } from "@/hooks/use-toast";

type PromoForm = {
  judul: string;
  deskripsi: string;
  badge: string;
  gambarUrl: string;
  tanggalMulai: string;
  tanggalBerakhir: string;
  isAktif: boolean;
  urutan: number;
};

const emptyForm: PromoForm = {
  judul: "",
  deskripsi: "",
  badge: "",
  gambarUrl: "",
  tanggalMulai: "",
  tanggalBerakhir: "",
  isAktif: true,
  urutan: 0,
};

const toForm = (p: Promo): PromoForm => ({
  judul: p.judul,
  deskripsi: p.deskripsi,
  badge: p.badge ?? "",
  gambarUrl: p.gambarUrl ?? "",
  tanggalMulai: p.tanggalMulai ? p.tanggalMulai.slice(0, 10) : "",
  tanggalBerakhir: p.tanggalBerakhir ? p.tanggalBerakhir.slice(0, 10) : "",
  isAktif: p.isAktif,
  urutan: p.urutan,
});

const toBody = (f: PromoForm) => ({
  judul: f.judul.trim(),
  deskripsi: f.deskripsi.trim(),
  badge: f.badge.trim() || null,
  gambarUrl: f.gambarUrl.trim() || null,
  link: null,
  ctaLabel: null,
  warna: "primary",
  tampilMarquee: true,
  tampilCard: true,
  tanggalMulai: f.tanggalMulai ? new Date(f.tanggalMulai).toISOString() : null,
  tanggalBerakhir: f.tanggalBerakhir ? new Date(f.tanggalBerakhir).toISOString() : null,
  isAktif: f.isAktif,
  urutan: Number(f.urutan) || 0,
});

export function AdminPromoManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useListPromo();
  const promos = Array.isArray(data) ? data : [];

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Promo | null>(null);
  const [form, setForm] = useState<PromoForm>(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState<Promo | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListPromoQueryKey() });

  const createMut = useCreatePromo();
  const updateMut = useUpdatePromo();
  const deleteMut = useDeletePromo();

  const handleOpenNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const handleOpenEdit = (p: Promo) => {
    setEditing(p);
    setForm(toForm(p));
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.judul.trim() || !form.deskripsi.trim()) {
      toast({ title: "Data tidak lengkap", description: "Judul dan deskripsi wajib diisi.", variant: "destructive" });
      return;
    }
    const body = toBody(form);
    const onSuccess = () => {
      toast({ title: editing ? "Promo diperbarui" : "Promo ditambahkan" });
      setOpen(false);
      invalidate();
    };
    const onError = () => toast({ title: "Gagal menyimpan promo", variant: "destructive" });

    if (editing) {
      updateMut.mutate({ id: editing.id, data: body }, { onSuccess, onError });
    } else {
      createMut.mutate({ data: body }, { onSuccess, onError });
    }
  };

  const handleDelete = () => {
    if (!confirmDelete) return;
    const oldImage = confirmDelete.gambarUrl;
    deleteMut.mutate({ id: confirmDelete.id }, {
      onSuccess: () => {
        toast({ title: "Promo dihapus" });
        setConfirmDelete(null);
        invalidate();
        if (oldImage && /\/storage\/v1\/object\/public\//.test(oldImage)) {
          adminFetch("/upload/supabase/destroy", { method: "POST", body: JSON.stringify({ url: oldImage, bucket: "promo" }) }).catch(() => {});
        }
      },
      onError: () => toast({ title: "Gagal menghapus", variant: "destructive" }),
    });
  };

  const handleToggleAktif = (p: Promo) => {
    updateMut.mutate(
      { id: p.id, data: toBody({ ...toForm(p), isAktif: !p.isAktif }) },
      {
        onSuccess: () => {
          toast({ title: !p.isAktif ? "Promo diaktifkan" : "Promo dinonaktifkan" });
          invalidate();
        },
      }
    );
  };

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="flex flex-row justify-between items-center">
        <div>
          <CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Manajemen Promo</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Kelola banner promo yang tampil di website. Promo aktif tampil di marquee atas dan section promo.</p>
        </div>
        <Button size="sm" onClick={handleOpenNew}><Plus className="mr-1 h-4 w-4" /> Tambah Promo</Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Judul</TableHead>
                <TableHead>Badge</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Belum ada promo. Klik "Tambah Promo" untuk membuat.</TableCell>
                </TableRow>
              ) : (
                promos.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="font-medium">{p.judul}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1 max-w-xs">{p.deskripsi}</div>
                    </TableCell>
                    <TableCell>{p.badge ? <Badge variant="outline">{p.badge}</Badge> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {p.tanggalMulai ? new Date(p.tanggalMulai).toLocaleDateString("id-ID") : "—"}
                      {" — "}
                      {p.tanggalBerakhir ? new Date(p.tanggalBerakhir).toLocaleDateString("id-ID") : "∞"}
                    </TableCell>
                    <TableCell>
                      <button onClick={() => handleToggleAktif(p)} className="inline-flex">
                        {p.isAktif ? (
                          <Badge className="bg-green-500/10 text-green-700 border-green-500/20 hover:bg-green-500/20" variant="outline">Aktif</Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">Nonaktif</Badge>
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => handleOpenEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete(p)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Edit/Create Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Promo" : "Tambah Promo Baru"}</DialogTitle>
            <DialogDescription>Promo aktif otomatis tampil di marquee atas dan section promo homepage.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="judul">Judul *</Label>
              <Input id="judul" value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deskripsi">Deskripsi *</Label>
              <Textarea id="deskripsi" rows={3} value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="badge">Badge</Label>
                <Input id="badge" placeholder="HEMAT 25%" value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="urutan">Urutan</Label>
                <Input id="urutan" type="number" value={form.urutan} onChange={(e) => setForm({ ...form, urutan: Number(e.target.value) })} />
              </div>
            </div>
            <SupabaseUploader
              bucket="promo"
              label="Gambar Promo"
              value={form.gambarUrl}
              onChange={(url) => setForm({ ...form, gambarUrl: url })}
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tanggalMulai">Tanggal Mulai</Label>
                <Input id="tanggalMulai" type="date" value={form.tanggalMulai} onChange={(e) => setForm({ ...form, tanggalMulai: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tanggalBerakhir">Tanggal Berakhir</Label>
                <Input id="tanggalBerakhir" type="date" value={form.tanggalBerakhir} onChange={(e) => setForm({ ...form, tanggalBerakhir: e.target.value })} />
              </div>
            </div>
            <label className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Aktif</p>
                <p className="text-xs text-muted-foreground">Tampilkan ke publik</p>
              </div>
              <Switch checked={form.isAktif} onCheckedChange={(v) => setForm({ ...form, isAktif: v })} />
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
                {createMut.isPending || updateMut.isPending ? "Menyimpan..." : editing ? "Simpan Perubahan" : "Tambah Promo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Promo?</DialogTitle>
            <DialogDescription>
              Promo "{confirmDelete?.judul}" akan dihapus permanen dan tidak bisa dikembalikan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMut.isPending}>
              {deleteMut.isPending ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
