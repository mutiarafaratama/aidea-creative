import { Router, json, type Request, type Response } from "express";
import { requireAdmin } from "../middlewares/auth";
import { logger } from "../lib/logger";
import path from "path";
import fs from "fs";

const router = Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
const PUBLIC_BASE = process.env.PUBLIC_BASE ?? "";

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
      const relPath = folder ? `${bucket}/${folder}/${unique}` : `${bucket}/${unique}`;
      const absDir = path.join(UPLOAD_DIR, folder ? `${bucket}/${folder}` : bucket);

      ensureDir(absDir);
      fs.writeFileSync(path.join(absDir, path.basename(unique)), buffer);

      const url = `${PUBLIC_BASE}/uploads/${relPath}`;
      res.json({ url, path: relPath, bucket });
    } catch (err) {
      logger.error({ err }, "Local upload failed");
      res.status(500).json({ error: "Upload gagal." });
    }
  },
);

router.post("/upload/supabase/destroy", requireAdmin, async (req, res) => {
  try {
    const { path: filePath } = (req.body ?? {}) as { path?: string; url?: string; bucket?: string };

    if (!filePath) {
      res.status(400).json({ error: "path diperlukan." });
      return;
    }

    const absPath = path.join(UPLOAD_DIR, filePath);
    const normalized = path.normalize(absPath);
    if (!normalized.startsWith(path.normalize(UPLOAD_DIR))) {
      res.status(400).json({ error: "Path tidak valid." });
      return;
    }

    if (fs.existsSync(normalized)) {
      fs.unlinkSync(normalized);
    }
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Local upload destroy failed");
    res.status(500).json({ error: "Gagal menghapus file." });
  }
});

export function serveUploads(app: import("express").Express) {
  import("express").then(({ default: express }) => {
    ensureDir(UPLOAD_DIR);
    app.use("/uploads", express.static(UPLOAD_DIR, { maxAge: "1d" }));
  });
}

export default router;
