import { useMemo, useState } from "react";
import {
  useGetRecentBookings, getGetRecentBookingsQueryKey,
  useUpdateBookingStatus,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Clock, Search } from "lucide-react";

const statusColor: Record<string, string> = {
  menunggu: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30",
  dikonfirmasi: "bg-blue-500/10 text-blue-700 border-blue-500/30",
  selesai: "bg-green-500/10 text-green-700 border-green-500/30",
  dibatalkan: "bg-red-500/10 text-red-700 border-red-500/30",
};

export default function AdminBooking() {
  const { data, isLoading } = useGetRecentBookings({ query: { queryKey: getGetRecentBookingsQueryKey() } });
  const updateStatus = useUpdateBookingStatus();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("semua");

  const items = useMemo(() => {
    const list = Array.isArray(data) ? data : [];
    return list.filter((b: any) => {
      const matchQ = !q || b.namaPemesan?.toLowerCase().includes(q.toLowerCase()) || b.kodeBooking?.includes(q);
      const matchS = filter === "semua" || b.status === filter;
      return matchQ && matchS;
    });
  }, [data, q, filter]);

  const act = (id: string, status: "dikonfirmasi" | "selesai" | "dibatalkan") => {
    updateStatus.mutate({ id, data: { status } }, {
      onSuccess: () => {
        toast({ title: "Status diperbarui", description: `Booking: ${status}` });
        qc.invalidateQueries({ queryKey: getGetRecentBookingsQueryKey() });
      },
      onError: (e: any) => toast({ title: "Gagal", description: e.message, variant: "destructive" }),
    });
  };

  return (
    <AdminLayout title="Manajemen Booking" subtitle="Setujui, tolak, atau selesaikan reservasi pelanggan">
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama atau kode booking..." className="pl-9" />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full md:w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Status</SelectItem>
            <SelectItem value="menunggu">Menunggu</SelectItem>
            <SelectItem value="dikonfirmasi">Dikonfirmasi</SelectItem>
            <SelectItem value="selesai">Selesai</SelectItem>
            <SelectItem value="dibatalkan">Dibatalkan</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3">
        {isLoading && <p className="text-sm text-muted-foreground">Memuat...</p>}
        {!isLoading && items.length === 0 && <p className="text-sm text-muted-foreground text-center py-10">Tidak ada booking</p>}
        {items.map((b: any) => (
          <Card key={b.id} className="border-border">
            <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-muted-foreground">{b.kodeBooking}</span>
                  <Badge className={statusColor[b.status] || ""}>{b.status}</Badge>
                </div>
                <p className="font-semibold">{b.namaPemesan}</p>
                <p className="text-sm text-muted-foreground">{b.telepon} · {b.email}</p>
                <p className="text-xs text-muted-foreground mt-1"><Clock size={12} className="inline mr-1" />{b.tanggalSesi} · {b.jamSesi}</p>
                {b.catatan && <p className="text-xs mt-1 italic">"{b.catatan}"</p>}
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">Rp {b.totalHarga?.toLocaleString("id-ID")}</p>
                <div className="flex gap-2 mt-2 justify-end">
                  {b.status === "menunggu" && (
                    <>
                      <Button size="sm" variant="outline" className="border-green-300 text-green-700 hover:bg-green-50" onClick={() => act(b.id, "dikonfirmasi")}>
                        <Check size={14} className="mr-1" /> Setujui
                      </Button>
                      <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-50" onClick={() => act(b.id, "dibatalkan")}>
                        <X size={14} className="mr-1" /> Tolak
                      </Button>
                    </>
                  )}
                  {b.status === "dikonfirmasi" && (
                    <Button size="sm" onClick={() => act(b.id, "selesai")}>Selesaikan</Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminLayout>
  );
}
