import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, CalendarRange, Package, Image as ImageIcon,
  Clock, Users, FileBarChart, MessagesSquare, LogOut, Menu, X, ShieldCheck, ExternalLink,
  Megaphone, Settings, UserCog, ShoppingCart, Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { adminFetch } from "@/lib/admin-api";

function usePendingCounts() {
  const [bookingCount, setBookingCount] = useState(0);
  const [pesananCount, setPesananCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [bookings, pesanan] = await Promise.all([
          adminFetch<any[]>("/dashboard/recent-bookings"),
          adminFetch<any[]>("/pesanan"),
        ]);
        if (cancelled) return;
        if (Array.isArray(bookings)) {
          setBookingCount(bookings.filter((b: any) => b.status === "menunggu").length);
        }
        if (Array.isArray(pesanan)) {
          setPesananCount(pesanan.filter((p: any) => p.status === "diproses" || p.status === "dikerjakan").length);
        }
      } catch {
        // silently ignore
      }
    };
    load();
    const interval = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { bookingCount, pesananCount };
}

export function AdminLayout({ children, title, subtitle }: { children: ReactNode; title: string; subtitle?: string }) {
  const [location, setLocation] = useLocation();
  const { signOut, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const { bookingCount, pesananCount } = usePendingCounts();

  const isActive = (href: string) => (href === "/dashboard" ? location === "/dashboard" : location.startsWith(href));

  const navGroups = [
    {
      label: null,
      items: [
        { href: "/dashboard", label: "Beranda", icon: LayoutDashboard, badge: 0 },
      ],
    },
    {
      label: "Operasional",
      items: [
        { href: "/dashboard/booking", label: "Booking", icon: CalendarRange, badge: bookingCount },
        { href: "/dashboard/jadwal", label: "Jadwal Studio", icon: Clock, badge: 0 },
        { href: "/dashboard/pesanan", label: "Pesanan Toko", icon: ShoppingCart, badge: pesananCount },
      ],
    },
    {
      label: "Layanan & Konten",
      items: [
        { href: "/dashboard/paket", label: "Paket Layanan", icon: Camera, badge: 0 },
        { href: "/dashboard/produk", label: "Produk", icon: Package, badge: 0 },
        { href: "/dashboard/portfolio", label: "Portfolio", icon: ImageIcon, badge: 0 },
        { href: "/dashboard/promo", label: "Banner Promo", icon: Megaphone, badge: 0 },
      ],
    },
    {
      label: "Komunitas",
      items: [
        { href: "/dashboard/testimoni", label: "Testimoni", icon: Users, badge: 0 },
        { href: "/dashboard/chat", label: "Chat AI & Inbox", icon: MessagesSquare, badge: 0 },
      ],
    },
    {
      label: "Pengaturan",
      items: [
        { href: "/dashboard/landing", label: "Landing Page", icon: Settings, badge: 0 },
        { href: "/dashboard/users", label: "Pengguna", icon: UserCog, badge: 0 },
        { href: "/dashboard/laporan", label: "Laporan", icon: FileBarChart, badge: 0 },
      ],
    },
  ];

  return (
    <div className="min-h-screen flex bg-muted/30">
      <aside className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-background border-r border-border z-40 flex flex-col transition-transform md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-5 border-b border-border flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-foreground text-background flex items-center justify-center">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="font-bold text-sm">Aidea Admin</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Control Center</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {navGroups.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((it) => {
                  const Icon = it.icon;
                  const active = isActive(it.href);
                  return (
                    <Link key={it.href} href={it.href}>
                      <button
                        onClick={() => setOpen(false)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                          active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <Icon size={17} />
                        <span className="flex-1 text-left">{it.label}</span>
                        {it.badge > 0 && (
                          <span className={`min-w-[20px] h-5 rounded-full text-[10px] font-bold flex items-center justify-center px-1.5 ${
                            active ? "bg-background/20 text-background" : "bg-primary text-primary-foreground"
                          }`}>
                            {it.badge > 99 ? "99+" : it.badge}
                          </span>
                        )}
                      </button>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="p-3 border-t border-border space-y-1">
          <div className="px-3 py-2 text-xs">
            <p className="text-muted-foreground">Masuk sebagai</p>
            <p className="font-semibold truncate">{profile?.nama_lengkap ?? "Admin"}</p>
          </div>
          <Link href="/">
            <Button variant="outline" size="sm" className="w-full justify-start gap-2">
              <ExternalLink size={14} /> Lihat situs
            </Button>
          </Link>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={async () => { await signOut(); setLocation("/dashboard/login"); }}>
            <LogOut size={14} /> Keluar
          </Button>
        </div>
      </aside>

      {open && <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setOpen(false)} />}

      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-20 bg-background/85 backdrop-blur border-b border-border">
          <div className="flex items-center justify-between px-4 md:px-8 py-4">
            <button
              className="md:hidden p-1 rounded-lg hover:bg-muted transition-colors"
              onClick={() => setOpen((o) => !o)}
              aria-label={open ? "Tutup sidebar" : "Buka sidebar"}
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold">{title}</h1>
              {subtitle && <p className="text-xs md:text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
            </div>
            <div className="w-6 md:hidden" />
          </div>
        </header>
        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
