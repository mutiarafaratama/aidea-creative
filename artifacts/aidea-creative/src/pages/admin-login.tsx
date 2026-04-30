import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Loader2, ShieldCheck, Lock, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { isSupabaseConfigured, supabase, supabaseConfigMessage } from "@/lib/supabase";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { user, profile, isLoading } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (user && profile?.role === "admin") setLocation("/dashboard");
  }, [user, profile, isLoading, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      setBusy(false);
      toast({ title: "Login gagal", description: error?.message ?? "Kredensial salah", variant: "destructive" });
      return;
    }
    // Verify admin role
    const { data: prof } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
    setBusy(false);
    if (prof?.role !== "admin") {
      await supabase.auth.signOut();
      toast({ title: "Akses ditolak", description: "Akun ini bukan admin.", variant: "destructive" });
      return;
    }
    toast({ title: "Selamat datang, Admin", description: "Anda berhasil masuk." });
    setLocation("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-foreground relative overflow-hidden p-4">
      {/* Animated backdrop */}
      <div className="absolute inset-0 opacity-20">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary blur-3xl"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-amber-400 blur-3xl"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-md"
      >
        <Link href="/" className="inline-flex items-center gap-2 text-background/60 hover:text-background text-xs mb-6 transition-colors">
          <ArrowLeft size={14} /> Kembali ke situs
        </Link>

        <div className="bg-background rounded-3xl p-8 shadow-2xl border border-border/10">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-11 w-11 rounded-xl bg-foreground text-background flex items-center justify-center">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold">Dashboard Admin</h1>
              <p className="text-xs text-muted-foreground">Khusus pengelola AideaCreative</p>
            </div>
          </div>

          {!isSupabaseConfigured && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Konfigurasi dibutuhkan</AlertTitle>
              <AlertDescription>{supabaseConfigMessage}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email Admin</Label>
              <Input
                id="admin-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@aideacreative.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Password</Label>
              <Input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <Button type="submit" className="w-full rounded-full h-11 bg-foreground hover:bg-foreground/90 text-background" disabled={busy || !isSupabaseConfigured}>
              {busy ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memverifikasi...</>
              ) : (
                <><Lock className="mr-2 h-4 w-4" /> Masuk Dashboard</>
              )}
            </Button>
          </form>

          <p className="text-[11px] text-muted-foreground text-center mt-6 leading-relaxed">
            Halaman ini hanya untuk admin. Pelanggan silakan gunakan <Link href="/login" className="text-primary hover:underline">Login Pelanggan</Link>.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
