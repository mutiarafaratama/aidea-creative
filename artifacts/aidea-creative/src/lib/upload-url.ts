/**
 * Normalisasi URL gambar yang tersimpan di database.
 *
 * - Supabase Storage URL (*.supabase.co/storage/...) → kembalikan apa adanya
 * - URL /uploads/ lama (local filesystem) → ubah jadi relative path
 * - Data URI (base64) → kembalikan apa adanya
 * - URL absolut lain → kembalikan apa adanya
 */
export function resolveUploadUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  // Data URI (base64) — biarkan apa adanya
  if (url.startsWith("data:")) return url;

  // Supabase Storage URL — sudah absolute, langsung pakai
  if (url.includes(".supabase.co/storage/")) return url;

  // Sudah relative path /uploads/ — tidak perlu diubah
  if (url.startsWith("/uploads/") || url.startsWith("./uploads/")) {
    return url.startsWith(".") ? url.slice(1) : url;
  }

  // URL absolut yang mengandung /uploads/ (legacy local) → jadikan relative
  try {
    const parsed = new URL(url);
    const idx = parsed.pathname.indexOf("/uploads/");
    if (idx !== -1) {
      return parsed.pathname.slice(idx);
    }
  } catch {
    // Bukan URL valid, kembalikan apa adanya
  }

  return url;
}
