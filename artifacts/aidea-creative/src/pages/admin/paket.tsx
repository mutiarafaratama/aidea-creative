import { useState, useRef } from "react";
import {
  useListPaket, getListPaketQueryKey, useCreatePaket, useUpdatePaket, useDeletePaket,
  useListKategori,
} from "@workspace/api-client-react";
import { adminFetch } from "@/lib/admin-api";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Sparkles, Loader2, GripVertical, X, ImageOff } from "lucide-react";
import { AppImage } from "@/components/app-image";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { QueryError } from "@/components/query-error";
import { SupabaseUploader } from "@/components/supabase-uploader";

type PaketForm = {
  namaPaket: string;
  deskripsi: string;
  harga: number | string;
  durasiSesi: number | string;
  jumlahFoto: number | string;
  fasilitas: string[];
  fotoUrl: string;
  isPopuler: boolean;
  isAktif: boolean;
  kategoriId: string;
};

const emptyForm: PaketForm = {
  namaPaket: "",
  deskripsi: "",
  harga: 0,
  durasiSesi: 60,
  jumlahFoto: 20,
  fasilitas: [],
  fotoUrl: "",
  isPopuler: false,
  isAktif: true,
  kategoriId: "",
};

export default function AdminPaket() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading, error, refetch, isFetching } = useListPaket();
  const { data: kategoriData } = useListKategori();
  const createM = useCreatePaket();
  const updateM = useUpdatePaket();
  const deleteM = useDeletePaket();

  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PaketForm>(emptyForm);
  const [fasilitasInput, setFasilitasInput] = useState("");
  const [aiPending, setAiPending] = useState(false);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const dragIdxRef = useRef<number | null>(null);

  const items = Array.isArray(data) ? data : [];
  const kategoriList = Array.isArray(kategoriData) ? kategoriData : [];

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setFasilitasInput("");
    setOpen(true);
  };

  const openEdit = (p: any) => {
    setEditing(p);
    setForm({
      namaPaket: p.namaPaket ?? "",
      deskripsi: p.deskripsi ?? "",
      harga: p.harga ?? 0,
      durasiSesi: p.durasiSesi ?? 60,
      jumlahFoto: p.jumlahFoto ?? 20,
      fasilitas: Array.isArray(p.fasilitas) ? [...p.fasilitas] : [],
      fotoUrl: p.fotoUrl ?? "",
      isPopuler: p.isPopuler ?? false,
      isAktif: p.isAktif ?? true,
      kategoriId: p.kategoriId ?? "",
    });
    setFasilitasInput("");
    setOpen(true);
  };

  const addFasilitas = () => {
    const val = fasilitasInput.trim();
    if (!val) return;
    setForm(f => ({ ...f, fasilitas: [...f.fasilitas, val] }));
    setFasilitasInput("");
  };

  const removeFasilitas = (idx: number) => {
    setForm(f => ({ ...f, fasilitas: f.fasilitas.filter((_, i) => i !== idx) }));
  };

  const save = () => {
    if (!form.namaPaket.trim()) {
      toast({ title: "Nama paket wajib diisi", variant: "destructive" });
      return;
    }
    const payload = {
      namaPaket: form.namaPaket.trim(),
      deskripsi: form.deskripsi.trim(),
      harga: Number(form.harga) || 0,
      durasiSesi: Number(form.durasiSesi) || 60,
      jumlahFoto: Number(form.jumlahFoto) || 20,
      fasilitas: form.fasilitas,
      fotoUrl: form.fotoUrl || null,
      isPopuler: form.isPopuler,
      isAktif: form.isAktif,
      kategoriId: form.kategoriId || null,
    };
    const onSuccess = () => {
      toast({ title: editing ? "Paket diperbarui" : "Paket ditambahkan" });
      qc.invalidateQueries({ queryKey: getListPaketQueryKey() });
      setOpen(false);
    };
    if (editing) updateM.mutate({ id: editing.id, data: payload as any }, { onSuccess });
    else createM.mutate({ data: payload as any }, { onSuccess });
  };

  const remove = (p: any) => {
    if (!confirm(`Hapus paket "${p.namaPaket}"?`)) return;
    deleteM.mutate(
      { id: p.id },
      {
        onSuccess: () => {
          toast({ title: "Paket dihapus" });
          qc.invalidateQueries({ queryKey: getListPaketQueryKey() });
        },
      },
    );
  };

  const generateDesc = async () => {
    if (!form.namaPaket) {
      toast({ title: "Isi nama paket dulu", variant: "destructive" });
      return;
    }
    setAiPending(true);
    try {
      const katNama = kategoriList.find(k => k.id === form.kategoriId)?.nama ?? "";
      const res = await adminFetch<{ text: string }>("/ai/generate", {
        method: "POST",
        body: JSON.stringify({
          system: "Kamu copywriter studio foto profesional. Tulis deskripsi paket foto yang singkat (2-3 kalimat), menarik, dan persuasif dalam Bahasa Indonesia. Jawab langsung tanpa pembuka, tanpa tanda kutip.",
          prompt: `Tulis deskripsi paket foto studio:\nNama: ${form.namaPaket}\nKategori: ${katNama || "umum"}\nHarga: Rp ${Number(form.harga).toLocaleString("id-ID")}\nDurasi: ${form.durasiSesi} menit\nJumlah foto: ${form.jumlahFoto} foto`,
          maxTokens: 250,
        }),
      });
      const text = (res?.text ?? "").trim();
      if (!text) {
        toast({ title: "AI belum berhasil membuat teks", description: "Coba sekali lagi.", variant: "destructive" });
      } else {
        setForm(f => ({ ...f, deskripsi: text }));
      }
    } catch (err: any) {
      toast({ title: "AI tidak tersedia", description: err?.message ?? "Coba lagi sebentar.", variant: "destructive" });
    } finally {
      setAiPending(false);
    }
  };

  const isPending = createM.isPending || updateM.isPending;
  const kategoriMap = Object.fromEntries(kategoriList.map(k => [k.id, k.nama]));

  return (
    <AdminLayout title="Paket Layanan" subtitle="Kelola paket foto studio + AI pembuat deskripsi.">
      <div className="flex justify-end mb-4">
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" /> Tambah Paket
        </Button>
      </div>

      {error && !isFetching && (
        <div className="mb-4">
          <QueryError error={error} onRetry={() => refetch()} title="Gagal memuat daftar paket" />
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm">
              Belum ada paket. Klik "Tambah Paket" untuk mulai.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">Foto</TableHead>
                  <TableHead>Nama Paket</TableHead>
                  <TableHead className="hidden md:table-cell">Kategori</TableHead>
                  <TableHead>Harga</TableHead>
                  <TableHead className="hidden sm:table-cell">Durasi</TableHead>
                  <TableHead className="hidden md:table-cell">Status</TableHead>
                  <TableHead className="w-24 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="h-10 w-10 rounded-md overflow-hidden bg-muted flex items-center justify-center shrink-0">
                        {(p as any).fotoUrl ? (
                          <AppImage src={(p as any).fotoUrl} alt={p.namaPaket} className="h-full w-full object-cover" />
                        ) : (
                          <ImageOff className="h-4 w-4 text-muted-foreground/40" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{p.namaPaket}</div>
                      {p.isPopuler && (
                        <Badge variant="secondary" className="text-[10px] mt-0.5">Populer</Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                      {kategoriMap[p.kategoriId ?? ""] ?? "—"}
                    </TableCell>
                    <TableCell className="font-medium">
                      Rp {p.harga.toLocaleString("id-ID")}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                      {p.durasiSesi} mnt
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant={p.isAktif ? "default" : "outline"}>
                        {p.isAktif ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(p)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => remove(p)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(v) => { if (!v) setOpen(false); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Paket" : "Tambah Paket Baru"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Nama */}
            <div className="space-y-1.5">
              <Label>Nama Paket *</Label>
              <Input
                placeholder="Contoh: Paket Prewedding Outdoor"
                value={form.namaPaket}
                onChange={e => setForm(f => ({ ...f, namaPaket: e.target.value }))}
              />
            </div>

            {/* Foto */}
            <SupabaseUploader
              value={form.fotoUrl}
              onChange={url => setForm(f => ({ ...f, fotoUrl: url }))}
              bucket="paket"
              folder="cover"
              label="Foto Paket"
            />

            {/* Kategori */}
            <div className="space-y-1.5">
              <Label>Kategori</Label>
              <Select
                value={form.kategoriId || "none"}
                onValueChange={v => setForm(f => ({ ...f, kategoriId: v === "none" ? "" : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Tanpa kategori —</SelectItem>
                  {kategoriList.map(k => (
                    <SelectItem key={k.id} value={k.id}>{k.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Harga, Durasi, Jumlah Foto */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Harga (Rp) *</Label>
                <Input
                  type="number"
                  placeholder="500000"
                  value={form.harga}
                  onChange={e => setForm(f => ({ ...f, harga: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Durasi (menit)</Label>
                <Input
                  type="number"
                  placeholder="60"
                  value={form.durasiSesi}
                  onChange={e => setForm(f => ({ ...f, durasiSesi: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Jumlah Foto</Label>
                <Input
                  type="number"
                  placeholder="20"
                  value={form.jumlahFoto}
                  onChange={e => setForm(f => ({ ...f, jumlahFoto: e.target.value }))}
                />
              </div>
            </div>

            {/* Deskripsi */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Deskripsi</Label>
                <Button type="button" size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={generateDesc} disabled={aiPending}>
                  {aiPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  AI Generate
                </Button>
              </div>
              <Textarea
                placeholder="Deskripsi singkat paket foto ini..."
                className="resize-none h-24"
                value={form.deskripsi}
                onChange={e => setForm(f => ({ ...f, deskripsi: e.target.value }))}
              />
            </div>

            {/* Fasilitas */}
            <div className="space-y-1.5">
              <Label>Fasilitas / Fitur</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Contoh: 2 outfit changes"
                  value={fasilitasInput}
                  onChange={e => setFasilitasInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addFasilitas(); } }}
                />
                <Button type="button" variant="outline" onClick={addFasilitas}>Tambah</Button>
              </div>
              {form.fasilitas.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {form.fasilitas.map((f, i) => (
                    <li
                      key={i}
                      draggable
                      onDragStart={() => { dragIdxRef.current = i; }}
                      onDragOver={e => { e.preventDefault(); setDragOverIdx(i); }}
                      onDrop={() => {
                        const from = dragIdxRef.current;
                        if (from === null || from === i) { setDragOverIdx(null); return; }
                        setForm(prev => {
                          const arr = [...prev.fasilitas];
                          const [moved] = arr.splice(from, 1);
                          arr.splice(i, 0, moved);
                          return { ...prev, fasilitas: arr };
                        });
                        dragIdxRef.current = null;
                        setDragOverIdx(null);
                      }}
                      onDragEnd={() => { dragIdxRef.current = null; setDragOverIdx(null); }}
                      className={`flex items-center gap-2 text-sm rounded-md px-3 py-1.5 transition-colors select-none
                        ${dragOverIdx === i ? "bg-primary/10 border border-primary/30" : "bg-muted/50 border border-transparent"}`}
                    >
                      <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0 cursor-grab active:cursor-grabbing" />
                      <span className="flex-1">{f}</span>
                      <button
                        onClick={() => removeFasilitas(i)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Toggle: Populer & Aktif */}
            <div className="flex flex-col sm:flex-row gap-4 pt-1">
              <div className="flex items-center gap-3 flex-1">
                <Switch
                  id="isPopuler"
                  checked={form.isPopuler}
                  onCheckedChange={v => setForm(f => ({ ...f, isPopuler: v }))}
                />
                <Label htmlFor="isPopuler" className="cursor-pointer">Tandai sebagai Populer</Label>
              </div>
              <div className="flex items-center gap-3 flex-1">
                <Switch
                  id="isAktif"
                  checked={form.isAktif}
                  onCheckedChange={v => setForm(f => ({ ...f, isAktif: v }))}
                />
                <Label htmlFor="isAktif" className="cursor-pointer">Paket Aktif</Label>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>Batal</Button>
            <Button onClick={save} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Simpan Perubahan" : "Tambah Paket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
