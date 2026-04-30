import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { AiChatbot } from "@/components/ai-chatbot";
import { ProtectedRoute } from "@/components/protected-route";
import { AuthProvider } from "@/lib/auth";

import Home from "@/pages/home";
import NotFound from "@/pages/not-found";

const Portfolio = lazy(() => import("@/pages/portfolio"));
const Paket = lazy(() => import("@/pages/paket"));
const Layanan = lazy(() => import("@/pages/layanan"));
const LayananDetail = lazy(() => import("@/pages/layanan-detail"));
const Toko = lazy(() => import("@/pages/toko"));
const Booking = lazy(() => import("@/pages/booking"));
const Testimoni = lazy(() => import("@/pages/testimoni"));
const Login = lazy(() => import("@/pages/login"));
const Register = lazy(() => import("@/pages/register"));
const AdminLogin = lazy(() => import("@/pages/admin-login"));
const Profil = lazy(() => import("@/pages/profil"));
const AdminBeranda = lazy(() => import("@/pages/admin/beranda"));
const AdminBookings = lazy(() => import("@/pages/admin/bookings"));
const AdminProduk = lazy(() => import("@/pages/admin/produk"));
const AdminPortfolio = lazy(() => import("@/pages/admin/portfolio"));
const AdminJadwal = lazy(() => import("@/pages/admin/jadwal"));
const AdminTestimoni = lazy(() => import("@/pages/admin/testimoni"));
const AdminChat = lazy(() => import("@/pages/admin/chat"));
const AdminLaporan = lazy(() => import("@/pages/admin/laporan"));
const AdminUsers = lazy(() => import("@/pages/admin/users"));
const AdminLanding = lazy(() => import("@/pages/admin/landing"));
const AdminPromo = lazy(() => import("@/pages/admin/promo"));

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
          <Route path="/portfolio" component={Portfolio} />
          <Route path="/layanan" component={Layanan} />
          <Route path="/layanan/:slug" component={LayananDetail} />
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

function Router() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/dashboard/login" component={AdminLogin} />
        <Route path="/dashboard"><ProtectedRoute requireAdmin><AdminBeranda /></ProtectedRoute></Route>
        <Route path="/dashboard/booking"><ProtectedRoute requireAdmin><AdminBookings /></ProtectedRoute></Route>
        <Route path="/dashboard/produk"><ProtectedRoute requireAdmin><AdminProduk /></ProtectedRoute></Route>
        <Route path="/dashboard/portfolio"><ProtectedRoute requireAdmin><AdminPortfolio /></ProtectedRoute></Route>
        <Route path="/dashboard/jadwal"><ProtectedRoute requireAdmin><AdminJadwal /></ProtectedRoute></Route>
        <Route path="/dashboard/testimoni"><ProtectedRoute requireAdmin><AdminTestimoni /></ProtectedRoute></Route>
        <Route path="/dashboard/promo"><ProtectedRoute requireAdmin><AdminPromo /></ProtectedRoute></Route>
        <Route path="/dashboard/users"><ProtectedRoute requireAdmin><AdminUsers /></ProtectedRoute></Route>
        <Route path="/dashboard/landing"><ProtectedRoute requireAdmin><AdminLanding /></ProtectedRoute></Route>
        <Route path="/dashboard/chat"><ProtectedRoute requireAdmin><AdminChat /></ProtectedRoute></Route>
        <Route path="/dashboard/laporan"><ProtectedRoute requireAdmin><AdminLaporan /></ProtectedRoute></Route>
        <Route>
          <MainRoutes />
        </Route>
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
