import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2, Lock, UserPlus } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { isSupabaseConfigured, supabase, supabaseConfigMessage } from "@/lib/supabase";
import { useSiteSettings } from "@/lib/settings";
import { useListPortfolio } from "@workspace/api-client-react";

const FALLBACK_PHOTOS = [
  "/images/portfolio-wedding.png",
  "/images/portfolio-family.png",
  "/images/portfolio-graduation.png",
  "/images/portfolio-product.png",
  "/images/product-album.png",
  "/images/product-frame.png",
];

const registerSchema = z
  .object({
    namaLengkap: z.string().min(3, "Nama lengkap minimal 3 karakter"),
    email: z.string().email("Format email tidak valid"),
    password: z.string().min(6, "Password minimal 6 karakter"),
    konfirmasiPassword: z.string().min(6, "Konfirmasi password wajib diisi"),
    noTelepon: z.string().min(10, "Nomor telepon minimal 10 digit"),
  })
  .refine((d) => d.password === d.konfirmasiPassword, {
    message: "Konfirmasi password tidak sama",
    path: ["konfirmasiPassword"],
  });

type RegisterValues = z.infer<typeof registerSchema>;

export function AuthCard({ initialMode }: { initialMode: "login" | "register" }) {
  const [location, setLocation] = useLocation();
  const { user, profile, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const { data: settings } = useSiteSettings();
  const isLogin = location.startsWith("/login");
  const isRegister = location.startsWith("/register");

  const { data: portfolioList } = useListPortfolio();
  const sidePhotos = (() => {
    const items = Array.isArray(portfolioList) ? portfolioList : [];
    const sorted = [...items].sort((a, b) => Number((b as any).isFeatured) - Number((a as any).isFeatured));
    const urls: string[] = [];
    for (const p of sorted) {
      const arr = Array.isArray((p as any).gambarUrl) ? (p as any).gambarUrl : [];
      for (const u of arr) { if (u) urls.push(u as string); }
    }
    return urls.length >= 1 ? urls.slice(0, 18) : FALLBACK_PHOTOS;
  })();

  const explicitRedirect = useMemo(() => {
    const query = location.split("?")[1] ?? "";
    return new URLSearchParams(query).get("redirect");
  }, [location]);
  // Treat the customer-area defaults as "no real preference" so admins
  // logging in still land on /dashboard instead of /profil.
  const isCustomerDefaultRedirect = (target: string | null | undefined) =>
    !target || target === "/" || target === "/profil" || target.startsWith("/profil?");
  const redirectTo = explicitRedirect ?? "/";

  useEffect(() => {
    if (!user) return;
    // Wait until the profile (and therefore the role) is known before
    // redirecting. Otherwise admins can briefly get sent to /profil if the
    // login URL carries a default ?redirect=/ (e.g. after Google OAuth).
    if (!profile) return;

    if (profile.role === "admin") {
      // Admin: honour an explicit dashboard/admin redirect, otherwise go to
      // the dashboard regardless of any leftover customer-area redirect.
      if (explicitRedirect && !isCustomerDefaultRedirect(explicitRedirect)) {
        setLocation(explicitRedirect);
      } else {
        setLocation("/dashboard");
      }
      return;
    }

    // Pelanggan: honour explicit redirect (unless it points to /dashboard
    // which they cannot access), otherwise go to beranda.
    if (explicitRedirect && !explicitRedirect.startsWith("/dashboard") && !isCustomerDefaultRedirect(explicitRedirect)) {
      setLocation(explicitRedirect);
    } else {
      setLocation("/");
    }
  }, [user, profile, explicitRedirect, authLoading, setLocation]);

  // Login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoadingLogin, setIsLoadingLogin] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Register form
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { namaLengkap: "", email: "", password: "", konfirmasiPassword: "", noTelepon: "" },
  });
  const [isLoadingRegister, setIsLoadingRegister] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setIsLoadingLogin(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setIsLoadingLogin(false);
    if (error) {
      toast({ title: "Login gagal", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Login berhasil", description: "Selamat datang kembali." });
    // The useEffect above will redirect once profile (and therefore role) loads.
  };

  const handleGoogle = async () => {
    if (!supabase) return;
    const base = `${window.location.origin}${import.meta.env.BASE_URL}login`;
    const callback = explicitRedirect && !isCustomerDefaultRedirect(explicitRedirect)
      ? `${base}?redirect=${encodeURIComponent(explicitRedirect)}`
      : `${base}?redirect=${encodeURIComponent("/")}`;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callback,
        queryParams: { prompt: "select_account" },
      },
    });
  };

  const handleReset = async () => {
    if (!supabase) return;
    if (!email) {
      toast({ title: "Email dibutuhkan", description: "Masukkan email terlebih dahulu.", variant: "destructive" });
      return;
    }
    setIsResetting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}login`,
    });
    setIsResetting(false);
    if (error) {
      toast({ title: "Gagal mengirim email reset", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Email reset terkirim", description: "Cek inbox Anda." });
  };

  const onRegister = async (values: RegisterValues) => {
    if (!supabase) return;
    setIsLoadingRegister(true);
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}login`,
        data: { nama_lengkap: values.namaLengkap, no_telepon: values.noTelepon },
      },
    });
    if (error || !data.user) {
      setIsLoadingRegister(false);
      toast({
        title: "Registrasi gagal",
        description: error?.message ?? "Tidak ada user dikembalikan.",
        variant: "destructive",
      });
      return;
    }
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: data.user.id,
      nama_lengkap: values.namaLengkap,
      no_telepon: values.noTelepon,
      role: "pelanggan",
    });
    setIsLoadingRegister(false);
    if (profileError) {
      toast({ title: "Akun dibuat, profil gagal disimpan", description: profileError.message, variant: "destructive" });
      return;
    }
    toast({ title: "Registrasi berhasil", description: "Cek email Anda untuk verifikasi." });
  };

  const switchTo = (next: "login" | "register") => {
    const newPath = next === "login" ? "/login" : "/register";
    const query = redirectTo !== "/profil" ? `?redirect=${encodeURIComponent(redirectTo)}` : "";
    window.history.replaceState(null, "", `${import.meta.env.BASE_URL.replace(/\/$/, "")}${newPath}${query}`);
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* LEFT: Form panel with switch animation */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 relative z-10">
        <div className="w-full max-w-md">
          {/* Brand */}
          <Link href="/" className="inline-flex items-center gap-2 mb-10">
            <img src="/images/logo.png" alt="AideaCreative" className="h-9 w-9 rounded-lg object-cover" />
            <div className="leading-tight">
              <p className="font-bold text-base text-foreground">AideaCreative</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Smart Photo Studio</p>
            </div>
          </Link>

          {!isSupabaseConfigured && (
            <Alert variant="destructive" className="mb-6">
              <AlertTitle>Konfigurasi dibutuhkan</AlertTitle>
              <AlertDescription>{supabaseConfigMessage}</AlertDescription>
            </Alert>
          )}

          <AnimatePresence mode="wait">
            {isLogin ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25 }}
              >
                <h1 className="text-3xl font-bold tracking-tight mb-2">Selamat datang kembali</h1>
                <p className="text-sm text-muted-foreground mb-8">Masuk untuk mengakses booking, profil & dashboard.</p>

                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="nama@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="login-password">Password</Label>
                      <button
                        type="button"
                        onClick={handleReset}
                        disabled={isResetting || !isSupabaseConfigured}
                        className="text-xs text-primary hover:underline disabled:opacity-50"
                      >
                        {isResetting ? "Mengirim..." : "Lupa password?"}
                      </button>
                    </div>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full rounded-full h-11" disabled={isLoadingLogin || !isSupabaseConfigured}>
                    {isLoadingLogin ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memverifikasi...
                      </>
                    ) : (
                      <>
                        <Lock className="mr-2 h-4 w-4" /> Masuk
                      </>
                    )}
                  </Button>
                </form>

                <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="h-px flex-1 bg-border" />
                  atau
                  <div className="h-px flex-1 bg-border" />
                </div>
                <Button type="button" variant="outline" className="w-full rounded-full h-11 gap-2.5" onClick={handleGoogle} disabled={!isSupabaseConfigured}>
                  <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path fill="#4285F4" d="M47.5 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h13.19c-.57 3.07-2.31 5.67-4.91 7.4v6.15h7.95c4.65-4.29 7.27-10.61 7.27-17.56z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.15 15.9-5.83l-7.95-6.15c-2.13 1.43-4.86 2.27-7.95 2.27-6.11 0-11.29-4.13-13.14-9.68H2.63v6.35C6.58 42.58 14.73 48 24 48z"/><path fill="#FBBC05" d="M10.86 28.61A14.95 14.95 0 0 1 9.96 24c0-1.6.27-3.14.9-4.61v-6.35H2.63A23.98 23.98 0 0 0 0 24c0 3.88.93 7.55 2.63 10.96l8.23-6.35z"/><path fill="#EA4335" d="M24 9.75c3.44 0 6.52 1.18 8.95 3.5l6.7-6.7C35.93 2.7 30.48 0 24 0 14.73 0 6.58 5.42 2.63 13.04l8.23 6.35C12.71 13.88 17.89 9.75 24 9.75z"/></svg>
                  Lanjutkan dengan Google
                </Button>

                <p className="mt-8 text-sm text-muted-foreground text-center">
                  Belum punya akun?{" "}
                  <button onClick={() => switchTo("register")} className="text-primary font-semibold hover:underline">
                    Daftar sekarang
                  </button>
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="register"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                <h1 className="text-3xl font-bold tracking-tight mb-2">Buat akun baru</h1>
                <p className="text-sm text-muted-foreground mb-8">Gabung untuk booking, pesanan & testimoni.</p>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onRegister)} className="space-y-4">
                    <FormField control={form.control} name="namaLengkap" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nama Lengkap</FormLabel>
                        <FormControl><Input placeholder="Nama lengkap" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl><Input type="email" placeholder="nama@email.com" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="noTelepon" render={({ field }) => (
                      <FormItem>
                        <FormLabel>No Telepon</FormLabel>
                        <FormControl><Input placeholder="081234567890" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={form.control} name="password" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl><Input type="password" placeholder="Min. 6 karakter" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="konfirmasiPassword" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Konfirmasi</FormLabel>
                          <FormControl><Input type="password" placeholder="Ulangi password" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <Button type="submit" className="w-full rounded-full h-11 mt-2" disabled={isLoadingRegister || !isSupabaseConfigured}>
                      {isLoadingRegister ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mendaftarkan...
                        </>
                      ) : (
                        <>
                          <UserPlus className="mr-2 h-4 w-4" /> Daftar Sekarang
                        </>
                      )}
                    </Button>
                  </form>
                </Form>

                <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="h-px flex-1 bg-border" />
                  atau
                  <div className="h-px flex-1 bg-border" />
                </div>
                <Button type="button" variant="outline" className="w-full rounded-full h-11 gap-2.5" onClick={handleGoogle} disabled={!isSupabaseConfigured}>
                  <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path fill="#4285F4" d="M47.5 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h13.19c-.57 3.07-2.31 5.67-4.91 7.4v6.15h7.95c4.65-4.29 7.27-10.61 7.27-17.56z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.15 15.9-5.83l-7.95-6.15c-2.13 1.43-4.86 2.27-7.95 2.27-6.11 0-11.29-4.13-13.14-9.68H2.63v6.35C6.58 42.58 14.73 48 24 48z"/><path fill="#FBBC05" d="M10.86 28.61A14.95 14.95 0 0 1 9.96 24c0-1.6.27-3.14.9-4.61v-6.35H2.63A23.98 23.98 0 0 0 0 24c0 3.88.93 7.55 2.63 10.96l8.23-6.35z"/><path fill="#EA4335" d="M24 9.75c3.44 0 6.52 1.18 8.95 3.5l6.7-6.7C35.93 2.7 30.48 0 24 0 14.73 0 6.58 5.42 2.63 13.04l8.23 6.35C12.71 13.88 17.89 9.75 24 9.75z"/></svg>
                  Daftar dengan Google
                </Button>

                <p className="mt-8 text-sm text-muted-foreground text-center">
                  Sudah punya akun?{" "}
                  <button onClick={() => switchTo("login")} className="text-primary font-semibold hover:underline">
                    Login di sini
                  </button>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* RIGHT: Visual panel — 3-col masonry with featured portfolio photos */}
      <div className="hidden lg:block w-1/2 bg-[#0c1220] relative overflow-hidden">
        {false ? null : (
          <div className="absolute inset-0 grid grid-cols-3 gap-2 p-2 [mask-image:linear-gradient(to_bottom,transparent_0%,black_6%,black_94%,transparent_100%)]">
            {[0, 1, 2].map((col) => {
              const colPhotos = sidePhotos.filter((_, i) => i % 3 === col);
              const padded = colPhotos.length < 3 ? [...colPhotos, ...sidePhotos].slice(0, Math.max(colPhotos.length, 4)) : colPhotos;
              const doubled = [...padded, ...padded];
              const heightCycle = [
                ["h-52", "h-36", "h-60", "h-44", "h-56", "h-40"],
                ["h-40", "h-60", "h-44", "h-52", "h-36", "h-56"],
                ["h-56", "h-44", "h-40", "h-60", "h-52", "h-36"],
              ][col];
              return (
                <div key={col} className="overflow-hidden">
                  <motion.div
                    initial={{ y: col % 2 === 0 ? "0%" : "-50%" }}
                    animate={{ y: col % 2 === 0 ? "-50%" : "0%" }}
                    transition={{ duration: 36 + col * 9, repeat: Infinity, ease: "linear" }}
                    className="flex flex-col gap-2"
                  >
                    {doubled.map((src, i) => (
                      <div
                        key={`${col}-${i}`}
                        className={`${heightCycle[i % heightCycle.length]} rounded-2xl overflow-hidden bg-white/5 shrink-0`}
                      >
                        <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    ))}
                  </motion.div>
                </div>
              );
            })}
          </div>
        )}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-[#0c1220]/20 via-transparent to-primary/15" />
      </div>
    </div>
  );
}
