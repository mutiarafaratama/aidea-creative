import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Camera, Menu, X, Instagram, Facebook, MapPin, Phone, User, LogOut, LayoutDashboard } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useSiteSettings } from "@/lib/settings";
import { InstallPrompt } from "@/components/install-prompt";


function BrandLogo() {
  const [errored, setErrored] = useState(false);
  if (errored) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <Camera size={20} />
      </div>
    );
  }
  return (
    <img
      src="/images/logo.png"
      alt="AideaCreative"
      onError={() => setErrored(true)}
      className="h-10 w-10 rounded-lg object-cover shadow-sm"
    />
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user, profile, signOut } = useAuth();
  const { data: siteSettings } = useSiteSettings();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const navLinks = [
    { name: "Beranda", href: "/" },
    { name: "Portfolio", href: "/portfolio" },
    { name: "Paket", href: "/paket" },
    { name: "Toko", href: "/toko" },
    { name: "Testimoni", href: "/testimoni" },
    { name: "Photobooth", href: "/photobooth" },
  ];

  return (
    <div className="min-h-screen flex flex-col font-sans bg-white">
      <header
        className={`sticky top-0 z-50 transition-all duration-300 pt-2`}
      >
        <div className={`mx-auto flex items-center justify-between rounded-full border transition-all duration-300 container ${
          isScrolled
            ? "max-w-4xl px-3 md:px-4 bg-background/85 backdrop-blur-xl border-border/70 shadow-lg shadow-black/5 py-2"
            : "max-w-6xl px-4 md:px-6 bg-background/70 backdrop-blur-md border-border/50 shadow-md shadow-black/5 py-3"
        }`}>
          <Link href="/" className="flex items-center gap-2.5 z-50 min-w-0">
            <BrandLogo />
            <div
              className={`leading-tight overflow-hidden transition-all duration-300 ease-out ${
                isScrolled
                  ? "max-w-0 opacity-0 -translate-x-2"
                  : "max-w-[200px] opacity-100 translate-x-0"
              }`}
            >
              <p className="font-sans font-bold text-base tracking-tight text-primary whitespace-nowrap">AideaCreative</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground whitespace-nowrap">Smart Photo Studio</p>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className={`hidden lg:flex items-center transition-all duration-300 ${isScrolled ? "gap-4" : "gap-8"}`}>
            <ul className={`flex items-center transition-all duration-300 ${isScrolled ? "gap-4" : "gap-6"}`}>
              {navLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className={`text-sm font-medium transition-colors hover:text-primary ${
                      location === link.href ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/booking">
              <Button className="rounded-full px-6">Booking Sekarang</Button>
            </Link>
            {user ? (
              <>
                {profile?.role === "admin" && (
                  <Link href="/dashboard" aria-label="Dashboard Admin" title="Dashboard Admin">
                    <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground">
                      <LayoutDashboard className="h-4 w-4" />
                    </Button>
                  </Link>
                )}
                <Link href="/profil" aria-label="Profil saya" title={profile?.nama_lengkap ?? user.email ?? "Profil"}>
                  <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground">
                    <User className="h-4 w-4" />
                  </Button>
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link href={`/login?redirect=${encodeURIComponent(location)}`}>
                  <Button variant="ghost" className="rounded-full px-4 text-sm">
                    Login
                  </Button>
                </Link>
                <Link href={`/register?redirect=${encodeURIComponent(location)}`}>
                  <Button className="rounded-full px-5 bg-foreground text-background hover:bg-foreground/90">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </nav>

          {/* Mobile Toggle */}
          <button
            className="lg:hidden z-50 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/90 text-foreground shadow-sm backdrop-blur"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Tutup menu" : "Buka menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={22} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px] lg:hidden"
            aria-label="Tutup menu"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        <div
          className={`fixed right-0 top-0 z-50 h-screen w-[86vw] max-w-sm border-l border-border bg-background shadow-2xl transition-transform duration-300 ease-out lg:hidden ${
            mobileMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-border px-5 py-5">
              <Link href="/" className="flex items-center gap-2">
                <img src="/images/logo.png" alt="AideaCreative" className="h-9 w-9 rounded-lg object-cover" />
                <div>
                  <p className="font-serif text-lg font-bold leading-tight">AideaCreative</p>
                  <p className="text-xs text-muted-foreground">Studio Foto</p>
                </div>
              </Link>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Tutup menu"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-6">
              <div className="mb-6 rounded-2xl bg-primary/10 p-4">
                <p className="text-sm font-medium text-foreground">Butuh jadwal foto?</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Pilih paket dan booking sesi foto Anda langsung dari menu ini.
                </p>
                <Link href="/booking">
                  <Button className="mt-4 w-full rounded-full">Booking Sekarang</Button>
                </Link>
              </div>

              <nav className="space-y-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${
                      location === link.href
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <span>{link.name}</span>
                    <span className={location === link.href ? "text-primary-foreground/80" : "text-muted-foreground"}>›</span>
                  </Link>
                ))}
              </nav>
            </div>

            <div className="border-t border-border px-5 pt-4 pb-8" style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom, 2rem))" }}>
              {user ? (
                <div className="space-y-2.5">
                  <Link href="/profil">
                    <Button variant="outline" className="w-full rounded-full justify-start gap-2">
                      <User className="h-4 w-4" /> Profil Saya
                      {profile?.nama_lengkap && (
                        <span className="ml-auto text-xs text-muted-foreground truncate max-w-[120px]">{profile.nama_lengkap}</span>
                      )}
                    </Button>
                  </Link>
                  {profile?.role === "admin" && (
                    <Link href="/dashboard">
                      <Button className="w-full rounded-full justify-start gap-2 bg-foreground text-background hover:bg-foreground/90">
                        <LayoutDashboard className="h-4 w-4" /> Dashboard Admin
                      </Button>
                    </Link>
                  )}
                  <Button variant="ghost" className="w-full rounded-full justify-start gap-2 text-muted-foreground hover:text-foreground" onClick={signOut}>
                    <LogOut className="h-4 w-4" /> Keluar
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Link href={`/login?redirect=${encodeURIComponent(location)}`}>
                    <Button variant="outline" className="w-full rounded-full">Login</Button>
                  </Link>
                  <Link href={`/register?redirect=${encodeURIComponent(location)}`}>
                    <Button className="w-full rounded-full bg-foreground text-background hover:bg-foreground/90">Sign Up</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        {children}
      </main>

      <InstallPrompt />

      {location === "/" && (
      <footer className="bg-card border-t border-border pt-16 pb-8">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <img src="/images/logo.png" alt="AideaCreative" className="h-9 w-9 rounded-lg object-cover" />
                <span className="font-serif font-bold text-lg tracking-tight text-foreground">
                  AideaCreative
                </span>
              </Link>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                Studio foto premium di Pujodadi, Pringsewu. Kami mengabadikan momen berharga Anda dengan sentuhan sinematik dan profesional.
              </p>
              <div className="flex gap-4">
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  <Instagram size={20} />
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  <Facebook size={20} />
                </a>
              </div>
            </div>

            <div>
              <h4 className="font-serif font-semibold text-foreground mb-4">Layanan</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/paket" className="hover:text-primary transition-colors">Wedding & Pre-wedding</Link></li>
                <li><Link href="/paket" className="hover:text-primary transition-colors">Family Portrait</Link></li>
                <li><Link href="/paket" className="hover:text-primary transition-colors">Graduation</Link></li>
                <li><Link href="/paket" className="hover:text-primary transition-colors">Product Photography</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-serif font-semibold text-foreground mb-4">Tautan</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/portfolio" className="hover:text-primary transition-colors">Portfolio</Link></li>
                <li><Link href="/toko" className="hover:text-primary transition-colors">Toko Produk</Link></li>
                <li><Link href="/testimoni" className="hover:text-primary transition-colors">Testimoni</Link></li>
                <li><Link href="/booking" className="hover:text-primary transition-colors">Booking Online</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-serif font-semibold text-foreground mb-4">Kontak</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-3">
                  <MapPin size={18} className="text-primary shrink-0" />
                  <span>Jl. Raya Pujodadi No. 123, Kec. Pardasuka, Kab. Pringsewu, Lampung</span>
                </li>
                <li className="flex items-center gap-3">
                  <Phone size={18} className="text-primary shrink-0" />
                  {siteSettings?.contactWhatsapp ? (
                    <a
                      href={`https://wa.me/${siteSettings.contactWhatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary transition-colors"
                    >
                      +{siteSettings.contactWhatsapp.replace(/\D/g, "").replace(/^0/, "62")}
                    </a>
                  ) : (
                    <span>+62 812-3456-7890</span>
                  )}
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} AideaCreative Studio. Hak Cipta Dilindungi.</p>
            <div className="flex gap-4">
              <Link href="/login" className="hover:text-primary transition-colors">Login</Link>
              <Link href="/profil" className="hover:text-primary transition-colors">Profil</Link>
            </div>
          </div>
        </div>
      </footer>
      )}
    </div>
  );
}
