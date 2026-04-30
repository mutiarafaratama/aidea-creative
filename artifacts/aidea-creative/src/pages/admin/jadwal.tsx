import { useEffect, useState } from "react";
import { Save, Loader2, Clock, Calendar as CalendarIcon } from "lucide-react";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { adminFetch } from "@/lib/admin-api";

type DayRule = {
  isBuka: boolean;
  jamBuka: string;
  jamTutup: string;
  slotMenit: number;
};

type Rules = Record<string, DayRule>;

type AturanResponse = {
  rules: Rules;
  hariLabel: string[];
};

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const FALLBACK_LABELS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

function timeToMinutes(t: string): number {
  const [h, m] = (t || "00:00").split(":").map((n) => Number(n));
  return (h || 0) * 60 + (m || 0);
}

function previewSlots(rule: DayRule): string[] {
  if (!rule.isBuka) return [];
  const start = timeToMinutes(rule.jamBuka);
  const end = timeToMinutes(rule.jamTutup);
  const dur = Math.max(15, rule.slotMenit || 120);
  if (end <= start) return [];
  const out: string[] = [];
  for (let t = start; t + dur <= end; t += dur) {
    const h1 = String(Math.floor(t / 60)).padStart(2, "0");
    const m1 = String(t % 60).padStart(2, "0");
    const h2 = String(Math.floor((t + dur) / 60)).padStart(2, "0");
    const m2 = String((t + dur) % 60).padStart(2, "0");
    out.push(`${h1}:${m1}–${h2}:${m2}`);
  }
  return out;
}

const PRESETS: { label: string; description: string; build: () => Rules }[] = [
  {
    label: "Sen–Kam reguler · Jum–Min extended",
    description: "Sen–Kam 09–17 · Jum–Min 09–20, slot 2 jam.",
    build: () => {
      const r: Rules = {} as any;
      for (let i = 0; i < 7; i++) {
        const weekend = i === 0 || i === 5 || i === 6;
        r[String(i)] = {
          isBuka: true,
          jamBuka: "09:00",
          jamTutup: weekend ? "20:00" : "17:00",
          slotMenit: 120,
        };
      }
      return r;
    },
  },
  {
    label: "Tutup hari Minggu",
    description: "Sen–Sab buka 09–18, Minggu tutup, slot 90 menit.",
    build: () => {
      const r: Rules = {} as any;
      for (let i = 0; i < 7; i++) {
        r[String(i)] = {
          isBuka: i !== 0,
          jamBuka: "09:00",
          jamTutup: "18:00",
          slotMenit: 90,
        };
      }
      return r;
    },
  },
  {
    label: "Akhir pekan saja",
    description: "Hanya Jum, Sab, Min — 09–20, slot 2 jam.",
    build: () => {
      const r: Rules = {} as any;
      for (let i = 0; i < 7; i++) {
        r[String(i)] = {
          isBuka: i === 0 || i === 5 || i === 6,
          jamBuka: "09:00",
          jamTutup: "20:00",
          slotMenit: 120,
        };
      }
      return r;
    },
  },
];

export default function AdminJadwal() {
  const { toast } = useToast();
  const [labels, setLabels] = useState<string[]>(FALLBACK_LABELS);
  const [rules, setRules] = useState<Rules | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/jadwal/aturan`);
      const data: AturanResponse = await res.json();
      setRules(data.rules ?? null);
      if (Array.isArray(data.hariLabel) && data.hariLabel.length === 7) setLabels(data.hariLabel);
    } catch (err: any) {
      toast({ title: "Gagal memuat aturan", description: err?.message, variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const update = (i: number, patch: Partial<DayRule>) => {
    setRules((cur) => {
      if (!cur) return cur;
      const key = String(i);
      return { ...cur, [key]: { ...cur[key], ...patch } };
    });
  };

  const applyPreset = (build: () => Rules) => {
    setRules(build());
    toast({ title: "Preset diterapkan", description: "Klik 'Simpan' untuk mengaktifkan." });
  };

  const save = async () => {
    if (!rules) return;
    setSaving(true);
    try {
      await adminFetch("/admin/jadwal/aturan", {
        method: "PUT",
        body: JSON.stringify({ rules }),
      });
      toast({ title: "Jadwal disimpan", description: "Slot pelanggan langsung mengikuti aturan baru." });
    } catch (err: any) {
      toast({ title: "Gagal menyimpan", description: err?.message, variant: "destructive" });
    }
    setSaving(false);
  };

  if (loading || !rules) {
    return (
      <AdminLayout title="Jadwal Studio" subtitle="Atur jam buka per hari dalam seminggu.">
        <Skeleton className="h-96 w-full" />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Jadwal Studio"
      subtitle="Atur jam buka per hari dalam seminggu — slot booking pelanggan otomatis menyesuaikan."
    >
      <div className="space-y-6 max-w-4xl">
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-primary" /> Preset cepat
            </CardTitle>
            <CardDescription>Pilih salah satu untuk memulai, lalu sesuaikan per hari.</CardDescription>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-3 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p.build)}
                className="text-left rounded-lg border border-border p-3 hover:border-primary/50 hover:bg-muted/40 transition"
              >
                <div className="font-medium text-sm">{p.label}</div>
                <div className="text-xs text-muted-foreground mt-1">{p.description}</div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Aturan per Hari</CardTitle>
            <CardDescription>Atur jam buka, jam tutup, dan durasi tiap sesi (menit).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 7 }).map((_, i) => {
              const key = String(i);
              const r = rules[key];
              if (!r) return null;
              const slots = previewSlots(r);
              return (
                <div
                  key={i}
                  className={`rounded-lg border p-4 transition ${r.isBuka ? "border-border bg-card" : "border-border bg-muted/30"}`}
                >
                  <div className="flex flex-wrap items-center gap-3 justify-between">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={r.isBuka}
                        onCheckedChange={(v) => update(i, { isBuka: v })}
                        aria-label={`Aktifkan ${labels[i]}`}
                      />
                      <div>
                        <div className="font-semibold">{labels[i]}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.isBuka ? `${slots.length} slot tersedia` : "Tutup"}
                        </div>
                      </div>
                    </div>
                    {!r.isBuka && (
                      <Badge variant="outline" className="text-muted-foreground">
                        Tidak menerima booking
                      </Badge>
                    )}
                  </div>

                  {r.isBuka && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                        <div>
                          <Label className="text-xs">Jam Buka</Label>
                          <Input
                            type="time"
                            value={r.jamBuka}
                            onChange={(e) => update(i, { jamBuka: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Jam Tutup</Label>
                          <Input
                            type="time"
                            value={r.jamTutup}
                            onChange={(e) => update(i, { jamTutup: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Durasi Slot (menit)</Label>
                          <Input
                            type="number"
                            min={15}
                            step={15}
                            value={r.slotMenit}
                            onChange={(e) => update(i, { slotMenit: Number(e.target.value) || 120 })}
                          />
                        </div>
                      </div>
                      {slots.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {slots.map((s) => (
                            <span
                              key={s}
                              className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-border bg-muted/50 text-muted-foreground"
                            >
                              <Clock className="h-3 w-3" /> {s}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 text-xs text-destructive">
                          Jam tutup harus lebih besar dari jam buka.
                        </p>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="flex justify-end sticky bottom-4">
          <Button onClick={save} disabled={saving} size="lg" className="shadow-lg">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Simpan Jadwal
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
