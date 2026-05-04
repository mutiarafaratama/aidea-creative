import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2, Lock, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
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
  const { user, profile, isLoading: authLoading, signIn, signUp } = useAuth();
  const { toast } = useToast();
  const { data: settings } = useSiteSettings();
  const isLogin = location.startsWith("/login");

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

  const isCustomerDefaultRedirect = (target: string | null | undefined) =>
    !target || target === "/" || target === "/profil" || target.startsWith("/profil?");
  const redirectTo = explicitRedirect ?? "/";

  useEffect(() => {
    if (!user) return;
    if (!profile) return;

    if (profile.role === "admin") {
      if (explicitRedirect && !isCustomerDefaultRedirect(explicitRedirect)) {
        setLocation(explicitRedirect);
      } else {
        setLocation("/dashboard");
      }
      return;
    }

    if (explicitRedirect && !explicitRedirect.startsWith("/dashboard") && !isCustomerDefaultRedirect(explicitRedirect)) {
      setLocation(explicitRedirect);
    } else {
      setLocation("/");
    }
  }, [user, profile, explicitRedirect, authLoading, setLocation]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoadingLogin, setIsLoadingLogin] = useState(false);

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { namaLengkap: "", email: "", password: "", konfirmasiPassword: "", noTelepon: "" },
  });
  const [isLoadingRegister, setIsLoadingRegister] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingLogin(true);
    const { error } = await signIn(email, password);
    setIsLoadingLogin(false);
    if (error) {
      toast({ title: "Login gagal", description: error, variant: "destructive" });
      return;
    }
    toast({ title: "Login berhasil", description: "Selamat datang kembali." });
  };

  const onRegister = async (values: RegisterValues) => {
    setIsLoadingRegister(true);
    const { error } = await signUp({
      email: values.email,
      password: values.password,
      namaLengkap: values.namaLengkap,
      noTelepon: values.noTelepon,
    });
    setIsLoadingRegister(false);
    if (error) {
      toast({ title: "Registrasi gagal", description: error, variant: "destructive" });
      return;
    }
    toast({ title: "Registrasi berhasil", description: "Akun Anda telah dibuat." });
  };

  const switchTo = (next: "login" | "register") => {
    const newPath = next === "login" ? "/login" : "/register";
    const query = redirectTo !== "/profil" ? `?redirect=${encodeURIComponent(redirectTo)}` : "";
    window.history.replaceState(null, "", `${import.meta.env.BASE_URL.replace(/\/$/, "")}${newPath}${query}`);
  };

  return (
    <div className="min-h-screen flex bg-white">
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 relative z-10">
        <div className="w-full max-w-md">
          <Link href="/" className="inline-flex items-center gap-2 mb-10">
            <img src="/images/logo.png" alt="AideaCreative" className="h-9 w-9 rounded-lg object-cover" />
            <div className="leading-tight">
              <p className="font-bold text-base text-foreground">AideaCreative</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Smart Photo Studio</p>
            </div>
          </Link>

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
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full rounded-full h-11" disabled={isLoadingLogin}>
                    {isLoadingLogin ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memverifikasi...</>
                    ) : (
                      <><Lock className="mr-2 h-4 w-4" /> Masuk</>
                    )}
                  </Button>
                </form>

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
                    <Button type="submit" className="w-full rounded-full h-11 mt-2" disabled={isLoadingRegister}>
                      {isLoadingRegister ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mendaftarkan...</>
                      ) : (
                        <><UserPlus className="mr-2 h-4 w-4" /> Daftar Sekarang</>
                      )}
                    </Button>
                  </form>
                </Form>

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

      <div className="hidden lg:block w-1/2 bg-[#0c1220] relative overflow-hidden">
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
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-[#0c1220]/20 via-transparent to-primary/15" />
      </div>
    </div>
  );
}
