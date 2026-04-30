import { Router, json, type Request, type Response } from "express";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin: SupabaseClient | null =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

const DEFAULT_BUCKET = "produk";
const ensuredBuckets = new Set<string>();

const BUCKET_OPTIONS = {
  public: true,
  fileSizeLimit: 25 * 1024 * 1024,
  allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
};

async function ensureBucket(bucket: string): Promise<{ ok: boolean; error?: string }> {
  if (!supabaseAdmin) return { ok: false, error: "Supabase service role tidak dikonfigurasi." };
  if (ensuredBuckets.has(bucket)) return { ok: true };
  try {
    const { data, error } = await supabaseAdmin.storage.getBucket(bucket);
    if (data && !error) {
      // Sync the size limit & MIME types in case they're stale (e.g., bucket
      // was created with the old 10MB cap before we raised it to 20MB).
      if (
        (data.file_size_limit && data.file_size_limit < BUCKET_OPTIONS.fileSizeLimit) ||
        !data.public
      ) {
        await supabaseAdmin.storage.updateBucket(bucket, BUCKET_OPTIONS).catch(() => {});
      }
      ensuredBuckets.add(bucket);
      return { ok: true };
    }
    const { error: createErr } = await supabaseAdmin.storage.createBucket(bucket, BUCKET_OPTIONS);
    if (createErr && !/already exists/i.test(createErr.message)) {
      return { ok: false, error: createErr.message };
    }
    ensuredBuckets.add(bucket);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

if (supabaseAdmin) {
  ensureBucket(DEFAULT_BUCKET).then((r) => {
    if (!r.ok) logger.warn({ err: r.error }, `Gagal memastikan bucket "${DEFAULT_BUCKET}"`);
    else logger.info(`Bucket Supabase "${DEFAULT_BUCKET}" siap dipakai.`);
  });
}

function safeFilename(name: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "file";
}

function pathFromPublicUrl(url: string, bucket: string): string | null {
  try {
    const u = new URL(url);
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = u.pathname.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(u.pathname.slice(idx + marker.length));
  } catch {
    return null;
  }
}

router.post(
  "/upload/supabase",
  requireAdmin,
  json({ limit: "30mb" }),
  async (req: Request, res: Response) => {
    if (!supabaseAdmin) {
      res.status(500).json({ error: "Supabase service role tidak dikonfigurasi di server." });
      return;
    }
    const body = (req.body ?? {}) as {
      bucket?: string;
      folder?: string;
      filename?: string;
      contentType?: string;
      dataBase64?: string;
    };
    const bucket = body.bucket || DEFAULT_BUCKET;
    const folder = (body.folder || "").replace(/^\/+|\/+$/g, "");
    const filename = safeFilename(body.filename || `image-${Date.now()}`);
    const contentType = body.contentType || "application/octet-stream";
    const dataBase64 = body.dataBase64 || "";

    if (!dataBase64) {
      res.status(400).json({ error: "dataBase64 wajib diisi." });
      return;
    }

    const ensured = await ensureBucket(bucket);
    if (!ensured.ok) {
      res.status(500).json({ error: ensured.error || "Gagal menyiapkan bucket." });
      return;
    }

    let buffer: Buffer;
    try {
      const cleaned = dataBase64.includes(",") ? dataBase64.split(",", 2)[1] : dataBase64;
      buffer = Buffer.from(cleaned, "base64");
    } catch {
      res.status(400).json({ error: "dataBase64 tidak valid." });
      return;
    }

    const ext = filename.includes(".") ? filename.split(".").pop() : "bin";
    const baseName = filename.replace(/\.[^.]+$/, "");
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${baseName}.${ext}`;
    const path = folder ? `${folder}/${unique}` : unique;

    const { error: uploadErr } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, buffer, { contentType, upsert: false, cacheControl: "3600" });

    if (uploadErr) {
      logger.error({ err: uploadErr }, "Supabase upload failed");
      res.status(500).json({ error: uploadErr.message });
      return;
    }

    const { data: publicData } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
    res.json({ url: publicData.publicUrl, path, bucket });
  },
);

router.post("/upload/supabase/destroy", requireAdmin, async (req, res) => {
  if (!supabaseAdmin) {
    res.status(500).json({ error: "Supabase service role tidak dikonfigurasi di server." });
    return;
  }
  const { url, path, bucket = DEFAULT_BUCKET } = (req.body ?? {}) as {
    url?: string;
    path?: string;
    bucket?: string;
  };
  const targetPath = path || (url ? pathFromPublicUrl(url, bucket) : null);
  if (!targetPath) {
    res.status(400).json({ error: "path atau url Supabase Storage diperlukan." });
    return;
  }
  const { error } = await supabaseAdmin.storage.from(bucket).remove([targetPath]);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ ok: true });
});

export default router;
