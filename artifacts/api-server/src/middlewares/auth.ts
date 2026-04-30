import type { NextFunction, Request, Response } from "express";
import { createClient, type User } from "@supabase/supabase-js";
import { db, profilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      authUser?: User;
      authProfile?: typeof profilesTable.$inferSelect;
    }
  }
}

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

// Comma-separated admin emails (env). Always include the project owner.
const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS ?? "tiarafaratama@gmail.com")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

function getBearerToken(req: Request) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length);
}

/**
 * Loads the profile row for the given Supabase user.
 * - If no profile exists, creates one (auto-provisioning) using auth metadata.
 * - If the user's email is in the ADMIN_EMAILS allowlist, ensures role='admin'.
 */
async function ensureProfile(user: User) {
  const email = (user.email ?? "").toLowerCase();
  const shouldBeAdmin = email && ADMIN_EMAILS.has(email);

  const [existing] = await db.select().from(profilesTable).where(eq(profilesTable.id, user.id));
  if (existing) {
    // Promote known admin emails if not already admin
    if (shouldBeAdmin && existing.role !== "admin") {
      const [updated] = await db
        .update(profilesTable)
        .set({ role: "admin", updatedAt: new Date() })
        .where(eq(profilesTable.id, user.id))
        .returning();
      return updated ?? existing;
    }
    return existing;
  }

  // Auto-create profile row
  const meta = (user.user_metadata ?? {}) as Record<string, any>;
  const namaLengkap =
    meta.nama_lengkap ?? meta.full_name ?? meta.name ?? user.email?.split("@")[0] ?? "Pengguna";
  const noTelepon = meta.no_telepon ?? meta.phone ?? null;

  const [created] = await db
    .insert(profilesTable)
    .values({
      id: user.id,
      namaLengkap,
      noTelepon,
      role: shouldBeAdmin ? "admin" : "pelanggan",
    })
    .returning();
  return created;
}

export async function attachAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    if (!supabase) {
      next();
      return;
    }
    const token = getBearerToken(req);
    if (!token) {
      next();
      return;
    }
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      next();
      return;
    }
    req.authUser = data.user;
    try {
      req.authProfile = await ensureProfile(data.user);
    } catch (err) {
      req.log.warn({ err }, "ensureProfile failed (attachAuth)");
    }
    next();
  } catch (err) {
    req.log.warn({ err }, "Failed to attach optional Supabase user");
    next();
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      res.status(401).json({ error: "Login diperlukan." });
      return;
    }
    if (!supabase) {
      res.status(500).json({ error: "Supabase auth belum dikonfigurasi di server." });
      return;
    }
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      res.status(401).json({ error: "Session tidak valid." });
      return;
    }
    req.authUser = data.user;
    req.authProfile = await ensureProfile(data.user);
    next();
  } catch (err) {
    req.log.error({ err }, "Failed to validate Supabase user");
    res.status(401).json({ error: "Session tidak valid." });
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  await requireAuth(req, res, () => {
    if (req.authProfile?.role !== "admin") {
      res.status(403).json({ error: "Akses admin diperlukan." });
      return;
    }
    next();
  });
}
