import { Router, json, type Request, type Response } from "express";
import { requireAdmin, requireAuth } from "../middlewares/auth";
import { logger } from "../lib/logger";
import path from "path";
import fs from "fs";

const router = Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function safeFilename(name: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "file";
}

function getPublicBaseUrl(req: Request): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.REPLIT_DEV_DOMAIN) return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  const host = (req.headers["x-forwarded-host"] as string | undefined)?.split(",")[0]?.trim() || req.hostname;
  const proto = (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0]?.trim() || "https";
  return `${proto}://${host}`;
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

      const bucket = (body.bucket || "produk").replace(/^\/+|\/+$/g, "");
      const folder = (body.folder || "").replace(/^\/+|\/+$/g, "");
      const filename = safeFilename(body.filename || `image-${Date.now()}`);
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

      const localFolder = folder || bucket;
      const destDir = path.join(UPLOAD_DIR, localFolder);
      ensureDir(destDir);
      const destFile = path.join(destDir, unique);
      fs.writeFileSync(destFile, buffer);

      const localPath = `${localFolder}/${unique}`;
      const base = getPublicBaseUrl(req);
      const url = `${base}/uploads/${localPath}`;

      res.json({ url, path: localPath, bucket });
    } catch (err) {
      logger.error({ err }, "Upload error");
      res.status(500).json({ error: "Upload gagal." });
    }
  },
);

router.post("/upload/supabase/destroy", requireAdmin, json({ limit: "1mb" }), async (req, res) => {
  try {
    const body = (req.body ?? {}) as { path?: string; bucket?: string; url?: string };

    if (body.path) {
      const fullPath = path.join(UPLOAD_DIR, body.path);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } else if (body.url) {
      const urlObj = new URL(body.url).pathname;
      const uploadsIdx = urlObj.indexOf("/uploads/");
      if (uploadsIdx !== -1) {
        const relativePath = urlObj.slice(uploadsIdx + "/uploads/".length);
        const fullPath = path.join(UPLOAD_DIR, relativePath);
        if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      }
    }

    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Destroy error");
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
      const folder = `avatars/${String(userId).replace(/[^a-zA-Z0-9-]/g, "")}`;
      const filename = safeFilename(body.filename || `avatar-${Date.now()}`);
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

      const destDir = path.join(UPLOAD_DIR, folder);
      ensureDir(destDir);
      const destFile = path.join(destDir, unique);
      fs.writeFileSync(destFile, buffer);

      const storagePath = `${folder}/${unique}`;
      const base = getPublicBaseUrl(req);
      const url = `${base}/uploads/${storagePath}`;

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
