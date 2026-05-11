/**
 * GlobalStatusNotifier
 *
 * Komponen ini di-mount sekali di App.tsx dan tidak pernah unmount.
 * Ia melakukan polling status booking & pesanan di latar belakang,
 * sehingga pelanggan dan admin mendapat toast notifikasi di halaman
 * mana pun mereka berada — bukan hanya saat di halaman Profil / Dashboard.
 *
 * Duplikasi dihindari: saat user ada di /profil (pelanggan) atau
 * /dashboard/booking|pesanan (admin), halaman tersebut sudah punya
 * polling & toast sendiri, sehingga notifier ini diam.
 */

import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { soundStatusUpdate } from "@/lib/notify-sound";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function authHeaders(): Record<string, string> {
  try {
    const token = localStorage.getItem("auth_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

const BOOKING_LABEL: Record<string, string> = {
  menunggu: "Menunggu Konfirmasi",
  dikonfirmasi: "Dikonfirmasi",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

const BAYAR_LABEL: Record<string, string> = {
  belum_bayar: "Belum Bayar",
  dp: "DP / Uang Muka",
  lunas: "Lunas",
};

const PESANAN_LABEL: Record<string, string> = {
  diproses: "Diproses",
  dikerjakan: "Sedang Dikerjakan",
  siap_ambil: "Siap Diambil",
  dikirim: "Dikirim",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

// ── Pelanggan poller ─────────────────────────────────────────────────────────

function usePelangganPoller(active: boolean) {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();

  const bookingRef = useRef<Map<string, { status: string; statusPembayaran: string }>>(new Map());
  const pesananRef = useRef<Map<string, string>>(new Map());
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!active) {
      initializedRef.current = false;
      bookingRef.current = new Map();
      pesananRef.current = new Map();
      return;
    }

    // Seed initial state without triggering toasts
    const seed = async () => {
      try {
        const [bRes, pRes] = await Promise.all([
          fetch(`${API_BASE}/api/booking/me`, { headers: authHeaders() }),
          fetch(`${API_BASE}/api/pesanan/me`, { headers: authHeaders() }),
        ]);
        if (bRes.ok) {
          const bookings = await bRes.json();
          if (Array.isArray(bookings)) {
            bookingRef.current = new Map(
              bookings.map((x: any) => [x.id, { status: x.status, statusPembayaran: x.statusPembayaran }])
            );
          }
        }
        if (pRes.ok) {
          const pesanan = await pRes.json();
          if (Array.isArray(pesanan)) {
            pesananRef.current = new Map(pesanan.map((x: any) => [x.id, x.status]));
          }
        }
      } catch {}
      initializedRef.current = true;
    };
    seed();
  }, [active]);

  useEffect(() => {
    if (!active) return;

    const poll = async () => {
      if (!initializedRef.current) return;

      // Saat di /profil, biarkan halaman itu yang handle toastnya sendiri
      const onProfil = location === "/profil" || location.startsWith("/profil");

      try {
        // ── Booking ──
        const bRes = await fetch(`${API_BASE}/api/booking/me`, { headers: authHeaders() });
        if (bRes.ok) {
          const bookings: any[] = await bRes.json();
          if (Array.isArray(bookings)) {
            const prev = bookingRef.current;
            if (!onProfil) {
              bookings.forEach((b) => {
                const p = prev.get(b.id);
                if (p) {
                  if (p.status !== b.status) {
                    soundStatusUpdate();
                    toast({
                      title: "Status booking diperbarui",
                      description: `${b.kodeBooking}: ${BOOKING_LABEL[b.status] ?? b.status} — Ketuk untuk lihat`,
                      duration: 7000,
                      className: "cursor-pointer",
                      onClick: () => setLocation("/profil"),
                    } as any);
                  } else if (p.statusPembayaran !== b.statusPembayaran) {
                    soundStatusUpdate();
                    toast({
                      title: "Status pembayaran booking diperbarui",
                      description: `${b.kodeBooking}: ${BAYAR_LABEL[b.statusPembayaran] ?? b.statusPembayaran} — Ketuk untuk lihat`,
                      duration: 7000,
                      className: "cursor-pointer",
                      onClick: () => setLocation("/profil"),
                    } as any);
                  }
                }
              });
            }
            bookingRef.current = new Map(
              bookings.map((x: any) => [x.id, { status: x.status, statusPembayaran: x.statusPembayaran }])
            );
          }
        }
      } catch {}

      try {
        // ── Pesanan ──
        const pRes = await fetch(`${API_BASE}/api/pesanan/me`, { headers: authHeaders() });
        if (pRes.ok) {
          const pesanan: any[] = await pRes.json();
          if (Array.isArray(pesanan)) {
            const prev = pesananRef.current;
            if (!onProfil) {
              pesanan.forEach((p) => {
                const prevStatus = prev.get(p.id);
                if (prevStatus && prevStatus !== p.status) {
                  soundStatusUpdate();
                  toast({
                    title: "Status pesanan diperbarui",
                    description: `${p.kodePesanan}: ${PESANAN_LABEL[p.status] ?? p.status} — Ketuk untuk lihat`,
                    duration: 7000,
                    className: "cursor-pointer",
                    onClick: () => setLocation("/profil"),
                  } as any);
                }
              });
            }
            pesananRef.current = new Map(pesanan.map((x: any) => [x.id, x.status]));
          }
        }
      } catch {}
    };

    const id = setInterval(poll, 9000);
    return () => clearInterval(id);
  }, [active, location, toast]);
}

// ── Admin poller ──────────────────────────────────────────────────────────────

function useAdminPoller(active: boolean) {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();

  const bookingRef = useRef<Map<string, { status: string; statusPembayaran: string }>>(new Map());
  const pesananRef = useRef<Map<string, string>>(new Map());
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!active) {
      initializedRef.current = false;
      bookingRef.current = new Map();
      pesananRef.current = new Map();
      return;
    }

    const seed = async () => {
      try {
        const [bRes, pRes] = await Promise.all([
          fetch(`${API_BASE}/api/booking`, { headers: authHeaders() }),
          fetch(`${API_BASE}/api/pesanan`, { headers: authHeaders() }),
        ]);
        if (bRes.ok) {
          const bookings = await bRes.json();
          if (Array.isArray(bookings)) {
            bookingRef.current = new Map(
              bookings.map((x: any) => [x.id, { status: x.status, statusPembayaran: x.statusPembayaran }])
            );
          }
        }
        if (pRes.ok) {
          const pesanan = await pRes.json();
          if (Array.isArray(pesanan)) {
            pesananRef.current = new Map(pesanan.map((x: any) => [x.id, x.status]));
          }
        }
      } catch {}
      initializedRef.current = true;
    };
    seed();
  }, [active]);

  useEffect(() => {
    if (!active) return;

    const poll = async () => {
      if (!initializedRef.current) return;

      const onBookingPage = location === "/dashboard/booking" || location.startsWith("/dashboard/booking");
      const onPesananPage = location === "/dashboard/pesanan" || location.startsWith("/dashboard/pesanan");

      try {
        // ── Booking ──
        const bRes = await fetch(`${API_BASE}/api/booking`, { headers: authHeaders() });
        if (bRes.ok) {
          const bookings: any[] = await bRes.json();
          if (Array.isArray(bookings)) {
            const prev = bookingRef.current;
            if (!onBookingPage) {
              // Booking baru
              const newBookings = bookings.filter((b) => !prev.has(b.id));
              if (newBookings.length > 0) {
                toast({
                  title: `${newBookings.length} booking baru masuk`,
                  description: `${newBookings.map((b: any) => b.kodeBooking ?? b.namaPemesan).join(", ")} — Ketuk untuk lihat`,
                  duration: 8000,
                  className: "cursor-pointer",
                  onClick: () => setLocation("/dashboard/booking"),
                } as any);
              }
              // Status berubah
              bookings.forEach((b) => {
                const p = prev.get(b.id);
                if (p) {
                  if (p.statusPembayaran !== b.statusPembayaran && b.statusPembayaran === "lunas") {
                    toast({
                      title: "Pembayaran diterima!",
                      description: `${b.kodeBooking ?? b.namaPemesan} telah melunasi pembayaran. — Ketuk untuk lihat`,
                      duration: 8000,
                      className: "cursor-pointer",
                      onClick: () => setLocation("/dashboard/booking"),
                    } as any);
                  }
                }
              });
            }
            bookingRef.current = new Map(
              bookings.map((x: any) => [x.id, { status: x.status, statusPembayaran: x.statusPembayaran }])
            );
          }
        }
      } catch {}

      try {
        // ── Pesanan ──
        const pRes = await fetch(`${API_BASE}/api/pesanan`, { headers: authHeaders() });
        if (pRes.ok) {
          const pesanan: any[] = await pRes.json();
          if (Array.isArray(pesanan)) {
            const prev = pesananRef.current;
            if (!onPesananPage) {
              // Pesanan baru
              const newOrders = pesanan.filter((p) => !prev.has(p.id));
              if (newOrders.length > 0) {
                toast({
                  title: `${newOrders.length} pesanan baru masuk`,
                  description: `${newOrders.map((p: any) => p.kodePesanan).join(", ")} — Ketuk untuk lihat`,
                  duration: 8000,
                  className: "cursor-pointer",
                  onClick: () => setLocation("/dashboard/pesanan"),
                } as any);
              }
              // Status berubah
              pesanan.forEach((p) => {
                const prevStatus = prev.get(p.id);
                if (prevStatus && prevStatus !== p.status) {
                  toast({
                    title: "Status pesanan berubah",
                    description: `${p.kodePesanan}: ${PESANAN_LABEL[p.status] ?? p.status} — Ketuk untuk lihat`,
                    duration: 7000,
                    className: "cursor-pointer",
                    onClick: () => setLocation("/dashboard/pesanan"),
                  } as any);
                }
              });
            }
            pesananRef.current = new Map(pesanan.map((x: any) => [x.id, x.status]));
          }
        }
      } catch {}
    };

    const id = setInterval(poll, 9000);
    return () => clearInterval(id);
  }, [active, location, toast]);
}

// ── Main export ───────────────────────────────────────────────────────────────

export function GlobalStatusNotifier() {
  const { profile, profileChecked } = useAuth();

  const isPelanggan = profileChecked && profile?.role === "pelanggan";
  const isAdmin = profileChecked && profile?.role === "admin";

  usePelangganPoller(isPelanggan);
  useAdminPoller(isAdmin);

  return null;
}
