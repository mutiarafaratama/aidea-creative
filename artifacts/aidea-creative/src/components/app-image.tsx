/**
 * AppImage — pengganti <img> yang otomatis:
 * 1. Normalisasi URL absolute /uploads/ menjadi relative path
 *    (supaya Vite proxy → Express bisa serve dengan benar)
 * 2. Fallback graceful ketika gambar gagal dimuat
 */
import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { resolveUploadUrl } from "@/lib/upload-url";

type AppImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  fallbackClassName?: string;
};

export function AppImage({ src, alt, className, fallbackClassName, ...rest }: AppImageProps) {
  const [broken, setBroken] = useState(false);
  const resolved = resolveUploadUrl(src as string);

  if (broken || !resolved) {
    return (
      <div
        className={
          fallbackClassName ??
          `${className ?? ""} flex items-center justify-center bg-muted text-muted-foreground`
        }
      >
        <ImageIcon size={24} className="opacity-30" />
      </div>
    );
  }

  return (
    <img
      {...rest}
      src={resolved}
      alt={alt}
      className={className}
      onError={() => setBroken(true)}
    />
  );
}
