import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListPromo,
  getListPromoQueryKey,
  useCreatePromo,
  useUpdatePromo,
  useDeletePromo,
  useListPaket,
  type Promo,
} from "@workspace/api-client-react";
import { Plus, Pencil, Trash2, Sparkles, BadgePercent } from "lucide-react";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  paketId: string;
  tipeDiskon: string;
  nilaiDiskon: string;
  syarat: string;
  kuota: string;
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
  paketId: "",
  tipeDiskon: "",
  nilaiDiskon: "",
  syarat: "",
  kuota: "",
};

const toForm = (p: Promo & { paketId?: string | null; tipeDiskon?: string | null; nilaiDiskon?: number | null; syarat?: string | null; kuota?: number | null }): PromoForm => ({
  judul: p.judul,
  deskripsi: p.deskripsi,
  badge: p.badge ?? "",
  gambarUrl: p.gambarUrl ?? "",
  tanggalMulai: p.tanggalMulai ? p.tanggalMulai.slice(0, 10) : "",
  tanggalBerakhir: p.tanggalBerakhir ? p.tanggalBerakhir.slice(0, 10) : "",
  isAktif: p.isAktif,
  urutan: p.urutan,
  paketId: (p as any).paketId ?? "",
  tipeDiskon: (p as any).tipeDiskon ?? "",
  nilaiDiskon: (p as any).nilaiDiskon != null ? String((p as any).nilaiDiskon) : "",
  syarat: (p as any).syarat ?? "",
  kuota: (p as any).kuota != null ? String((p as any).kuota) : "",
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
  paketId: f.paketId || null,
  tipeDiskon: f.tipeDiskon || null,
  nilaiDiskon: f.nilaiDiskon ? Number(f.nilaiDiskon) : null,
  syarat: f.syarat.trim() || null,
  kuota: f.kuota ? Number(f.kuota) : null,
});

export function AdminPromoManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useListPromo();
  const { data: paketList } = useListPaket();
  const promos = Array.isArray(data) ? data : [];
  const pakets = Array.isArray(paketList) ? paketList : [];

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
    setForm(toForm(p as any));
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
      { id: p.id, data: toBody({ ...toForm(p as any), isAktif: !p.isAktif }) },
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
          <p className="text-xs text-muted-foreground mt-1">Kelola promo diskon booking. Promo aktif tampil di marquee atas, section promo, dan halaman detail.</p>
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
                <TableHead>Diskon</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead>Kuota</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Belum ada promo. Klik "Tambah Promo" untuk membuat.</TableCell>
                </TableRow>
              ) : (
                promos.map((p) => {
                  const pp = p as any;
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="font-medium">{p.judul}</div>
                        {p.badge && <Badge variant="outline" className="text-xs mt-0.5">{p.badge}</Badge>}
                        <div className="text-xs text-muted-foreground line-clamp-1 max-w-xs mt-0.5">{p.deskripsi}</div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {pp.tipeDiskon && pp.nilaiDiskon ? (
                          <div className="flex items-center gap-1 text-green-700">
                            <BadgePercent className="h-3.5 w-3.5" />
                            {pp.tipeDiskon === "persen"
                              ? `${pp.nilaiDiskon}%`
                              : `Rp ${Number(pp.nilaiDiskon).toLocaleString("id-ID")}`}
                            {pp.namaPaket && <span className="text-xs text-muted-foreground">({pp.namaPaket})</span>}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.tanggalMulai ? new Date(p.tanggalMulai).toLocaleDateString("id-ID") : "—"}
                        {" — "}
                        {p.tanggalBerakhir ? new Date(p.tanggalBerakhir).toLocaleDateString("id-ID") : "∞"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {pp.kuota != null ? (
                          <span>{pp.terpakai ?? 0}/{pp.kuota}</span>
                        ) : (
                          <span className="text-muted-foreground">∞</span>
                        )}
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
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Edit/Create Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Promo" : "Tambah Promo Baru"}</DialogTitle>
            <DialogDescription>Promo aktif otomatis tampil di marquee atas, section promo, dan bisa digunakan saat booking.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Informasi Dasar */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Informasi Promo</h4>
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
            </div>

            {/* Pengaturan Diskon */}
            <div className="space-y-3 pt-2 border-t border-border">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Pengaturan Diskon Booking</h4>
              <div className="space-y-2">
                <Label>Berlaku untuk Paket</Label>
                <Select value={form.paketId || "__all__"} onValueChange={(v) => setForm({ ...form, paketId: v === "__all__" ? "" : v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Semua paket" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Semua paket</SelectItem>
                    {pakets.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.namaPaket} — Rp {p.harga.toLocaleString("id-ID")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipe Diskon</Label>
                  <Select value={form.tipeDiskon || "__none__"} onValueChange={(v) => setForm({ ...form, tipeDiskon: v === "__none__" ? "" : v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tidak ada diskon" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Tidak ada diskon</SelectItem>
                      <SelectItem value="persen">Persentase (%)</SelectItem>
                      <SelectItem value="nominal">Nominal (Rp)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nilaiDiskon">
                    {form.tipeDiskon === "persen" ? "Nilai (%)" : form.tipeDiskon === "nominal" ? "Nilai (Rp)" : "Nilai"}
                  </Label>
                  <Input
                    id="nilaiDiskon"
                    type="number"
                    placeholder={form.tipeDiskon === "persen" ? "Contoh: 25" : "Contoh: 50000"}
                    value={form.nilaiDiskon}
                    onChange={(e) => setForm({ ...form, nilaiDiskon: e.target.value })}
                    disabled={!form.tipeDiskon}
                    min={0}
                    max={form.tipeDiskon === "persen" ? 100 : undefined}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="kuota">Kuota (kosongkan = tidak terbatas)</Label>
                <Input
                  id="kuota"
                  type="number"
                  placeholder="Contoh: 20"
                  value={form.kuota}
                  onChange={(e) => setForm({ ...form, kuota: e.target.value })}
                  min={1}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="syarat">Syarat & Ketentuan</Label>
                <Textarea
                  id="syarat"
                  rows={4}
                  placeholder={"- Berlaku untuk pelanggan baru\n- Tidak dapat digabung promo lain\n- Berlaku hari Senin–Jumat"}
                  value={form.syarat}
                  onChange={(e) => setForm({ ...form, syarat: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Satu syarat per baris. Akan tampil di halaman detail promo.</p>
              </div>
            </div>

            {/* Periode */}
            <div className="space-y-3 pt-2 border-t border-border">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Periode</h4>
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
                  <p className="text-xs text-muted-foreground">Tampilkan ke publik dan aktifkan diskon</p>
                </div>
                <Switch checked={form.isAktif} onCheckedChange={(v) => setForm({ ...form, isAktif: v })} />
              </label>
            </div>

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
