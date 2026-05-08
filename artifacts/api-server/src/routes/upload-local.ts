import { Router, json, type Request, type Response } from "express";
import { requireAdmin, requireAuth } from "../middlewares/auth";
import { logger } from "../lib/logger";
import { createClient } from "@supabase/supabase-js";

const router = Router();

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function getSupabaseAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi.");
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
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

      const bucket = body.bucket || "produk";
      const folder = (body.folder || "").replace(/^\/+|\/+$/g, "");
      const filename = safeFilename(body.filename || `image-${Date.now()}`);
      const contentType = body.contentType || "image/jpeg";
      const dataBase64 = body.dataBase64 || "";

      if (!dataBase64) {
        res.status(400).json({ error: "dataBase64 wajib diisi." });
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
      const storagePath = folder ? `${folder}/${unique}` : unique;

      const supabase = getSupabaseAdmin();
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(storagePath, buffer, { contentType, upsert: false });

      if (uploadError) {
        logger.error({ uploadError }, "Supabase upload failed");
        res.status(500).json({ error: `Upload gagal: ${uploadError.message}` });
        return;
      }

      const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(storagePath);
      const url = publicData.publicUrl;

      res.json({ url, path: storagePath, bucket });
    } catch (err) {
      logger.error({ err }, "Supabase upload error");
      res.status(500).json({ error: "Upload gagal." });
    }
  },
);

router.post("/upload/supabase/destroy", requireAdmin, async (req, res) => {
  try {
    const { path: filePath, bucket: bucketName } = (req.body ?? {}) as {
      path?: string;
      url?: string;
      bucket?: string;
    };

    if (!filePath) {
      res.status(400).json({ error: "path diperlukan." });
      return;
    }

    const bucket = bucketName || "produk";
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.storage.from(bucket).remove([filePath]);

    if (error) {
      logger.error({ error }, "Supabase destroy failed");
      res.status(500).json({ error: `Gagal menghapus file: ${error.message}` });
      return;
    }

    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Supabase destroy error");
    res.status(500).json({ error: "Gagal menghapus file." });
  }
});

router.post(
  "/upload/avatar",
  requireAuth,
  json({ limit: "10mb" }),
  async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as { filename?: string; contentType?: string; dataBase64?: string };
      const userId = (req.authUser as any)?.id ?? "unknown";
      const folder = String(userId).replace(/[^a-zA-Z0-9-]/g, "");
      const filename = safeFilename(body.filename || `avatar-${Date.now()}`);
      const contentType = body.contentType || "image/jpeg";
      const dataBase64 = body.dataBase64 || "";

      if (!dataBase64) {
        res.status(400).json({ error: "dataBase64 wajib diisi." });
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

      const ext = filename.includes(".") ? filename.split(".").pop() : "jpg";
      const baseName = filename.replace(/\.[^.]+$/, "");
      const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${baseName}.${ext}`;
      const storagePath = `${folder}/${unique}`;

      const supabase = getSupabaseAdmin();
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(storagePath, buffer, { contentType, upsert: false });

      if (uploadError) {
        logger.error({ uploadError }, "Avatar Supabase upload failed");
        res.status(500).json({ error: `Upload gagal: ${uploadError.message}` });
        return;
      }

      const { data: publicData } = supabase.storage.from("avatars").getPublicUrl(storagePath);
      const url = publicData.publicUrl;

      res.json({ url, path: storagePath, bucket: "avatars" });
    } catch (err) {
      logger.error({ err }, "Avatar upload error");
      res.status(500).json({ error: "Upload gagal." });
    }
  },
);

export function serveUploads(_app: import("express").Express) {
}

export default router;
