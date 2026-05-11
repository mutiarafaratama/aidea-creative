import { useEffect, useState } from "react";
import { Trash2, ShieldCheck, User as UserIcon, Search, Loader2, KeyRound, MessageCircle, Clock, X } from "lucide-react";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

type ResetRequest = {
  id: string;
  token: string;
  expiresAt: string;
  createdAt: string;
  namaLengkap: string;
  noTelepon: string | null;
  email: string | null;
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
  const [resetRequests, setResetRequests] = useState<ResetRequest[]>([]);
  const [resetLoading, setResetLoading] = useState(true);

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

  const loadResetRequests = async () => {
    setResetLoading(true);
    try {
      const res = await adminFetch<ResetRequest[]>("/admin/reset-requests");
      setResetRequests(Array.isArray(res) ? res : []);
    } catch { setResetRequests([]); }
    setResetLoading(false);
  };

  useEffect(() => { load(); loadResetRequests(); }, []);

  const cancelReset = async (id: string) => {
    try {
      await adminFetch(`/admin/reset-requests/${id}`, { method: "DELETE" });
      toast({ title: "Permintaan dibatalkan" });
      loadResetRequests();
    } catch (err: any) {
      toast({ title: "Gagal", description: err?.message, variant: "destructive" });
    }
  };

  const buildWaLink = (req: ResetRequest) => {
    const resetLink = `${window.location.origin}/reset-password?token=${req.token}`;
    const phone = (req.noTelepon ?? "").replace(/[^0-9]/g, "").replace(/^0/, "62");
    const msg = `Halo ${req.namaLengkap}, berikut link untuk reset kata sandi akun AideaCreative Studio Foto Anda:\n\n${resetLink}\n\nLink ini berlaku 60 menit. Jangan bagikan link ini ke siapapun.`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  };

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
      {/* ── Reset Password Requests ─────────────────────────────── */}
      <Card className="mt-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              Permintaan Reset Kata Sandi
              {resetRequests.length > 0 && (
                <Badge className="bg-orange-500/10 text-orange-700 border-orange-400/30 ml-1" variant="outline">
                  {resetRequests.length} menunggu
                </Badge>
              )}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={loadResetRequests} disabled={resetLoading}>
              {resetLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {resetLoading ? (
            <div className="space-y-2"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>
          ) : resetRequests.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Tidak ada permintaan reset kata sandi yang aktif.
            </div>
          ) : (
            <div className="space-y-3">
              {resetRequests.map((req) => {
                const expiresAt = new Date(req.expiresAt);
                const minutesLeft = Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 60000));
                const hasPhone = !!(req.noTelepon?.trim());
                return (
                  <div key={req.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30">
                    <div className="h-9 w-9 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                      <UserIcon className="h-4 w-4 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{req.namaLengkap}</p>
                      <p className="text-xs text-muted-foreground truncate">{req.email ?? "—"} · {req.noTelepon ?? "No. WA tidak terdaftar"}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {minutesLeft > 0 ? `Berlaku ${minutesLeft} menit lagi` : "Kadaluarsa"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {hasPhone ? (
                        <a href={buildWaLink(req)} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                            <MessageCircle className="h-3.5 w-3.5" />
                            Kirim via WA
                          </Button>
                        </a>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs gap-1.5"
                          onClick={() => {
                            const link = `${window.location.origin}/reset-password?token=${req.token}`;
                            navigator.clipboard.writeText(link).then(() =>
                              toast({ title: "Link disalin!", description: "Kirimkan link ke pengguna secara manual." })
                            );
                          }}
                        >
                          Salin Link
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => cancelReset(req.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
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
