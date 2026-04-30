import { useRef, useState } from "react";
import { Upload, Loader2, X, ImagePlus, Move } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { adminFetch } from "@/lib/admin-api";

type Props = {
  value: string[];
  onChange: (urls: string[]) => void;
  folder?: string;
  bucket?: string;
  label?: string;
  max?: number;
  className?: string;
};

const MAX_BYTES = 20 * 1024 * 1024;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Gagal membaca file"));
    reader.readAsDataURL(file);
  });
}

async function destroyRemote(url: string) {
  if (!url) return;
  // Only attempt destroy for Supabase Storage URLs we own.
  if (!/\/storage\/v1\/object\/public\//.test(url)) return;
  try {
    await adminFetch("/upload/supabase/destroy", {
      method: "POST",
      body: JSON.stringify({ url }),
    });
  } catch {
    // best-effort; orphan asset is acceptable on failure
  }
}

export function SupabaseMultiUploader({
  value,
  onChange,
  folder = "produk",
  bucket = "produk",
  label = "Foto Produk",
  max = 8,
  className = "",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragIdx = useRef<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const { toast } = useToast();

  const safeValue = Array.isArray(value) ? value.filter(Boolean) : [];

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remainingSlots = Math.max(0, max - safeValue.length);
    const list = Array.from(files).slice(0, remainingSlots);
    if (list.length === 0) {
      toast({ title: `Maksimal ${max} foto`, variant: "destructive" });
      return;
    }
    if (list.length < files.length) {
      toast({ title: `Hanya ${list.length} foto pertama yang diupload (limit ${max}).` });
    }

    setUploading(true);
    setProgress({ done: 0, total: list.length });
    const uploaded: string[] = [];
    let failed = 0;

    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      try {
        if (!file.type.startsWith("image/")) {
          throw new Error(`${file.name}: bukan gambar`);
        }
        if (file.size > MAX_BYTES) {
          throw new Error(`${file.name}: lebih dari 20MB`);
        }
        const dataBase64 = await fileToBase64(file);
        const result = await adminFetch<{ url: string; path: string }>(
          "/upload/supabase",
          {
            method: "POST",
            body: JSON.stringify({
              bucket,
              folder,
              filename: file.name,
              contentType: file.type,
              dataBase64,
            }),
          },
        );
        if (result?.url) uploaded.push(result.url);
      } catch (err: any) {
        failed++;
        toast({
          title: "Upload gagal",
          description: err?.message ?? file.name,
          variant: "destructive",
        });
      } finally {
        setProgress((p) => ({ done: p.done + 1, total: p.total }));
      }
    }

    if (uploaded.length > 0) {
      onChange([...safeValue, ...uploaded]);
      toast({
        title:
          failed === 0
            ? `${uploaded.length} foto berhasil diupload`
            : `${uploaded.length} berhasil, ${failed} gagal`,
      });
    }
    setUploading(false);
    setProgress({ done: 0, total: 0 });
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeAt = (idx: number) => {
    const target = safeValue[idx];
    const next = safeValue.filter((_, i) => i !== idx);
    onChange(next);
    destroyRemote(target);
  };

  const onDragStart = (idx: number) => () => {
    dragIdx.current = idx;
  };
  const onDragOver = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === idx) return;
    const next = [...safeValue];
    const [moved] = next.splice(dragIdx.current, 1);
    next.splice(idx, 0, moved);
    dragIdx.current = idx;
    onChange(next);
  };
  const onDragEnd = () => {
    dragIdx.current = null;
  };

  const canAddMore = safeValue.length < max;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          {label} <span className="text-muted-foreground font-normal">({safeValue.length}/{max})</span>
        </p>
        {safeValue.length > 1 && (
          <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
            <Move className="h-3 w-3" /> Geser untuk urutkan
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {safeValue.map((url, idx) => (
          <div
            key={`${url}-${idx}`}
            draggable
            onDragStart={onDragStart(idx)}
            onDragOver={onDragOver(idx)}
            onDragEnd={onDragEnd}
            className="relative aspect-square rounded-lg overflow-hidden border bg-muted group cursor-move"
          >
            <img src={url} alt={`foto-${idx + 1}`} className="w-full h-full object-cover" />
            {idx === 0 && (
              <span className="absolute top-1 left-1 text-[10px] px-1.5 py-0.5 rounded bg-primary text-primary-foreground">
                Utama
              </span>
            )}
            <button
              type="button"
              onClick={() => removeAt(idx)}
              disabled={uploading}
              className="absolute top-1 right-1 rounded-full bg-black/60 text-white p-1 opacity-0 group-hover:opacity-100 transition disabled:opacity-30"
              aria-label="Hapus foto"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {canAddMore && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:bg-muted/40 transition disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mb-1" />
                <span className="text-[11px]">
                  {progress.done}/{progress.total}
                </span>
              </>
            ) : (
              <>
                <ImagePlus className="h-5 w-5 mb-1" />
                <span className="text-[11px]">Tambah</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>PNG/JPG/WebP/GIF, maks. 20MB per foto.</span>
        {canAddMore && !uploading && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => inputRef.current?.click()}
            className="h-7 px-2"
          >
            <Upload className="h-3.5 w-3.5 mr-1" /> Pilih file
          </Button>
        )}
      </div>
    </div>
  );
}
