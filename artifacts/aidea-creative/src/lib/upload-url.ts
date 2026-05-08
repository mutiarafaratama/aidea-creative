/**
 * Normalisasi URL gambar yang tersimpan di database.
 *
 * Masalah: URL disimpan dengan hostname penuh (misalnya
 * https://xxx.replit.dev/uploads/...) yang bisa berubah setelah restart
 * atau akses dari subdomain berbeda. Vite dev server juga tidak
 * langsung mem-proxy /uploads ke Express.
 *
 * Solusi: Ubah URL absolut yang mengandung /uploads/ menjadi
 * path relatif /uploads/... sehingga selalu di-proxy dengan benar
 * oleh Vite → Express:8099.
 */
export function resolveUploadUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  // Sudah relative path — tidak perlu diubah
  if (url.startsWith("/uploads/") || url.startsWith("./uploads/")) {
    return url.startsWith(".") ? url.slice(1) : url;
  }

  // Data URI (base64) — biarkan apa adanya
  if (url.startsWith("data:")) return url;

  // URL absolut — cek apakah mengandung /uploads/
  try {
    const parsed = new URL(url);
    const idx = parsed.pathname.indexOf("/uploads/");
    if (idx !== -1) {
      return parsed.pathname.slice(idx); // → /uploads/...
    }
  } catch {
    // Bukan URL valid, kembalikan apa adanya
  }

  return url;
}
