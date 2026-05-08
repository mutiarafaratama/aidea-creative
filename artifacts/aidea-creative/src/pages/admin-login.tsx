import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Loader2, ShieldCheck, Lock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { user, profile, isLoading, signIn } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (user && profile?.role === "admin") setLocation("/dashboard");
  }, [user, profile, isLoading, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await signIn(email, password);
    setBusy(false);
    if (error) {
      toast({ title: "Login gagal", description: error, variant: "destructive" });
      return;
    }
    toast({ title: "Login berhasil", description: "Memeriksa akses admin..." });
  };

  const handleGoogleLogin = () => {
    setGoogleBusy(true);
    window.location.href = "/api/auth/google?redirect=/dashboard";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-foreground relative overflow-hidden p-4">
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

          <Button
            type="button"
            variant="outline"
            className="w-full rounded-full h-11 mb-4 flex items-center gap-2 border-border"
            onClick={handleGoogleLogin}
            disabled={googleBusy || busy}
          >
            {googleBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            Masuk dengan Google
          </Button>

          <div className="relative flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">atau</span>
            <div className="flex-1 h-px bg-border" />
          </div>

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
            <Button type="submit" className="w-full rounded-full h-11 bg-foreground hover:bg-foreground/90 text-background" disabled={busy || googleBusy}>
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
