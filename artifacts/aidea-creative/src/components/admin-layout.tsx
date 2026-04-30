import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, CalendarRange, Package, Image as ImageIcon,
  Clock, Users, FileBarChart, MessagesSquare, LogOut, Menu, ShieldCheck, ExternalLink,
  Megaphone, Settings, UserCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

const navItems = [
  { href: "/dashboard", label: "Beranda", icon: LayoutDashboard },
  { href: "/dashboard/booking", label: "Booking", icon: CalendarRange },
  { href: "/dashboard/produk", label: "Produk", icon: Package },
  { href: "/dashboard/portfolio", label: "Portfolio", icon: ImageIcon },
  { href: "/dashboard/jadwal", label: "Jadwal Studio", icon: Clock },
  { href: "/dashboard/testimoni", label: "Testimoni", icon: Users },
  { href: "/dashboard/promo", label: "Banner Promo", icon: Megaphone },
  { href: "/dashboard/users", label: "Pengguna", icon: UserCog },
  { href: "/dashboard/landing", label: "Landing Page", icon: Settings },
  { href: "/dashboard/chat", label: "Chat AI & Inbox", icon: MessagesSquare },
  { href: "/dashboard/laporan", label: "Laporan", icon: FileBarChart },
];

export function AdminLayout({ children, title, subtitle }: { children: ReactNode; title: string; subtitle?: string }) {
  const [location, setLocation] = useLocation();
  const { signOut, profile } = useAuth();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => (href === "/dashboard" ? location === "/dashboard" : location.startsWith(href));

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
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((it) => {
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
                  <Icon size={17} /> {it.label}
                </button>
              </Link>
            );
          })}
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
            <button className="md:hidden" onClick={() => setOpen(true)}><Menu size={22} /></button>
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
