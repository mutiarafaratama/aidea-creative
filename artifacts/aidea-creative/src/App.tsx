import { lazy, Suspense, useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { AiChatbot } from "@/components/ai-chatbot";
import { ProtectedRoute } from "@/components/protected-route";
import { AuthProvider, useAuth } from "@/lib/auth";
import { CartProvider } from "@/contexts/cart-context";

import Home from "@/pages/home";
import NotFound from "@/pages/not-found";
import AuthCallback from "@/pages/auth-callback";

// Admin pages — imported eagerly so navigation between dashboard pages is instant
import AdminBeranda from "@/pages/admin/beranda";
import AdminBookings from "@/pages/admin/bookings";
import AdminProduk from "@/pages/admin/produk";
import AdminPesanan from "@/pages/admin/pesanan";
import AdminPortfolio from "@/pages/admin/portfolio";
import AdminJadwal from "@/pages/admin/jadwal";
import AdminTestimoni from "@/pages/admin/testimoni";
import AdminChat from "@/pages/admin/chat";
import AdminLaporan from "@/pages/admin/laporan";
import AdminUsers from "@/pages/admin/users";
import AdminLanding from "@/pages/admin/landing";
import AdminPromo from "@/pages/admin/promo";
import AdminPaket from "@/pages/admin/paket";

// Public pages — lazy loaded so they don't bloat the initial bundle
const Photobooth = lazy(() => import("@/pages/photobooth"));
const Portfolio = lazy(() => import("@/pages/portfolio"));
const Paket = lazy(() => import("@/pages/paket"));
const Toko = lazy(() => import("@/pages/toko"));
const Booking = lazy(() => import("@/pages/booking"));
const Testimoni = lazy(() => import("@/pages/testimoni"));
const Login = lazy(() => import("@/pages/login"));
const Register = lazy(() => import("@/pages/register"));
const AdminLogin = lazy(() => import("@/pages/admin-login"));
const Profil = lazy(() => import("@/pages/profil"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});

function PageFallback() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      Memuat halaman...
    </div>
  );
}

function MainRoutes() {
  return (
    <Layout>
      <Suspense fallback={<PageFallback />}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/photobooth" component={Photobooth} />
          <Route path="/portfolio" component={Portfolio} />
          <Route path="/paket" component={Paket} />
          <Route path="/toko" component={Toko} />
          <Route path="/booking">
            <ProtectedRoute>
              <Booking />
            </ProtectedRoute>
          </Route>
          <Route path="/testimoni" component={Testimoni} />
          <Route path="/profil">
            <ProtectedRoute>
              <Profil />
            </ProtectedRoute>
          </Route>
          <Route component={NotFound} />
        </Switch>
      </Suspense>
      <AiChatbot />
    </Layout>
  );
}

// Routes where we should NOT auto-redirect admins (they're intentionally there)
const NON_REDIRECT_PATHS = ["/login", "/register", "/dashboard/login"];

/**
 * Once auth + profile are fully loaded, redirect admin users who land on
 * any public/customer route (e.g. "/" or "/profil") to /dashboard.
 * This handles the "returning user" case where the session is auto-restored
 * from localStorage — the login-page redirect logic never runs in that case.
 */
function AdminRedirect() {
  const { profile, profileChecked, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const redirected = useRef(false);

  useEffect(() => {
    if (isLoading || !profileChecked) return;
    if (redirected.current) return;
    if (profile?.role !== "admin") return;
    if (location.startsWith("/dashboard")) return;
    if (NON_REDIRECT_PATHS.includes(location)) return;

    redirected.current = true;
    setLocation("/dashboard");
  }, [isLoading, profileChecked, profile, location, setLocation]);

  return null;
}

function Router() {
  return (
    <>
      <AdminRedirect />
      <Suspense fallback={<PageFallback />}>
      <Switch>
        <Route path="/auth/callback" component={AuthCallback} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/dashboard/login" component={AdminLogin} />
        <Route path="/dashboard"><ProtectedRoute requireAdmin><AdminBeranda /></ProtectedRoute></Route>
        <Route path="/dashboard/booking"><ProtectedRoute requireAdmin><AdminBookings /></ProtectedRoute></Route>
        <Route path="/dashboard/produk"><ProtectedRoute requireAdmin><AdminProduk /></ProtectedRoute></Route>
        <Route path="/dashboard/pesanan"><ProtectedRoute requireAdmin><AdminPesanan /></ProtectedRoute></Route>
        <Route path="/dashboard/portfolio"><ProtectedRoute requireAdmin><AdminPortfolio /></ProtectedRoute></Route>
        <Route path="/dashboard/jadwal"><ProtectedRoute requireAdmin><AdminJadwal /></ProtectedRoute></Route>
        <Route path="/dashboard/testimoni"><ProtectedRoute requireAdmin><AdminTestimoni /></ProtectedRoute></Route>
        <Route path="/dashboard/promo"><ProtectedRoute requireAdmin><AdminPromo /></ProtectedRoute></Route>
        <Route path="/dashboard/paket"><ProtectedRoute requireAdmin><AdminPaket /></ProtectedRoute></Route>
        <Route path="/dashboard/users"><ProtectedRoute requireAdmin><AdminUsers /></ProtectedRoute></Route>
        <Route path="/dashboard/landing"><ProtectedRoute requireAdmin><AdminLanding /></ProtectedRoute></Route>
        <Route path="/dashboard/chat"><ProtectedRoute requireAdmin><AdminChat /></ProtectedRoute></Route>
        <Route path="/dashboard/laporan"><ProtectedRoute requireAdmin><AdminLaporan /></ProtectedRoute></Route>
        <Route>
          <MainRoutes />
        </Route>
      </Switch>
    </Suspense>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <CartProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
          </CartProvider>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
