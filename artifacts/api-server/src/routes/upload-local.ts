import { Router, json, type Request, type Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin, requireAuth } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function getSupabaseAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error(
      "VITE_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY harus diisi di Replit Secrets.",
    );
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });
}

function safeFilename(name: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "file";
}

async function ensureBucket(supabase: ReturnType<typeof createClient>, bucket: string): Promise<void> {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    logger.warn({ listError }, "Could not list buckets, attempting upload anyway");
    return;
  }
  const exists = (buckets ?? []).some((b) => b.name === bucket);
  if (!exists) {
    const { error: createError } = await supabase.storage.createBucket(bucket, {
      public: true,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
      fileSizeLimit: 20 * 1024 * 1024,
    });
    if (createError && !createError.message.includes("already exists")) {
      logger.warn({ createError, bucket }, "Could not create bucket");
    } else {
      logger.info({ bucket }, "Supabase storage bucket created");
    }
  }
}

async function uploadToSupabase(
  dataBase64: string,
  bucket: string,
  folder: string,
  filename: string,
  contentType: string,
): Promise<{ url: string; path: string }> {
  const supabase = getSupabaseAdmin();

  await ensureBucket(supabase, bucket);

  const cleaned = dataBase64.includes(",") ? dataBase64.split(",", 2)[1] : dataBase64;
  const buffer = Buffer.from(cleaned, "base64");

  const ext = filename.includes(".") ? filename.split(".").pop() ?? "bin" : "bin";
  const baseName = filename.replace(/\.[^.]+$/, "");
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${baseName}.${ext}`;
  const filePath = folder ? `${folder}/${unique}` : unique;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, buffer, {
      contentType: contentType || "image/jpeg",
      upsert: false,
    });

  if (error) throw new Error(`Supabase storage error: ${error.message}`);

  const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return { url: publicData.publicUrl, path: filePath };
}

async function deleteFromSupabase(urlOrPath: string): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    // Parse storage path from Supabase public URL:
    // format: {SUPABASE_URL}/storage/v1/object/public/{bucket}/{path}
    const match = urlOrPath.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
    if (!match) return;
    const bucket = match[1];
    const filePath = decodeURIComponent(match[2]);
    await supabase.storage.from(bucket).remove([filePath]);
  } catch (err) {
    logger.warn({ err, urlOrPath }, "Delete from Supabase storage failed (non-fatal)");
  }
}

// ─── Admin upload (gambar produk, paket, portfolio, pricelist, dll.) ────────
router.post(
  "/upload/supabase",
  requireAdmin,
  json({ limit: "30mb" }),
  async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as {
        bucket?: string;
        folder?: string;
        filename?: string;
        contentType?: string;
        dataBase64?: string;
      };

      const bucket = (body.bucket || "produk").replace(/^\/+|\/+$/g, "");
      const folder = (body.folder || "").replace(/^\/+|\/+$/g, "");
      const filename = safeFilename(body.filename || `image-${Date.now()}`);
      const contentType = body.contentType || "image/jpeg";
      const dataBase64 = body.dataBase64 || "";

      if (!dataBase64) {
        res.status(400).json({ error: "dataBase64 wajib diisi." });
        return;
      }

      const { url, path } = await uploadToSupabase(dataBase64, bucket, folder, filename, contentType);
      res.json({ url, path, bucket });
    } catch (err: any) {
      logger.error({ err }, "Upload error");
      res.status(500).json({ error: err?.message ?? "Upload gagal." });
    }
  },
);

// ─── Hapus file dari Supabase Storage ─────────────────────────────────────
router.post(
  "/upload/supabase/destroy",
  requireAdmin,
  json({ limit: "1mb" }),
  async (req, res) => {
    try {
      const body = (req.body ?? {}) as { path?: string; bucket?: string; url?: string };
      const target = body.url || body.path || "";
      if (target) await deleteFromSupabase(target);
      res.json({ ok: true });
    } catch (err) {
      logger.error({ err }, "Destroy error");
      res.status(500).json({ error: "Gagal menghapus file." });
    }
  },
);

// ─── Upload avatar user ────────────────────────────────────────────────────
router.post(
  "/upload/avatar",
  requireAuth,
  json({ limit: "10mb" }),
  async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as {
        filename?: string;
        contentType?: string;
        dataBase64?: string;
      };
      const userId = (req.authUser as any)?.id ?? "unknown";
      const folder = `${String(userId).replace(/[^a-zA-Z0-9-]/g, "")}`;
      const filename = safeFilename(body.filename || `avatar-${Date.now()}`);
      const contentType = body.contentType || "image/jpeg";
      const dataBase64 = body.dataBase64 || "";

      if (!dataBase64) {
        res.status(400).json({ error: "dataBase64 wajib diisi." });
        return;
      }

      const { url, path } = await uploadToSupabase(dataBase64, "avatars", folder, filename, contentType);
      res.json({ url, path, bucket: "avatars" });
    } catch (err: any) {
      logger.error({ err }, "Avatar upload error");
      res.status(500).json({ error: err?.message ?? "Upload gagal." });
    }
  },
);

export function serveUploads(_app: import("express").Express) {}

export default router;
