import { Router, json, type Request, type Response } from "express";
import { requireAdmin, requireAuth } from "../middlewares/auth";
import { logger } from "../lib/logger";
import path from "path";
import fs from "fs";

const router = Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");

function ensureUploadDir(subdir?: string): string {
  const dir = subdir ? path.join(UPLOAD_DIR, subdir) : UPLOAD_DIR;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function safeFilename(name: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "file";
}

async function saveLocalFile(
  dataBase64: string,
  folder: string,
  filename: string,
): Promise<{ url: string; path: string }> {
  const dir = ensureUploadDir(folder);
  const ext = filename.includes(".") ? filename.split(".").pop() ?? "bin" : "bin";
  const baseName = filename.replace(/\.[^.]+$/, "");
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${baseName}.${ext}`;
  const filePath = path.join(dir, unique);

  const cleaned = dataBase64.includes(",") ? dataBase64.split(",", 2)[1] : dataBase64;
  const buffer = Buffer.from(cleaned, "base64");
  fs.writeFileSync(filePath, buffer);

  const relPath = path.join("/uploads", folder, unique);
  return { url: relPath, path: relPath };
}

function deleteLocalFile(urlOrPath: string): void {
  try {
    const match = urlOrPath.match(/\/uploads\/(.+)/);
    if (!match) return;
    const filePath = path.join(UPLOAD_DIR, match[1]);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (err) {
    logger.warn({ err, urlOrPath }, "Delete local file failed (non-fatal)");
  }
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

      const folder = (body.folder || body.bucket || "produk").replace(/^\/+|\/+$/g, "");
      const filename = safeFilename(body.filename || `image-${Date.now()}`);
      const dataBase64 = body.dataBase64 || "";

      if (!dataBase64) {
        res.status(400).json({ error: "dataBase64 wajib diisi." });
        return;
      }

      const { url, path: filePath } = await saveLocalFile(dataBase64, folder, filename);
      res.json({ url, path: filePath, bucket: folder });
    } catch (err: any) {
      logger.error({ err }, "Upload error");
      res.status(500).json({ error: err?.message ?? "Upload gagal." });
    }
  },
);

router.post(
  "/upload/supabase/destroy",
  requireAdmin,
  json({ limit: "1mb" }),
  async (req, res) => {
    try {
      const body = (req.body ?? {}) as { path?: string; bucket?: string; url?: string };
      const target = body.url || body.path || "";
      if (target) deleteLocalFile(target);
      res.json({ ok: true });
    } catch (err) {
      logger.error({ err }, "Destroy error");
      res.status(500).json({ error: "Gagal menghapus file." });
    }
  },
);

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
      const folder = `avatars/${String(userId).replace(/[^a-zA-Z0-9-]/g, "")}`;
      const filename = safeFilename(body.filename || `avatar-${Date.now()}`);
      const dataBase64 = body.dataBase64 || "";

      if (!dataBase64) {
        res.status(400).json({ error: "dataBase64 wajib diisi." });
        return;
      }

      const { url, path: filePath } = await saveLocalFile(dataBase64, folder, filename);
      res.json({ url, path: filePath, bucket: "avatars" });
    } catch (err: any) {
      logger.error({ err }, "Avatar upload error");
      res.status(500).json({ error: err?.message ?? "Upload gagal." });
    }
  },
);

export function serveUploads(_app: import("express").Express) {}

export default router;
