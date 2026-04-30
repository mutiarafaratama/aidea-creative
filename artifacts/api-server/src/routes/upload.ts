import { Router } from "express";
import { v2 as cloudinary } from "cloudinary";
import { requireAdmin } from "../middlewares/auth";

const router = Router();

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (cloudName && apiKey && apiSecret) {
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
}

router.get("/upload/cloudinary/sign", requireAdmin, (req, res) => {
  if (!cloudName || !apiKey || !apiSecret) {
    res.status(500).json({ error: "Cloudinary belum dikonfigurasi di server." });
    return;
  }
  const folder = (req.query.folder as string) || "aidea";
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign: Record<string, string | number> = { timestamp, folder };
  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);
  res.json({ signature, timestamp, apiKey, cloudName, folder });
});

// Extract Cloudinary publicId from a secure_url like
// https://res.cloudinary.com/<cloud>/image/upload/v1234/folder/sub/name.jpg
function publicIdFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (!/cloudinary\.com$/i.test(u.hostname.split(".").slice(-2).join("."))) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    const uploadIdx = parts.indexOf("upload");
    if (uploadIdx === -1) return null;
    let rest = parts.slice(uploadIdx + 1);
    // Strip version segment (e.g. v1700000000)
    if (rest[0] && /^v\d+$/.test(rest[0])) rest = rest.slice(1);
    if (rest.length === 0) return null;
    const last = rest[rest.length - 1].replace(/\.[^.]+$/, "");
    rest[rest.length - 1] = last;
    return rest.join("/");
  } catch {
    return null;
  }
}

router.post("/upload/cloudinary/destroy", requireAdmin, async (req, res) => {
  if (!cloudName || !apiKey || !apiSecret) {
    res.status(500).json({ error: "Cloudinary belum dikonfigurasi di server." });
    return;
  }
  const { url, publicId } = (req.body ?? {}) as { url?: string; publicId?: string };
  const id = publicId || (url ? publicIdFromUrl(url) : null);
  if (!id) {
    res.status(400).json({ error: "publicId atau url diperlukan." });
    return;
  }
  try {
    const result = await cloudinary.uploader.destroy(id, { invalidate: true });
    res.json({ ok: true, result });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "destroy failed" });
  }
});

export default router;
