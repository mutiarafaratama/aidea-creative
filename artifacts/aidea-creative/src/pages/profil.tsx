import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Ban,
  CalendarCheck,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Clock,
  CreditCard,
  Loader2,
  LogOut,
  MessageSquare,
  Phone,
  Printer,
  Save,
  Star,
  Upload,
  User,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

type BookingRow = {
  id: string;
  kode_booking: string;
  nama_pemesan: string;
  email: string;
  telepon: string;
  tanggal_sesi: string;
  jam_sesi: string;
  konsep_foto: string | null;
  catatan_pelanggan: string | null;
  status: string;
  status_pembayaran: string;
  total_harga: number;
  created_at: string;
  paket_layanan: { nama_paket: string; harga: number } | null;
  alasan_pembatalan?: string | null;
  dibatalkan_oleh?: string | null;
};

type PesananRow = {
  id: string;
  kode_pesanan: string;
  status: string;
  total_harga: number;
  created_at: string;
};

type TestimoniRow = {
  id: string;
  rating: number;
  komentar: string;
  is_approved: boolean;
  created_at: string;
};

const STATUS_BOOKING: Record<string, { label: string; className: string }> = {
  menunggu:     { label: "Menunggu",     className: "bg-amber-100 text-amber-800 border border-amber-200" },
  dikonfirmasi: { label: "Dikonfirmasi", className: "bg-blue-100 text-blue-800 border border-blue-200" },
  selesai:      { label: "Selesai",      className: "bg-emerald-100 text-emerald-800 border border-emerald-200" },
  dibatalkan:   { label: "Dibatalkan",   className: "bg-red-100 text-red-800 border border-red-200" },
};

const STATUS_BAYAR: Record<string, { label: string; className: string }> = {
  belum_bayar: { label: "Belum Bayar", className: "bg-orange-100 text-orange-800 border border-orange-200" },
  dp:          { label: "DP",          className: "bg-sky-100 text-sky-800 border border-sky-200" },
  lunas:       { label: "Lunas",       className: "bg-emerald-100 text-emerald-800 border border-emerald-200" },
};

const STATUS_PESANAN: Record<string, { label: string; className: string }> = {
  diproses:   { label: "Diproses",   className: "bg-amber-100 text-amber-800 border border-amber-200" },
  dikerjakan: { label: "Dikerjakan", className: "bg-blue-100 text-blue-800 border border-blue-200" },
  dikirim:    { label: "Dikirim",    className: "bg-violet-100 text-violet-800 border border-violet-200" },
  selesai:    { label: "Selesai",    className: "bg-emerald-100 text-emerald-800 border border-emerald-200" },
  dibatalkan: { label: "Dibatalkan", className: "bg-red-100 text-red-800 border border-red-200" },
};

function StatusBadge({
  status,
  map,
}: {
  status: string;
  map: Record<string, { label: string; className: string }>;
}) {
  const s = map[status];
  if (!s)
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border">
        {status}
      </span>
    );
  return (
    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${s.className}`}>
      {s.label}
    </span>
  );
}

function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
      <Icon className="h-10 w-10 opacity-30" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

function DetailRow({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 py-2.5">
      <span className="text-xs text-muted-foreground sm:w-36 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm font-medium flex-1">{children}</span>
    </div>
  );
}

function formatTanggal(str: string) {
  try {
    return format(new Date(str + "T00:00:00"), "EEEE, dd MMMM yyyy", { locale: idLocale });
  } catch {
    return str;
  }
}

function printInvoice(b: BookingRow) {
  const formatRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;
  const tglBooking = format(new Date(b.created_at), "dd MMMM yyyy, HH:mm", { locale: idLocale });
  const tglSesi = formatTanggal(b.tanggal_sesi);
  const paketNama = b.paket_layanan?.nama_paket ?? "—";
  const paketHarga = b.paket_layanan?.harga ?? b.total_harga;

  const statusPembayaranLabel = ({ belum_bayar: "BELUM BAYAR", dp: "DP / UANG MUKA", lunas: "LUNAS" } as Record<string, string>)[b.status_pembayaran] ?? b.status_pembayaran.toUpperCase();
  const statusBookingLabel = ({ menunggu: "MENUNGGU KONFIRMASI", dikonfirmasi: "DIKONFIRMASI", selesai: "SELESAI", dibatalkan: "DIBATALKAN" } as Record<string, string>)[b.status] ?? b.status.toUpperCase();
  const statusColor = ({ belum_bayar: "#f97316", dp: "#0ea5e9", lunas: "#10b981" } as Record<string, string>)[b.status_pembayaran] ?? "#6b7280";
  const bookingColor = ({ menunggu: "#f59e0b", dikonfirmasi: "#3b82f6", selesai: "#10b981", dibatalkan: "#ef4444" } as Record<string, string>)[b.status] ?? "#6b7280";

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Struk Booking ${b.kode_booking}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f3f4f6;color:#111827;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.no-print{text-align:center;padding:16px 20px;background:#1e40af;display:flex;align-items:center;justify-content:center;gap:10px;position:sticky;top:0;z-index:99}
.btn-print{background:white;color:#1e40af;border:none;padding:10px 28px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;transition:opacity .15s}
.btn-print:hover{opacity:.85}
.btn-close{background:transparent;color:rgba(255,255,255,.85);border:1px solid rgba(255,255,255,.35);padding:10px 18px;border-radius:8px;font-size:14px;cursor:pointer;font-family:inherit}
.page{max-width:740px;margin:28px auto 48px;background:white;border-radius:16px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.13)}
.header{background:linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 60%,#2563eb 100%);color:white;padding:30px 36px;display:flex;justify-content:space-between;align-items:flex-start;gap:16px}
.brand-name{font-size:19px;font-weight:700;letter-spacing:-.3px}
.brand-sub{font-size:9px;letter-spacing:2.5px;text-transform:uppercase;opacity:.65;margin-top:3px}
.brand-contact{font-size:11px;opacity:.7;margin-top:14px;line-height:1.9}
.inv-meta{text-align:right;flex-shrink:0}
.inv-label{font-size:9px;letter-spacing:3px;text-transform:uppercase;opacity:.65}
.inv-title{font-size:34px;font-weight:800;letter-spacing:-1.5px;line-height:1}
.inv-kode{font-size:13px;font-family:monospace;font-weight:600;color:#93c5fd;margin-top:5px;letter-spacing:.5px}
.inv-date{font-size:11px;opacity:.6;margin-top:4px}
.status-bar{padding:10px 36px;background:#f8fafc;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.pill{padding:3px 11px;border-radius:999px;font-size:10px;font-weight:700;letter-spacing:.6px;text-transform:uppercase}
.divider{width:1px;height:16px;background:#d1d5db}
.body{padding:28px 36px}
.sec-title{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#9ca3af;margin-bottom:10px}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}
.info-box{background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:14px}
.inf-label{font-size:9px;color:#9ca3af;text-transform:uppercase;letter-spacing:.8px;margin-bottom:2px}
.inf-value{font-size:12.5px;font-weight:500;color:#111827}
.inf-row{margin-bottom:10px}
.inf-row:last-child{margin-bottom:0}
table{width:100%;border-collapse:collapse;margin-bottom:20px}
thead{background:#1e3a8a;color:white}
thead th{padding:9px 13px;text-align:left;font-size:10px;font-weight:600;letter-spacing:.5px;text-transform:uppercase}
thead th:last-child{text-align:right}
tbody tr{border-bottom:1px solid #f3f4f6}
tbody tr:hover{background:#fafafa}
tbody td{padding:11px 13px;font-size:12.5px;vertical-align:top}
tbody td:last-child{text-align:right;font-weight:600;white-space:nowrap}
.desc-sub{font-size:10px;color:#9ca3af;margin-top:2px}
.total-box{background:linear-gradient(135deg,#1e3a8a,#1d4ed8);color:white;border-radius:10px;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;margin-bottom:22px}
.total-label{font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;opacity:.8}
.total-amt{font-size:22px;font-weight:800;letter-spacing:-.5px}
.note-box{border:1.5px dashed #d1d5db;border-radius:10px;padding:12px 14px;font-size:11.5px;color:#6b7280;line-height:1.7;margin-bottom:22px}
.footer{border-top:1px solid #e5e7eb;padding:18px 36px;display:flex;justify-content:space-between;align-items:flex-end;background:#f8fafc}
.foot-l{font-size:10px;color:#9ca3af;line-height:1.8}
.foot-r{text-align:right}
.foot-thanks{font-size:13px;font-weight:700;color:#1e40af}
.foot-sub{font-size:10px;color:#9ca3af;margin-top:2px}
.watermark{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:72px;font-weight:900;text-transform:uppercase;letter-spacing:6px;opacity:.035;pointer-events:none;white-space:nowrap;color:#1e3a8a}
.page-body{position:relative}
@media print{
  body{background:white}
  .no-print{display:none!important}
  .page{margin:0;border-radius:0;box-shadow:none;max-width:100%}
}
</style>
</head>
<body>
<div class="no-print">
  <button class="btn-print" onclick="window.print()">🖨&nbsp; Cetak / Simpan PDF</button>
  <button class="btn-close" onclick="window.close()">Tutup</button>
</div>
<div class="page">
  <div class="header">
    <div>
      <div class="brand-name">AideaCreative</div>
      <div class="brand-sub">Smart Photo Studio</div>
      <div class="brand-contact">
        Jl. A. Yani No. 12, Pringsewu, Lampung<br>
        📞 +62 852-7923-2879<br>
        ✉ aidea.creative@gmail.com
      </div>
    </div>
    <div class="inv-meta">
      <div class="inv-label">Dokumen Resmi</div>
      <div class="inv-title">STRUK</div>
      <div class="inv-kode">${b.kode_booking}</div>
      <div class="inv-date">Diterbitkan: ${tglBooking}</div>
    </div>
  </div>

  <div class="status-bar">
    <span class="pill" style="background:${statusColor}20;color:${statusColor};">${statusPembayaranLabel}</span>
    <div class="divider"></div>
    <span class="pill" style="background:${bookingColor}18;color:${bookingColor};">${statusBookingLabel}</span>
  </div>

  <div class="page-body">
    <div class="watermark">${b.status_pembayaran === "lunas" ? "LUNAS" : b.status_pembayaran === "dp" ? "DP" : ""}</div>
    <div class="body">

      <div class="info-grid">
        <div class="info-box">
          <div class="sec-title">Data Pemesan</div>
          <div class="inf-row"><div class="inf-label">Nama Lengkap</div><div class="inf-value">${b.nama_pemesan}</div></div>
          <div class="inf-row"><div class="inf-label">Email</div><div class="inf-value">${b.email}</div></div>
          <div class="inf-row"><div class="inf-label">No. Telepon / WA</div><div class="inf-value">${b.telepon}</div></div>
        </div>
        <div class="info-box">
          <div class="sec-title">Detail Sesi</div>
          <div class="inf-row"><div class="inf-label">Tanggal Sesi</div><div class="inf-value">${tglSesi}</div></div>
          <div class="inf-row"><div class="inf-label">Jam Sesi</div><div class="inf-value">${b.jam_sesi}</div></div>
          ${b.konsep_foto ? `<div class="inf-row"><div class="inf-label">Konsep Foto</div><div class="inf-value">${b.konsep_foto}</div></div>` : ""}
        </div>
      </div>

      <div class="sec-title">Rincian Pemesanan</div>
      <table>
        <thead>
          <tr>
            <th style="width:36px">#</th>
            <th>Deskripsi Layanan</th>
            <th style="width:60px;text-align:center">Qty</th>
            <th>Harga</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>
              <strong>${paketNama}</strong>
              <div class="desc-sub">Sesi foto · ${tglSesi} · ${b.jam_sesi}</div>
            </td>
            <td style="text-align:center">1x</td>
            <td>${formatRp(paketHarga)}</td>
          </tr>
        </tbody>
      </table>

      <div class="total-box">
        <div class="total-label">Total Pembayaran</div>
        <div class="total-amt">${formatRp(b.total_harga)}</div>
      </div>

      ${b.catatan_pelanggan ? `<div class="note-box"><strong style="color:#374151">Catatan Khusus:</strong> ${b.catatan_pelanggan}</div>` : ""}

    </div>
  </div>

  <div class="footer">
    <div class="foot-l">
      Dokumen ini diterbitkan otomatis oleh sistem AideaCreative.<br>
      Harap simpan struk ini sebagai bukti reservasi Anda.<br>
      Untuk pertanyaan: +62 852-7923-2879
    </div>
    <div class="foot-r">
      <div class="foot-thanks">Terima kasih! 🙏</div>
      <div class="foot-sub">Kami tidak sabar bertemu Anda.</div>
    </div>
  </div>
</div>
</body>
</html>`;

  const w = window.open("", "_blank", "width=840,height=940,scrollbars=yes,resizable=yes");
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}

export default function Profil() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { toast } = useToast();

  const [namaLengkap, setNamaLengkap] = useState("");
  const [noTelepon, setNoTelepon] = useState("");
  const [alamat, setAlamat] = useState("");
  const [fotoProfil, setFotoProfil] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [booking, setBooking] = useState<BookingRow[]>([]);
  const [pesanan, setPesanan] = useState<PesananRow[]>([]);
  const [testimoni, setTestimoni] = useState<TestimoniRow[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(null);
  const [cancelDialog, setCancelDialog] = useState<{ booking: BookingRow; alasan: string } | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!profile) return;
    setNamaLengkap(profile.nama_lengkap ?? "");
    setNoTelepon(profile.no_telepon ?? "");
    setAlamat(profile.alamat ?? "");
    setFotoProfil(profile.foto_profil ?? "");
  }, [profile]);

  useEffect(() => {
    if (!supabase || !user) return;
    setDataLoading(true);
    Promise.all([
      supabase
        .from("booking")
        .select(
          "id,kode_booking,nama_pemesan,email,telepon,tanggal_sesi,jam_sesi,konsep_foto,catatan_pelanggan,status,status_pembayaran,total_harga,created_at,paket_layanan(nama_paket,harga)"
        )
        .eq("pelanggan_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("pesanan_produk")
        .select("id,kode_pesanan,status,total_harga,created_at")
        .eq("pelanggan_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("testimoni")
        .select("id,rating,komentar,is_approved,created_at")
        .eq("pelanggan_id", user.id)
        .order("created_at", { ascending: false }),
    ]).then(([b, p, t]) => {
      if (!b.error) setBooking((b.data ?? []) as BookingRow[]);
      if (!p.error) setPesanan((p.data ?? []) as PesananRow[]);
      if (!t.error) setTestimoni((t.data ?? []) as TestimoniRow[]);
      setDataLoading(false);
    });
  }, [user]);

  const saveProfile = async () => {
    if (!supabase || !user) return;
    setIsSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        nama_lengkap: namaLengkap,
        no_telepon: noTelepon || null,
        alamat: alamat || null,
        foto_profil: fotoProfil || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    setIsSaving(false);
    if (error) {
      toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" });
      return;
    }
    await refreshProfile();
    toast({ title: "Profil tersimpan", description: "Data profil berhasil diperbarui." });
  };

  const uploadAvatar = async (file: File) => {
    if (!supabase || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Ukuran terlalu besar", description: "Maksimal 5MB.", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, cacheControl: "3600", contentType: file.type });
    if (uploadError) {
      setIsUploading(false);
      const msg = /not.found|bucket/i.test(uploadError.message)
        ? "Bucket 'avatars' belum dibuat di Supabase Storage."
        : uploadError.message;
      toast({ title: "Upload gagal", description: msg, variant: "destructive" });
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setFotoProfil(data.publicUrl);
    await supabase
      .from("profiles")
      .update({ foto_profil: data.publicUrl, updated_at: new Date().toISOString() })
      .eq("id", user.id);
    setIsUploading(false);
    await refreshProfile();
    toast({ title: "Foto profil diperbarui" });
  };

  const cancelBooking = async () => {
    if (!cancelDialog || !supabase) return;
    setIsCancelling(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(
        `/api/booking/${cancelDialog.booking.id}/cancel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ alasan: cancelDialog.alasan.trim() || null }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Gagal membatalkan booking");
      }
      const updated = await res.json();
      setBooking((prev) =>
        prev.map((b) =>
          b.id === cancelDialog.booking.id
            ? {
                ...b,
                status: updated.status,
                alasan_pembatalan: updated.alasanPembatalan ?? null,
              }
            : b
        )
      );
      setSelectedBooking((prev) =>
        prev?.id === cancelDialog.booking.id
          ? { ...prev, status: "dibatalkan", alasan_pembatalan: updated.alasanPembatalan ?? null, dibatalkan_oleh: "pelanggan" }
          : prev
      );
      setCancelDialog(null);
      toast({ title: "Booking dibatalkan", description: "Pemesanan Anda telah berhasil dibatalkan." });
    } catch (e: any) {
      toast({ title: "Gagal membatalkan", description: e.message, variant: "destructive" });
    } finally {
      setIsCancelling(false);
    }
  };

  const initials =
    namaLengkap
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "AC";

  const joinDate = user?.created_at
    ? format(new Date(user.created_at), "MMMM yyyy", { locale: idLocale })
    : null;

  const activeBookingCount = booking.filter(
    (b) => b.status === "menunggu" || b.status === "dikonfirmasi"
  ).length;

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto px-4 py-10 max-w-4xl space-y-6">

        {/* ── Account header ── */}
        <Card className="border-border shadow-sm">
          <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="relative shrink-0">
              <Avatar className="h-20 w-20 border-2 border-border">
                <AvatarImage src={fotoProfil} />
                <AvatarFallback className="text-xl font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow hover:bg-primary/90 disabled:opacity-50 transition"
                title="Ganti foto profil"
              >
                {isUploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadAvatar(f);
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <h1 className="text-xl font-bold truncate">{namaLengkap || "—"}</h1>
                {profile?.role === "admin" && (
                  <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                    Admin
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
              {joinDate && (
                <p className="text-xs text-muted-foreground mt-0.5">Bergabung sejak {joinDate}</p>
              )}
            </div>
            <div className="shrink-0">
              <div className="flex gap-6 text-center">
                <div>
                  <p className="text-lg font-bold leading-none">{booking.length}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Booking</p>
                </div>
                <div>
                  <p className="text-lg font-bold leading-none">{pesanan.length}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Pesanan</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Main tabs ── */}
        <Tabs defaultValue="booking" className="w-full">
          <TabsList className="w-full grid grid-cols-4 h-auto">
            <TabsTrigger value="profil" className="gap-1.5 py-2.5 text-xs sm:text-sm">
              <User className="h-3.5 w-3.5" />
              <span>Profil</span>
            </TabsTrigger>
            <TabsTrigger value="booking" className="gap-1.5 py-2.5 text-xs sm:text-sm">
              <CalendarCheck className="h-3.5 w-3.5" />
              <span>Booking</span>
              {activeBookingCount > 0 && (
                <span className="ml-0.5 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                  {activeBookingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="pesanan" className="gap-1.5 py-2.5 text-xs sm:text-sm">
              <ClipboardList className="h-3.5 w-3.5" />
              <span>Pesanan</span>
            </TabsTrigger>
            <TabsTrigger value="testimoni" className="gap-1.5 py-2.5 text-xs sm:text-sm">
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Testimoni</span>
              <span className="sm:hidden">Review</span>
            </TabsTrigger>
          </TabsList>

          {/* ── Profil tab ── */}
          <TabsContent value="profil" className="mt-4">
            <Card>
              <CardContent className="p-6 space-y-5">
                <h2 className="font-semibold text-base">Data Diri</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="namaLengkap">Nama Lengkap</Label>
                    <Input
                      id="namaLengkap"
                      value={namaLengkap}
                      onChange={(e) => setNamaLengkap(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="noTelepon">No Telepon / WhatsApp</Label>
                    <Input
                      id="noTelepon"
                      value={noTelepon}
                      onChange={(e) => setNoTelepon(e.target.value)}
                      placeholder="08xxxxxxxxxx"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="alamat">Alamat</Label>
                    <Textarea
                      id="alamat"
                      value={alamat}
                      onChange={(e) => setAlamat(e.target.value)}
                      className="resize-none"
                      rows={3}
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={saveProfile} disabled={isSaving}>
                    {isSaving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Simpan Perubahan
                  </Button>
                </div>

                <Separator />

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="font-medium text-sm">Keluar dari Akun</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Sesi di perangkat ini akan diakhiri.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      setIsSigningOut(true);
                      try {
                        await signOut();
                      } finally {
                        setIsSigningOut(false);
                      }
                    }}
                    disabled={isSigningOut}
                    className="border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground self-start sm:self-auto"
                  >
                    {isSigningOut ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="mr-2 h-4 w-4" />
                    )}
                    Keluar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Booking tab ── */}
          <TabsContent value="booking" className="mt-4">
            <Card>
              <CardContent className="p-0">
                {dataLoading ? (
                  <div className="py-16 flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : booking.length === 0 ? (
                  <EmptyState
                    icon={CalendarCheck}
                    text="Belum ada booking. Yuk buat booking pertamamu!"
                  />
                ) : (
                  <ul className="divide-y divide-border">
                    {booking.map((item) => (
                      <li key={item.id}>
                        <button
                          onClick={() => setSelectedBooking(item)}
                          className="w-full text-left p-5 flex items-center gap-3 hover:bg-muted/50 transition-colors group"
                        >
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm font-mono">
                                {item.kode_booking}
                              </span>
                              <StatusBadge status={item.status} map={STATUS_BOOKING} />
                              <StatusBadge status={item.status_pembayaran} map={STATUS_BAYAR} />
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {formatTanggal(item.tanggal_sesi)} · {item.jam_sesi}
                            </p>
                            {item.paket_layanan && (
                              <p className="text-xs text-muted-foreground truncate max-w-sm">
                                {item.paket_layanan.nama_paket}
                              </p>
                            )}
                          </div>
                          <div className="shrink-0 text-right flex items-center gap-2">
                            <p className="font-bold text-base">
                              Rp {item.total_harga.toLocaleString("id-ID")}
                            </p>
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Pesanan tab ── */}
          <TabsContent value="pesanan" className="mt-4">
            <Card>
              <CardContent className="p-0">
                {dataLoading ? (
                  <div className="py-16 flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : pesanan.length === 0 ? (
                  <EmptyState icon={ClipboardList} text="Belum ada pesanan produk." />
                ) : (
                  <ul className="divide-y divide-border">
                    {pesanan.map((item) => (
                      <li
                        key={item.id}
                        className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm font-mono">
                              {item.kode_pesanan}
                            </span>
                            <StatusBadge status={item.status} map={STATUS_PESANAN} />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(item.created_at), "dd MMMM yyyy", {
                              locale: idLocale,
                            })}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-bold text-base">
                            Rp {item.total_harga.toLocaleString("id-ID")}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Testimoni tab ── */}
          <TabsContent value="testimoni" className="mt-4">
            <Card>
              <CardContent className="p-0">
                {dataLoading ? (
                  <div className="py-16 flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : testimoni.length === 0 ? (
                  <EmptyState icon={MessageSquare} text="Belum ada testimoni yang dikirim." />
                ) : (
                  <ul className="divide-y divide-border">
                    {testimoni.map((item) => (
                      <li key={item.id} className="p-5 space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < item.rating
                                    ? "text-amber-400 fill-amber-400"
                                    : "text-muted-foreground/30"
                                }`}
                              />
                            ))}
                            <span className="ml-1 text-sm font-medium">{item.rating}/5</span>
                          </div>
                          <Badge
                            variant={item.is_approved ? "default" : "outline"}
                            className="text-xs"
                          >
                            {item.is_approved ? "Ditampilkan" : "Menunggu Review"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          "{item.komentar}"
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(item.created_at), "dd MMMM yyyy", { locale: idLocale })}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Booking Detail Dialog ── */}
      <Dialog open={!!selectedBooking} onOpenChange={(open) => !open && setSelectedBooking(null)}>
        <DialogContent className="w-[calc(100%-2rem)] sm:w-full max-w-md rounded-xl max-h-[85vh] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {selectedBooking && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <CalendarCheck className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <DialogTitle className="font-mono text-base">
                      {selectedBooking.kode_booking}
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Dibuat{" "}
                      {format(new Date(selectedBooking.created_at), "dd MMM yyyy · HH:mm", {
                        locale: idLocale,
                      })}
                    </p>
                  </div>
                </div>
              </DialogHeader>

              {/* Status row */}
              <div className="flex gap-2 flex-wrap -mt-1">
                <StatusBadge status={selectedBooking.status} map={STATUS_BOOKING} />
                <StatusBadge status={selectedBooking.status_pembayaran} map={STATUS_BAYAR} />
              </div>

              <Separator />

              {/* Jadwal */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Jadwal Sesi
                </p>
                <div className="divide-y divide-border rounded-lg border">
                  <DetailRow label={<><CalendarDays className="inline h-3.5 w-3.5 mr-1" />Tanggal</>}>
                    {formatTanggal(selectedBooking.tanggal_sesi)}
                  </DetailRow>
                  <DetailRow label={<><Clock className="inline h-3.5 w-3.5 mr-1" />Jam</>}>
                    {selectedBooking.jam_sesi}
                  </DetailRow>
                </div>
              </div>

              {/* Paket */}
              {selectedBooking.paket_layanan && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Paket
                  </p>
                  <div className="divide-y divide-border rounded-lg border">
                    <DetailRow label="Nama Paket">
                      {selectedBooking.paket_layanan.nama_paket}
                    </DetailRow>
                    <DetailRow label="Harga Paket">
                      Rp {selectedBooking.paket_layanan.harga.toLocaleString("id-ID")}
                    </DetailRow>
                  </div>
                </div>
              )}

              {/* Pemesan */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Data Pemesan
                </p>
                <div className="divide-y divide-border rounded-lg border">
                  <DetailRow label={<><User className="inline h-3.5 w-3.5 mr-1" />Nama</>}>
                    {selectedBooking.nama_pemesan}
                  </DetailRow>
                  <DetailRow label={<><Phone className="inline h-3.5 w-3.5 mr-1" />Telepon</>}>
                    {selectedBooking.telepon}
                  </DetailRow>
                  {selectedBooking.konsep_foto && (
                    <DetailRow label="Konsep Foto">
                      {selectedBooking.konsep_foto}
                    </DetailRow>
                  )}
                  {selectedBooking.catatan_pelanggan && (
                    <DetailRow label="Catatan">
                      <span className="italic text-muted-foreground">
                        {selectedBooking.catatan_pelanggan}
                      </span>
                    </DetailRow>
                  )}
                </div>
              </div>

              {/* Pembayaran */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Pembayaran
                </p>
                <div className="divide-y divide-border rounded-lg border">
                  <DetailRow label={<><Wallet className="inline h-3.5 w-3.5 mr-1" />Status</>}>
                    <StatusBadge status={selectedBooking.status_pembayaran} map={STATUS_BAYAR} />
                  </DetailRow>
                  <DetailRow label={<><CreditCard className="inline h-3.5 w-3.5 mr-1" />Total</>}>
                    <span className="font-bold text-base">
                      Rp {selectedBooking.total_harga.toLocaleString("id-ID")}
                    </span>
                  </DetailRow>
                </div>
              </div>

              {selectedBooking.status === "dibatalkan" && (
                <div className={`rounded-lg border px-4 py-3 flex gap-2.5 ${
                  selectedBooking.dibatalkan_oleh === "pelanggan"
                    ? "border-orange-200 bg-orange-50"
                    : "border-red-200 bg-red-50"
                }`}>
                  <AlertTriangle className={`h-4 w-4 shrink-0 mt-0.5 ${
                    selectedBooking.dibatalkan_oleh === "pelanggan" ? "text-orange-500" : "text-red-500"
                  }`} />
                  <div className="space-y-0.5">
                    <p className={`text-xs font-semibold ${
                      selectedBooking.dibatalkan_oleh === "pelanggan" ? "text-orange-700" : "text-red-700"
                    }`}>
                      {selectedBooking.dibatalkan_oleh === "pelanggan"
                        ? "Dibatalkan oleh Anda"
                        : "Dibatalkan oleh Studio"}
                    </p>
                    <p className={`text-sm ${
                      selectedBooking.dibatalkan_oleh === "pelanggan" ? "text-orange-700" : "text-red-700"
                    }`}>
                      {selectedBooking.alasan_pembatalan || <span className="italic opacity-60">Tidak ada alasan yang diberikan</span>}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-1">
                <Button
                  className="w-full gap-2"
                  onClick={() => printInvoice(selectedBooking)}
                >
                  <Printer className="h-4 w-4" />
                  Cetak / Unduh Struk
                </Button>
                {(selectedBooking.status === "menunggu" || selectedBooking.status === "dikonfirmasi") && (
                  <Button
                    variant="outline"
                    className="w-full gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                    onClick={() => setCancelDialog({ booking: selectedBooking, alasan: "" })}
                  >
                    <Ban className="h-4 w-4" />
                    Batalkan Booking
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setSelectedBooking(null)}
                >
                  Tutup
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Cancel Booking Dialog ── */}
      <Dialog open={!!cancelDialog} onOpenChange={(open) => !open && setCancelDialog(null)}>
        <DialogContent className="w-[calc(100%-2rem)] sm:w-full max-w-md rounded-xl">
          {cancelDialog && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <Ban className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <DialogTitle>Batalkan Booking?</DialogTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {cancelDialog.booking.kode_booking}
                    </p>
                  </div>
                </div>
              </DialogHeader>

              <p className="text-sm text-muted-foreground -mt-1">
                Tindakan ini tidak dapat dibatalkan. Booking yang sudah dibatalkan tidak bisa diaktifkan kembali.
              </p>

              <div className="space-y-1.5">
                <Label htmlFor="alasanBatal" className="text-sm">
                  Alasan Pembatalan <span className="text-muted-foreground font-normal">(opsional)</span>
                </Label>
                <Textarea
                  id="alasanBatal"
                  placeholder="Contoh: Jadwal berubah, ada keperluan mendadak, dll."
                  className="resize-none"
                  rows={3}
                  value={cancelDialog.alasan}
                  onChange={(e) =>
                    setCancelDialog((prev) => prev ? { ...prev, alasan: e.target.value } : prev)
                  }
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setCancelDialog(null)}
                  disabled={isCancelling}
                >
                  Batal
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 gap-2"
                  onClick={cancelBooking}
                  disabled={isCancelling}
                >
                  {isCancelling ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Ban className="h-4 w-4" />
                  )}
                  Ya, Batalkan
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
