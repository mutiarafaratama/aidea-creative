import {
  useGetDashboardStats, getGetDashboardStatsQueryKey,
  useGetRecentBookings, getGetRecentBookingsQueryKey,
  useGetBookingByStatus, getGetBookingByStatusQueryKey,
  useAiChat,
} from "@workspace/api-client-react";
import { useState } from "react";
import { CalendarRange, Users, ShoppingBag, Sparkles, TrendingUp, Loader2 } from "lucide-react";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Link } from "wouter";

const STATUS_COLORS: Record<string, string> = {
  menunggu: "#f59e0b", dikonfirmasi: "#3b82f6", selesai: "#10b981", dibatalkan: "#ef4444",
};

export default function AdminBeranda() {
  const { data: stats, isLoading: loadingStats } = useGetDashboardStats({ query: { queryKey: getGetDashboardStatsQueryKey() } });
  const { data: byStatus } = useGetBookingByStatus({ query: { queryKey: getGetBookingByStatusQueryKey() } });
  const { data: recent } = useGetRecentBookings({ query: { queryKey: getGetRecentBookingsQueryKey() } });
  const aiChat = useAiChat();
  const [insight, setInsight] = useState<string>("");

  const pieData = Array.isArray(byStatus) ? byStatus.map((b: any) => ({ name: b.status, value: Number(b.count) })) : [];
  const barData = Array.isArray(recent) ? recent.slice(0, 7).reverse().map((b: any) => ({ name: b.kodeBooking.slice(-4), total: b.totalHarga })) : [];

  const generateInsight = () => {
    const ctx = `Total booking: ${stats?.totalBooking}. Bulan ini: ${stats?.bookingBulanIni}. Pendapatan bulan: Rp ${stats?.pendapatanBulanIni?.toLocaleString("id-ID")}. Rating: ${stats?.ratingRataRata}. Status: ${JSON.stringify(pieData)}.`;
    aiChat.mutate(
      { data: { message: `Anda adalah AI analis studio foto. Berikan insight singkat 3-4 kalimat bahasa Indonesia casual untuk pemilik studio berdasarkan data ini: ${ctx}. Sorot tren & saran actionable.` } },
      {
        onSuccess: (resp: any) => setInsight(resp?.reply ?? resp?.message ?? "AI tidak merespons."),
        onError: () => setInsight("Gagal generate insight."),
      }
    );
  };

  return (
    <AdminLayout title="Beranda Dashboard" subtitle="Ringkasan performa studio hari ini.">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Booking" icon={CalendarRange} value={stats?.totalBooking} sub={`+${stats?.bookingBulanIni ?? 0} bulan ini`} loading={loadingStats} />
        <StatCard label="Pendapatan Bulan" icon={TrendingUp} value={`Rp ${(stats?.pendapatanBulanIni ?? 0).toLocaleString("id-ID")}`} sub={`Total: Rp ${(stats?.totalPendapatan ?? 0).toLocaleString("id-ID")}`} loading={loadingStats} />
        <StatCard label="Rating Rata-rata" icon={Users} value={Number(stats?.ratingRataRata ?? 0).toFixed(1)} sub={`${stats?.totalTestimoni ?? 0} ulasan`} loading={loadingStats} />
        <StatCard label="Total Produk" icon={ShoppingBag} value={`${stats?.totalProduk ?? 0} item`} sub="di toko" loading={loadingStats} />
      </div>

      {/* AI Insight */}
      <Card className="mb-6 border-foreground/10 bg-gradient-to-br from-amber-50 via-background to-primary/5">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-foreground text-background flex items-center justify-center"><Sparkles size={18} /></div>
            <div>
              <CardTitle className="text-base">AI Insight</CardTitle>
              <p className="text-xs text-muted-foreground">Analisis otomatis dari data studio-mu</p>
            </div>
          </div>
          <Button onClick={generateInsight} size="sm" disabled={aiChat.isPending} className="rounded-full">
            {aiChat.isPending ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Analisis...</> : "Generate Insight"}
          </Button>
        </CardHeader>
        <CardContent>
          {insight ? (
            <p className="text-sm leading-relaxed whitespace-pre-line">{insight}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">Klik "Generate Insight" untuk dapat analisis AI berdasarkan data terbaru.</p>
          )}
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Status Booking</CardTitle></CardHeader>
          <CardContent>
            {pieData.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada data.</p> : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={80} label>
                    {pieData.map((e, i) => <Cell key={i} fill={STATUS_COLORS[e.name] ?? "#9ca3af"} />)}
                  </Pie>
                  <Legend /><Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Nilai Booking Terbaru</CardTitle></CardHeader>
          <CardContent>
            {barData.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada data.</p> : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis fontSize={11} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}jt`} />
                  <Tooltip formatter={(v: any) => `Rp ${Number(v).toLocaleString("id-ID")}`} />
                  <Bar dataKey="total" fill="#1e40af" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <div className="grid md:grid-cols-3 gap-4">
        <Link href="/dashboard/booking"><Card className="hover:shadow-md transition-shadow cursor-pointer"><CardContent className="p-5"><p className="text-xs text-muted-foreground mb-1">Perlu ditinjau</p><p className="font-bold text-lg">Booking menunggu persetujuan →</p></CardContent></Card></Link>
        <Link href="/dashboard/testimoni"><Card className="hover:shadow-md transition-shadow cursor-pointer"><CardContent className="p-5"><p className="text-xs text-muted-foreground mb-1">Moderasi</p><p className="font-bold text-lg">Testimoni baru menunggu →</p></CardContent></Card></Link>
        <Link href="/dashboard/chat"><Card className="hover:shadow-md transition-shadow cursor-pointer"><CardContent className="p-5"><p className="text-xs text-muted-foreground mb-1">Dukungan pelanggan</p><p className="font-bold text-lg">Inbox percakapan AI →</p></CardContent></Card></Link>
      </div>
    </AdminLayout>
  );
}

function StatCard({ label, icon: Icon, value, sub, loading }: any) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-8 w-24" /> : <><div className="text-xl font-bold">{value ?? "-"}</div><p className="text-[11px] text-muted-foreground mt-1">{sub}</p></>}
      </CardContent>
    </Card>
  );
}
