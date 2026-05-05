import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, CalendarRange, Package, Image as ImageIcon,
  Clock, Users, FileBarChart, MessagesSquare, LogOut, Menu, X, ShieldCheck, ExternalLink,
  Megaphone, Settings, UserCog, ShoppingCart, Camera, PanelLeft,
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
  const [desktopOpen, setDesktopOpen] = useState(() => {
    try { return localStorage.getItem("admin-sidebar") !== "closed"; } catch { return true; }
  });
  const { bookingCount, pesananCount } = usePendingCounts();

  useEffect(() => {
    try { localStorage.setItem("admin-sidebar", desktopOpen ? "open" : "closed"); } catch {}
  }, [desktopOpen]);

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
      <aside className={`fixed top-0 left-0 h-dvh w-64 bg-background border-r border-border z-40 flex flex-col transition-transform duration-200
        ${open ? "translate-x-0" : "-translate-x-full"}
        ${desktopOpen ? "md:sticky md:flex md:translate-x-0" : "md:hidden"}`}>
        <div className="p-4 border-b border-border flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-foreground text-background flex items-center justify-center shrink-0">
            <ShieldCheck size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">Aidea Admin</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Control Center</p>
          </div>
          <button
            className="md:hidden p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            onClick={() => setOpen(false)}
            aria-label="Tutup sidebar"
          >
            <X size={18} />
          </button>
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
        <div className="p-3 border-t border-border space-y-1 shrink-0">
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
          <div className="relative flex items-center px-4 md:px-8 h-16">
            {/* Kiri: hamburger */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                className="md:hidden p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                onClick={() => setOpen((o) => !o)}
                aria-label="Buka sidebar"
              >
                <Menu size={20} />
              </button>
              <button
                className="hidden md:flex p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                onClick={() => setDesktopOpen((o) => !o)}
                aria-label={desktopOpen ? "Tutup sidebar" : "Buka sidebar"}
                title={desktopOpen ? "Tutup sidebar" : "Buka sidebar"}
              >
                <PanelLeft size={20} />
              </button>
            </div>
            {/* Tengah: title (absolute center) */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-16">
              <h1 className="text-base md:text-xl font-bold leading-tight text-center truncate max-w-full">{title}</h1>
              {subtitle && <p className="text-[11px] md:text-xs text-muted-foreground text-center truncate max-w-full">{subtitle}</p>}
            </div>
          </div>
        </header>
        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
