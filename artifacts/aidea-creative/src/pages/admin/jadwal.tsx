import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { adminFetch } from "@/lib/admin-api";

type Jadwal = { id: string; tanggal: string; jamMulai: string; jamSelesai: string; isTersedia: boolean };

export default function AdminJadwal() {
  const { toast } = useToast();
  const [items, setItems] = useState<Jadwal[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ tanggal: "", jamMulai: "09:00", jamSelesai: "11:00", isTersedia: true });

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminFetch<Jadwal[]>("/jadwal?all=true");
      setItems(Array.isArray(res) ? res : []);
    } catch (err: any) {
      toast({ title: "Gagal memuat jadwal", description: err?.message, variant: "destructive" });
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    setSaving(true);
    try {
      await adminFetch("/jadwal", { method: "POST", body: JSON.stringify(form) });
      toast({ title: "Jadwal ditambahkan" });
      setOpen(false); setForm({ tanggal: "", jamMulai: "09:00", jamSelesai: "11:00", isTersedia: true });
      load();
    } catch (err: any) {
      toast({ title: "Gagal", description: err?.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const toggle = async (j: Jadwal) => {
    try {
      await adminFetch(`/jadwal/${j.id}`, { method: "PATCH", body: JSON.stringify({ isTersedia: !j.isTersedia }) });
      load();
    } catch (err: any) {
      toast({ title: "Gagal update", description: err?.message, variant: "destructive" });
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Hapus jadwal ini?")) return;
    try {
      await adminFetch(`/jadwal/${id}`, { method: "DELETE" });
      load();
    } catch (err: any) {
      toast({ title: "Gagal hapus", description: err?.message, variant: "destructive" });
    }
  };

  return (
    <AdminLayout title="Jadwal Studio" subtitle="Atur slot waktu yang tersedia untuk booking pelanggan.">
      <div className="flex justify-end mb-4"><Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> Tambah Slot</Button></div>
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? <div className="p-6 space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div> : (
            <Table>
              <TableHeader><TableRow><TableHead>Tanggal</TableHead><TableHead>Jam</TableHead><TableHead>Status</TableHead><TableHead>Tersedia</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
              <TableBody>
                {items.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Belum ada jadwal.</TableCell></TableRow> :
                  items.map((j) => (
                    <TableRow key={j.id}>
                      <TableCell className="font-medium">{j.tanggal}</TableCell>
                      <TableCell>{j.jamMulai} – {j.jamSelesai}</TableCell>
                      <TableCell>{j.isTersedia ? <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20" variant="outline">Buka</Badge> : <Badge variant="outline">Tutup</Badge>}</TableCell>
                      <TableCell><Switch checked={j.isTersedia} onCheckedChange={() => toggle(j)} /></TableCell>
                      <TableCell className="text-right"><Button size="icon" variant="ghost" className="text-red-600" onClick={() => remove(j.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah Slot Jadwal</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Tanggal</Label><Input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Jam Mulai</Label><Input type="time" value={form.jamMulai} onChange={(e) => setForm({ ...form, jamMulai: e.target.value })} /></div>
              <div><Label>Jam Selesai</Label><Input type="time" value={form.jamSelesai} onChange={(e) => setForm({ ...form, jamSelesai: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={create} disabled={saving || !form.tanggal}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
