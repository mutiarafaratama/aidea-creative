import { useEffect, useState } from "react";
import { Trash2, ShieldCheck, User as UserIcon, Search, Loader2, KeyRound } from "lucide-react";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { adminFetch } from "@/lib/admin-api";

type AppUser = {
  id: string;
  namaLengkap: string;
  email: string | null;
  noTelepon: string | null;
  role: "admin" | "pelanggan";
  totalBooking: number;
  createdAt: string;
};

type SetPasswordDialog = { userId: string; namaLengkap: string; newPassword: string };

export default function AdminUsers() {
  const { toast } = useToast();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [pwDialog, setPwDialog] = useState<SetPasswordDialog | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminFetch<AppUser[]>("/admin/users");
      setUsers(Array.isArray(res) ? res : []);
    } catch (err: any) {
      toast({ title: "Gagal memuat pengguna", description: err?.message, variant: "destructive" });
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const setRole = async (id: string, role: "admin" | "pelanggan") => {
    setBusy(id);
    try {
      await adminFetch(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify({ role }) });
      toast({ title: "Role diperbarui" });
      load();
    } catch (err: any) {
      toast({ title: "Gagal", description: err?.message, variant: "destructive" });
    }
    setBusy(null);
  };

  const remove = async (u: AppUser) => {
    if (!confirm(`Hapus pengguna "${u.namaLengkap}"? Tindakan ini permanen.`)) return;
    setBusy(u.id);
    try {
      await adminFetch(`/admin/users/${u.id}`, { method: "DELETE" });
      toast({ title: "Pengguna dihapus" });
      load();
    } catch (err: any) {
      toast({ title: "Gagal", description: err?.message, variant: "destructive" });
    }
    setBusy(null);
  };

  const handleSetPassword = async () => {
    if (!pwDialog) return;
    if (pwDialog.newPassword.length < 6) {
      toast({ title: "Kata sandi minimal 6 karakter", variant: "destructive" });
      return;
    }
    setPwLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/auth/admin/set-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ userId: pwDialog.userId, newPassword: pwDialog.newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal mengatur kata sandi");
      toast({ title: "Kata sandi berhasil diperbarui", description: `Kata sandi ${pwDialog.namaLengkap} telah diatur.` });
      setPwDialog(null);
    } catch (err: any) {
      toast({ title: "Gagal", description: err?.message, variant: "destructive" });
    }
    setPwLoading(false);
  };

  const filtered = users.filter((u) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      u.namaLengkap.toLowerCase().includes(s) ||
      (u.email ?? "").toLowerCase().includes(s) ||
      (u.noTelepon ?? "").includes(s)
    );
  });

  const adminCount = users.filter((u) => u.role === "admin").length;
  const customerCount = users.filter((u) => u.role === "pelanggan").length;

  return (
    <>
    <AdminLayout title="Kelola Pengguna" subtitle="Daftar semua akun terdaftar — atur role admin/pelanggan dan hapus akun.">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Pengguna</p><p className="text-2xl font-bold">{users.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Admin</p><p className="text-2xl font-bold">{adminCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pelanggan</p><p className="text-2xl font-bold">{customerCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Booking</p><p className="text-2xl font-bold">{users.reduce((a, u) => a + u.totalBooking, 0)}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari nama, email, atau no. telepon..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-md" />
          </div>
          {loading ? (
            <div className="space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Kontak</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Booking</TableHead>
                    <TableHead>Bergabung</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Tidak ada pengguna.</TableCell></TableRow>
                  ) : filtered.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                            <UserIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">{u.namaLengkap}</p>
                            <p className="text-xs text-muted-foreground font-mono">{u.id.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{u.email ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{u.noTelepon ?? "—"}</p>
                      </TableCell>
                      <TableCell>
                        <Select value={u.role} onValueChange={(v) => setRole(u.id, v as any)} disabled={busy === u.id}>
                          <SelectTrigger className="h-8 w-32 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="pelanggan">Pelanggan</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {u.totalBooking > 0 ? <Badge variant="outline">{u.totalBooking}</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(u.createdAt).toLocaleDateString("id-ID")}</TableCell>
                      <TableCell className="text-right">
                        {u.role === "admin" && <Badge className="mr-2 bg-amber-500/10 text-amber-700 border-amber-500/20" variant="outline"><ShieldCheck className="h-3 w-3 mr-1" /> Admin</Badge>}
                        <Button size="icon" variant="ghost" className="text-muted-foreground" title="Atur kata sandi" disabled={busy === u.id} onClick={() => setPwDialog({ userId: u.id, namaLengkap: u.namaLengkap, newPassword: "" })}>
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-red-600" disabled={busy === u.id} onClick={() => remove(u)}>
                          {busy === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>

    <Dialog open={!!pwDialog} onOpenChange={(o) => !o && setPwDialog(null)}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Atur Kata Sandi</DialogTitle>
          <DialogDescription>
            Atur kata sandi baru untuk <strong>{pwDialog?.namaLengkap}</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-sm mb-1.5 block">Kata Sandi Baru</Label>
            <Input
              type="password"
              placeholder="Min. 6 karakter"
              value={pwDialog?.newPassword ?? ""}
              onChange={(e) => setPwDialog((d) => d ? { ...d, newPassword: e.target.value } : d)}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setPwDialog(null)} disabled={pwLoading}>Batal</Button>
            <Button onClick={handleSetPassword} disabled={pwLoading}>
              {pwLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Menyimpan...</> : "Simpan"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
