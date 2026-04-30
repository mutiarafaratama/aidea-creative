import { useState } from "react";
import { 
  useGetDashboardStats, getGetDashboardStatsQueryKey,
  useGetRecentBookings, getGetRecentBookingsQueryKey,
  useListPaket, getListPaketQueryKey,
  useUpdateBookingStatus
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { 
  LayoutDashboard, CalendarRange, Package, ShoppingBag, 
  Users, Settings, LogOut, TrendingUp, Check, X, Clock
} from "lucide-react";
import { useLocation } from "wouter";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { AdminPromoManager } from "@/components/admin-promo-manager";

export default function Dashboard() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const { signOut, profile } = useAuth();
  const queryClient = useQueryClient();
  
  const { data: stats, isLoading: loadingStats } = useGetDashboardStats({ query: { queryKey: getGetDashboardStatsQueryKey() } });
  const { data: recentBookings, isLoading: loadingBookings } = useGetRecentBookings({ query: { queryKey: getGetRecentBookingsQueryKey() } });
  const { data: paketList, isLoading: loadingPaket } = useListPaket({ query: { queryKey: getListPaketQueryKey() } });
  
  const updateBookingStatus = useUpdateBookingStatus();

  const handleUpdateStatus = (id: string, status: 'dikonfirmasi' | 'selesai' | 'dibatalkan') => {
    updateBookingStatus.mutate({ id, data: { status } }, {
      onSuccess: () => {
        const label = status === 'dikonfirmasi' ? 'Dikonfirmasi' : status === 'selesai' ? 'Selesai' : 'Dibatalkan';
        toast({ title: "Status Diperbarui", description: `Booking telah diubah menjadi ${label}` });
        queryClient.invalidateQueries({ queryKey: getGetRecentBookingsQueryKey() });
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'menunggu': return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"><Clock className="mr-1 h-3 w-3"/> Menunggu</Badge>;
      case 'dikonfirmasi': return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">Dikonfirmasi</Badge>;
      case 'selesai': return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20"><Check className="mr-1 h-3 w-3"/> Selesai</Badge>;
      case 'dibatalkan': return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20"><X className="mr-1 h-3 w-3"/> Dibatalkan</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="flex min-h-screen bg-muted/20">
      {/* Sidebar Admin */}
      <aside className="w-64 bg-card border-r border-border hidden md:flex flex-col">
        <div className="p-6 border-b border-border">
          <h2 className="font-serif font-bold text-xl text-primary">Aidea Admin</h2>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Button variant="secondary" className="w-full justify-start"><LayoutDashboard className="mr-2 h-4 w-4"/> Ringkasan</Button>
          <Button variant="ghost" className="w-full justify-start"><CalendarRange className="mr-2 h-4 w-4"/> Data Booking</Button>
          <Button variant="ghost" className="w-full justify-start"><Package className="mr-2 h-4 w-4"/> Kelola Paket</Button>
          <Button variant="ghost" className="w-full justify-start"><ShoppingBag className="mr-2 h-4 w-4"/> Toko Produk</Button>
          <Button variant="ghost" className="w-full justify-start"><Users className="mr-2 h-4 w-4"/> Testimoni</Button>
          <Button variant="ghost" className="w-full justify-start"><Settings className="mr-2 h-4 w-4"/> Pengaturan</Button>
        </nav>
        <div className="p-4 border-t border-border">
          <Button variant="ghost" className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={async () => { await signOut(); setLocation("/"); }}>
            <LogOut className="mr-2 h-4 w-4"/> Keluar
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-serif font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Selamat datang kembali, {profile?.nama_lengkap ?? "Admin"}.</p>
          </div>
          <Button variant="outline" className="md:hidden" onClick={() => setLocation("/")}>Kembali ke Web</Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Booking</CardTitle>
              <CalendarRange className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingStats ? <Skeleton className="h-8 w-20" /> : (
                <>
                  <div className="text-2xl font-bold">{stats?.totalBooking}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="text-green-500 font-medium flex items-center inline-flex"><TrendingUp className="mr-1 h-3 w-3"/> +{stats?.bookingBulanIni}</span> bulan ini
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pendapatan</CardTitle>
              <div className="h-4 w-4 text-muted-foreground font-bold font-serif text-center">Rp</div>
            </CardHeader>
            <CardContent>
              {loadingStats ? <Skeleton className="h-8 w-32" /> : (
                <>
                  <div className="text-2xl font-bold">Rp {(stats?.totalPendapatan || 0).toLocaleString('id-ID')}</div>
                  <p className="text-xs text-muted-foreground mt-1">Bulan ini: Rp {(stats?.pendapatanBulanIni || 0).toLocaleString('id-ID')}</p>
                </>
              )}
            </CardContent>
          </Card>
          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Rating Rata-rata</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingStats ? <Skeleton className="h-8 w-16" /> : (
                <>
                  <div className="text-2xl font-bold">{Number(stats?.ratingRataRata || 0).toFixed(1)} / 5.0</div>
                  <p className="text-xs text-muted-foreground mt-1">Dari {stats?.totalTestimoni} ulasan</p>
                </>
              )}
            </CardContent>
          </Card>
          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Produk</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingStats ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-2xl font-bold">{stats?.totalProduk} Item</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detail Tabs */}
        <Tabs defaultValue="bookings" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="bookings">Booking Terbaru</TabsTrigger>
            <TabsTrigger value="packages">Daftar Paket</TabsTrigger>
            <TabsTrigger value="promo">Promo</TabsTrigger>
          </TabsList>
          
          <TabsContent value="bookings">
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle>Reservasi & Status</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingBookings ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Kode</TableHead>
                          <TableHead>Pelanggan</TableHead>
                          <TableHead>Tanggal Sesi</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {!recentBookings || recentBookings.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Tidak ada booking terbaru</TableCell>
                          </TableRow>
                        ) : (
                          recentBookings.map(booking => (
                            <TableRow key={booking.id}>
                              <TableCell className="font-mono text-xs">{booking.kodeBooking}</TableCell>
                              <TableCell>
                                <div className="font-medium">{booking.namaPemesan}</div>
                                <div className="text-xs text-muted-foreground">{booking.telepon}</div>
                              </TableCell>
                              <TableCell>
                                <div>{booking.tanggalSesi}</div>
                                <div className="text-xs text-muted-foreground">{booking.jamSesi}</div>
                              </TableCell>
                              <TableCell>{getStatusBadge(booking.status)}</TableCell>
                              <TableCell className="font-bold">Rp {booking.totalHarga.toLocaleString('id-ID')}</TableCell>
                              <TableCell className="text-right space-x-2">
                                {booking.status === 'menunggu' && (
                                  <>
                                    <Button size="sm" variant="outline" className="text-green-600 border-green-200 bg-green-50 hover:bg-green-100" onClick={() => handleUpdateStatus(booking.id, 'dikonfirmasi')}>Konfirmasi</Button>
                                    <Button size="sm" variant="outline" className="text-red-600 border-red-200 bg-red-50 hover:bg-red-100" onClick={() => handleUpdateStatus(booking.id, 'dibatalkan')}>Batal</Button>
                                  </>
                                )}
                                {booking.status === 'dikonfirmasi' && (
                                  <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(booking.id, 'selesai')}>Selesaikan</Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="packages">
            <Card className="border-border shadow-sm">
              <CardHeader className="flex flex-row justify-between items-center">
                <CardTitle>Manajemen Paket Foto</CardTitle>
                <Button size="sm">Tambah Paket</Button>
              </CardHeader>
              <CardContent>
                {loadingPaket ? (
                  <Skeleton className="h-40 w-full" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama Paket</TableHead>
                        <TableHead>Durasi</TableHead>
                        <TableHead>Jumlah Foto</TableHead>
                        <TableHead>Harga</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.isArray(paketList) && paketList.map(paket => (
                        <TableRow key={paket.id}>
                          <TableCell className="font-medium">{paket.namaPaket}</TableCell>
                          <TableCell>{paket.durasiSesi} menit</TableCell>
                          <TableCell>{paket.jumlahFoto} foto</TableCell>
                          <TableCell>Rp {paket.harga.toLocaleString('id-ID')}</TableCell>
                          <TableCell>{paket.isPopuler ? <Badge>Populer</Badge> : <Badge variant="outline">Standar</Badge>}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="ghost">Edit</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="promo">
            <AdminPromoManager />
          </TabsContent>
        </Tabs>

      </main>
    </div>
  );
}
