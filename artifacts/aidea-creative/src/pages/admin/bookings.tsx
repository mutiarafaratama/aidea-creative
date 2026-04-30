import { useState } from "react";
import { useGetRecentBookings, getGetRecentBookingsQueryKey, useUpdateBookingStatus } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Clock, X, Search } from "lucide-react";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

const statuses = ["semua", "menunggu", "dikonfirmasi", "selesai", "dibatalkan"] as const;

export default function AdminBookings() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useGetRecentBookings({ query: { queryKey: getGetRecentBookingsQueryKey() } });
  const mutate = useUpdateBookingStatus();
  const [filter, setFilter] = useState<(typeof statuses)[number]>("semua");
  const [search, setSearch] = useState("");

  const bookings = Array.isArray(data) ? data : [];
  const filtered = bookings.filter((b: any) =>
    (filter === "semua" || b.status === filter) &&
    (search === "" || b.namaPemesan.toLowerCase().includes(search.toLowerCase()) || b.kodeBooking.toLowerCase().includes(search.toLowerCase()))
  );

  const setStatus = (id: string, status: "dikonfirmasi" | "selesai" | "dibatalkan") => {
    mutate.mutate({ id, data: { status } }, {
      onSuccess: () => {
        toast({ title: "Status diperbarui" });
        qc.invalidateQueries({ queryKey: getGetRecentBookingsQueryKey() });
      },
    });
  };

  const badge = (s: string) => ({
    menunggu: <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20" variant="outline"><Clock className="mr-1 h-3 w-3" /> Menunggu</Badge>,
    dikonfirmasi: <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/20" variant="outline">Dikonfirmasi</Badge>,
    selesai: <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20" variant="outline"><Check className="mr-1 h-3 w-3" /> Selesai</Badge>,
    dibatalkan: <Badge className="bg-red-500/10 text-red-700 border-red-500/20" variant="outline"><X className="mr-1 h-3 w-3" /> Dibatalkan</Badge>,
  } as any)[s] ?? <Badge>{s}</Badge>;

  return (
    <AdminLayout title="Manajemen Booking" subtitle="Setujui, tinjau, dan kelola semua reservasi pelanggan.">
      <Card className="mb-4">
        <CardContent className="p-4 flex flex-col md:flex-row gap-3 md:items-center justify-between">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
            <TabsList>{statuses.map((s) => <TabsTrigger key={s} value={s} className="capitalize">{s}</TabsTrigger>)}</TabsList>
          </Tabs>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama / kode..." className="pl-9" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-6 space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead><TableHead>Pelanggan</TableHead><TableHead>Tanggal Sesi</TableHead>
                  <TableHead>Status</TableHead><TableHead>Total</TableHead><TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Tidak ada booking.</TableCell></TableRow>
                ) : filtered.map((b: any) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-xs">{b.kodeBooking}</TableCell>
                    <TableCell><div className="font-medium">{b.namaPemesan}</div><div className="text-xs text-muted-foreground">{b.telepon}</div></TableCell>
                    <TableCell>{b.tanggalSesi}<div className="text-xs text-muted-foreground">{b.jamSesi}</div></TableCell>
                    <TableCell>{badge(b.status)}</TableCell>
                    <TableCell className="font-semibold">Rp {Number(b.totalHarga).toLocaleString("id-ID")}</TableCell>
                    <TableCell className="text-right space-x-1">
                      {b.status === "menunggu" && (<>
                        <Button size="sm" variant="outline" className="text-emerald-700 border-emerald-200 hover:bg-emerald-50" onClick={() => setStatus(b.id, "dikonfirmasi")}>Setujui</Button>
                        <Button size="sm" variant="outline" className="text-red-700 border-red-200 hover:bg-red-50" onClick={() => setStatus(b.id, "dibatalkan")}>Tolak</Button>
                      </>)}
                      {b.status === "dikonfirmasi" && <Button size="sm" variant="outline" onClick={() => setStatus(b.id, "selesai")}>Selesaikan</Button>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
