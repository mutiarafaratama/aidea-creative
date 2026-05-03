import { useEffect, useState } from "react";
import { FileBarChart, Sparkles, Loader2 } from "lucide-react";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { adminFetch } from "@/lib/admin-api";

export default function AdminLaporan() {
  const { toast } = useToast();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [narrative, setNarrative] = useState("");
  const [narrativeLoading, setNarrativeLoading] = useState(false);

  const load = async () => {
    setLoading(true); setNarrative("");
    try {
      const res = await adminFetch<any>(`/admin/laporan/bulanan?month=${month}`);
      setData(res);
    } catch (err: any) { toast({ title: "Gagal", description: err?.message, variant: "destructive" }); }
    setLoading(false);
  };
  useEffect(() => { load(); }, [month]);

  const generateNarrative = async () => {
    setNarrativeLoading(true);
    const ctx = JSON.stringify({ bulan: data?.month, stats: data?.stats, topPaket: data?.topPaket });
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: "Kamu adalah AI analis studio foto AideaCreative. Jawab dalam Bahasa Indonesia yang profesional dan friendly.",
          prompt: `Buat narasi laporan bulanan 1 paragraf (4-5 kalimat) untuk pemilik studio berdasarkan data: ${ctx}. Soroti performa, highlight paket terlaris, dan berikan 1 saran actionable.`,
          maxTokens: 400,
        }),
      });
      const json = await res.json();
      setNarrative(json?.text ?? "AI tidak merespons.");
    } catch {
      setNarrative("Gagal generate narasi.");
    }
    setNarrativeLoading(false);
  };

  const s = data?.stats ?? {};

  return (
    <AdminLayout title="Laporan Bulanan" subtitle="Performa studio per bulan + narasi AI otomatis.">
      <Card className="mb-4">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-end gap-3">
          <div><Label>Pilih Bulan</Label><Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></div>
          <Button onClick={load} disabled={loading} variant="outline">{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Muat Ulang</Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        {[
          { label: "Total Booking", val: s.totalBooking ?? 0 },
          { label: "Selesai", val: s.selesai ?? 0 },
          { label: "Menunggu", val: s.menunggu ?? 0 },
          { label: "Dibatalkan", val: s.dibatalkan ?? 0 },
          { label: "Pendapatan", val: `Rp ${Number(s.pendapatan ?? 0).toLocaleString("id-ID")}` },
        ].map((c) => (
          <Card key={c.label}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{c.label}</p>{loading ? <Skeleton className="h-6 w-20 mt-1" /> : <p className="text-lg font-bold mt-1">{c.val}</p>}</CardContent></Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileBarChart className="h-4 w-4" /> Paket Terlaris</CardTitle></CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-20 w-full" /> : !data?.topPaket || data.topPaket.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada booking di bulan ini.</p> : (
              <ul className="space-y-2">
                {data.topPaket.map((p: any, i: number) => (
                  <li key={i} className="flex items-center justify-between border-b last:border-0 pb-2 last:pb-0">
                    <span className="text-sm font-medium">{i + 1}. {p.namaPaket}</span>
                    <span className="text-xs text-muted-foreground">{p.count}x booking</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-primary/5 border-foreground/10">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4" /> Narasi AI</CardTitle>
            <Button size="sm" onClick={generateNarrative} disabled={narrativeLoading || !data}>{narrativeLoading ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Menulis...</> : "Generate"}</Button>
          </CardHeader>
          <CardContent>
            {narrative ? <p className="text-sm leading-relaxed whitespace-pre-line">{narrative}</p> : <p className="text-sm text-muted-foreground italic">Klik "Generate" untuk dapat narasi laporan bulanan dari AI.</p>}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
