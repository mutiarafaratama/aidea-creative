import { useState, useRef } from "react";
import { Upload, Loader2, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { adminFetch } from "@/lib/admin-api";

type Props = {
  value?: string | null;
  onChange: (url: string) => void;
  folder?: string;
  className?: string;
  label?: string;
};

async function destroyPrevious(url: string | null | undefined) {
  if (!url) return;
  if (!/cloudinary\.com/i.test(url)) return;
  try {
    await adminFetch("/upload/cloudinary/destroy", {
      method: "POST",
      body: JSON.stringify({ url }),
    });
  } catch {
    // best-effort; don't block UI
  }
}

export function CloudinaryUploader({ value, onChange, folder = "aidea", className = "", label = "Gambar" }: Props) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "File harus berupa gambar", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Maksimal 10MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const sig = await adminFetch<{ signature: string; timestamp: number; apiKey: string; cloudName: string; folder: string }>(
        `/upload/cloudinary/sign?folder=${encodeURIComponent(folder)}`
      );
      const fd = new FormData();
      fd.append("file", file);
      fd.append("api_key", sig.apiKey);
      fd.append("timestamp", String(sig.timestamp));
      fd.append("signature", sig.signature);
      fd.append("folder", sig.folder);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error("Upload gagal: " + (await res.text()));
      const data = await res.json();
      const previous = value;
      onChange(data.secure_url);
      // Remove the prior asset from Cloudinary so we don't accumulate orphans.
      destroyPrevious(previous);
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
    destroyPrevious(previous);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <p className="text-sm font-medium">{label}</p>}
      <div className="flex gap-3 items-start">
        <div className="h-24 w-24 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden shrink-0">
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
              accept="image/*"
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
          <p className="text-xs text-muted-foreground">PNG/JPG/WebP, maks. 10MB. File akan disimpan di Cloudinary.</p>
        </div>
      </div>
    </div>
  );
}
