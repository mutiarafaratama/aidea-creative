import { useRef, useState } from "react";
import { Upload, Loader2, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { adminFetch } from "@/lib/admin-api";

type Props = {
  value?: string | null;
  onChange: (url: string) => void;
  bucket: string;
  folder?: string;
  className?: string;
  label?: string;
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

async function destroyPrevious(url: string | null | undefined, bucket: string) {
  if (!url) return;
  if (!/\/storage\/v1\/object\/public\//.test(url)) return;
  try {
    await adminFetch("/upload/supabase/destroy", {
      method: "POST",
      body: JSON.stringify({ url, bucket }),
    });
  } catch {
    // best-effort
  }
}

export function SupabaseUploader({
  value,
  onChange,
  bucket,
  folder = "",
  className = "",
  label = "Gambar",
}: Props) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "File harus berupa gambar", variant: "destructive" });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast({ title: "Maksimal 20MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
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
      if (!result?.url) throw new Error("Upload gagal");
      const previous = value;
      onChange(result.url);
      destroyPrevious(previous, bucket);
      toast({ title: "Gambar berhasil diunggah" });
    } catch (err: any) {
      toast({ title: "Upload gagal", description: err?.message ?? "Coba lagi.", variant: "destructive" });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = () => {
    const previous = value;
    onChange("");
    destroyPrevious(previous, bucket);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <p className="text-sm font-medium">{label}</p>}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-start">
        <div className="h-28 w-28 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden shrink-0 mx-auto sm:mx-0">
          {value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
          )}
        </div>
        <div className="flex-1 space-y-2 min-w-0">
          <div className="flex gap-2 flex-wrap">
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
              {uploading ? "Mengunggah..." : value ? "Ganti gambar" : "Unggah gambar"}
            </Button>
            {value && (
              <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={handleRemove} disabled={uploading}>
                <X className="h-4 w-4 mr-1" /> Hapus
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">PNG/JPG/WebP/GIF, maks. 20MB. Tersimpan di Supabase Storage (bucket: {bucket}).</p>
        </div>
      </div>
    </div>
  );
}
