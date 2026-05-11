import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Loader2, Lock, CheckCircle2, XCircle, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function ResetPassword() {
  const token = new URLSearchParams(window.location.search).get("token") ?? "";

  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) { setValidating(false); setTokenValid(false); return; }
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/reset-password/validate?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (res.ok && data.valid) { setTokenValid(true); setUserEmail(data.email ?? ""); }
        else { setTokenValid(false); setError(data.error ?? "Link tidak valid atau sudah kadaluarsa."); }
      } catch { setTokenValid(false); setError("Gagal memeriksa link reset."); }
      setValidating(false);
    })();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 6) { setError("Kata sandi minimal 6 karakter."); return; }
    if (newPassword !== confirmPassword) { setError("Konfirmasi kata sandi tidak sama."); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Gagal mereset kata sandi."); }
      else { setDone(true); }
    } catch { setError("Gagal menghubungi server. Coba lagi."); }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="inline-flex items-center gap-2 mb-8">
          <img src="/images/logo.png" alt="AideaCreative" className="h-8 w-8 rounded-lg object-cover" />
          <div className="leading-tight">
            <p className="font-bold text-sm text-foreground">AideaCreative</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Smart Photo Studio</p>
          </div>
        </Link>

        <div className="bg-card border border-border rounded-2xl shadow-lg p-6">
          {validating ? (
            <div className="flex flex-col items-center py-8 gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm">Memverifikasi link reset...</p>
            </div>
          ) : done ? (
            <div className="flex flex-col items-center py-8 gap-4 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <div>
                <h2 className="font-bold text-lg mb-1">Kata Sandi Diperbarui!</h2>
                <p className="text-sm text-muted-foreground">Kata sandi Anda berhasil diubah. Silakan login dengan kata sandi baru.</p>
              </div>
              <Link href="/login">
                <Button className="rounded-full px-8">Login Sekarang</Button>
              </Link>
            </div>
          ) : !tokenValid ? (
            <div className="flex flex-col items-center py-8 gap-4 text-center">
              <XCircle className="h-12 w-12 text-destructive" />
              <div>
                <h2 className="font-bold text-lg mb-1">Link Tidak Valid</h2>
                <p className="text-sm text-muted-foreground">{error || "Link reset sudah kadaluarsa atau tidak valid. Minta link baru ke admin."}</p>
              </div>
              <Link href="/login">
                <Button variant="outline" className="rounded-full px-8">Kembali ke Login</Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <KeyRound className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-bold text-base">Buat Kata Sandi Baru</h2>
                  {userEmail && <p className="text-xs text-muted-foreground">{userEmail}</p>}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="new-password">Kata Sandi Baru</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Min. 6 karakter"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password">Konfirmasi Kata Sandi</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Ulangi kata sandi baru"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                {error && (
                  <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
                )}
                <Button type="submit" className="w-full rounded-full h-11" disabled={submitting}>
                  {submitting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</>
                  ) : (
                    <><Lock className="mr-2 h-4 w-4" /> Simpan Kata Sandi Baru</>
                  )}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
