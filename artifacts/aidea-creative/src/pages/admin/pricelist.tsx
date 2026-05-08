import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Loader2, ImageOff } from "lucide-react";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SupabaseUploader } from "@/components/supabase-uploader";
import { adminFetch } from "@/lib/admin-api";
import { useToast } from "@/hooks/use-toast";

const KATEGORI_OPTIONS = [
  { value: "Photobox", label: "Photobox" },
  { value: "SelfPhoto", label: "Self Photo" },
  { value: "PhotoStudio", label: "Photo Studio" },
];

const KATEGORI_LABELS: Record<string, string> = {
  Photobox: "Photobox",
  SelfPhoto: "Self Photo",
  PhotoStudio: "Photo Studio",
};

type PricelistItem = {
  id: string;
  kategori: string;
  gambarUrl: string;
  urutan: number;
  createdAt: string;
};

function usePricelist() {
  return useQuery<PricelistItem[]>({
    queryKey: ["admin-pricelist"],
    queryFn: async () => {
      const res = await adminFetch<PricelistItem[]>("/pricelist");
      return Array.isArray(res) ? res : [];
    },
  });
}

export default function AdminPricelist() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = usePricelist();

  const [activeTab, setActiveTab] = useState<string>("Photobox");
  const [open, setOpen] = useState(false);
  const [formKategori, setFormKategori] = useState("Photobox");
  const [formUrl, setFormUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const allItems: PricelistItem[] = Array.isArray(data) ? data : [];

  const groupedItems = (() => {
    const map: Record<string, PricelistItem[]> = {};
    for (const item of allItems) {
      if (!map[item.kategori]) map[item.kategori] = [];
      map[item.kategori].push(item);
    }
    return map;
  })();

  const tabs = KATEGORI_OPTIONS.map((o) => ({
    ...o,
    count: (groupedItems[o.value] ?? []).length,
  }));

  const currentItems = groupedItems[activeTab] ?? [];

  const openAdd = () => {
    setFormKategori(activeTab);
    setFormUrl("");
    setOpen(true);
  };

  const save = async () => {
    if (!formUrl) {
      toast({ title: "Upload gambar terlebih dahulu", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await adminFetch("/pricelist", {
        method: "POST",
        body: JSON.stringify({
          kategori: formKategori,
          gambarUrl: formUrl,
          urutan: (groupedItems[formKategori] ?? []).length,
        }),
      });
      toast({ title: "Gambar pricelist ditambahkan" });
      qc.invalidateQueries({ queryKey: ["admin-pricelist"] });
      qc.invalidateQueries({ queryKey: ["pricelist"] });
      setOpen(false);
      setFormUrl("");
    } catch {
      toast({ title: "Gagal menyimpan", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: PricelistItem) => {
    if (!confirm(`Hapus gambar pricelist ini?`)) return;
    setDeletingId(item.id);
    try {
      await adminFetch(`/pricelist/${item.id}`, { method: "DELETE" });
      adminFetch("/upload/supabase/destroy", {
        method: "POST",
        body: JSON.stringify({ url: item.gambarUrl }),
      }).catch(() => {});
      toast({ title: "Gambar dihapus" });
      qc.invalidateQueries({ queryKey: ["admin-pricelist"] });
      qc.invalidateQueries({ queryKey: ["pricelist"] });
    } catch {
      toast({ title: "Gagal menghapus", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AdminLayout
      title="Pricelist"
      subtitle="Kelola gambar pricelist per kategori layanan."
    >
      {/* Category tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-border pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === tab.value
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                activeTab === tab.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
        <div className="ml-auto">
          <Button size="sm" onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Gambar
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="aspect-[3/4] rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : currentItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-border rounded-2xl text-center gap-3">
          <ImageOff className="h-10 w-10 text-muted-foreground/30" />
          <div>
            <p className="font-medium text-sm">Belum ada gambar pricelist</p>
            <p className="text-xs text-muted-foreground mt-1">
              Klik "Tambah Gambar" untuk mengunggah pricelist {KATEGORI_LABELS[activeTab] ?? activeTab}.
            </p>
          </div>
          <Button size="sm" onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" /> Tambah Gambar
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentItems.map((item, i) => (
            <div key={item.id} className="group relative rounded-xl overflow-hidden border border-border bg-muted aspect-[3/4]">
              <img
                src={item.gambarUrl}
                alt={`${activeTab} ${i + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 left-2 bg-black/50 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                #{i + 1}
              </div>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="icon"
                  variant="destructive"
                  className="h-8 w-8"
                  onClick={() => remove(item)}
                  disabled={deletingId === item.id}
                >
                  {deletingId === item.id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Trash2 className="h-3.5 w-3.5" />
                  }
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Gambar Pricelist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Kategori</Label>
              <Select value={formKategori} onValueChange={setFormKategori}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KATEGORI_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <SupabaseUploader
              bucket="pricelist"
              label="Gambar Pricelist"
              value={formUrl}
              onChange={setFormUrl}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={save} disabled={saving || !formUrl}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
