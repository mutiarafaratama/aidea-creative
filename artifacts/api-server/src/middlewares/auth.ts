import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { db, profilesTable, usersAuthTable } from "@workspace/db";
import { eq } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      authUser?: { id: string; email: string };
      authProfile?: typeof profilesTable.$inferSelect;
    }
  }
}

const JWT_SECRET = process.env.SESSION_SECRET ?? "fallback-dev-secret-change-in-prod";

const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS ?? "tiarafaratama@gmail.com")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice("Bearer ".length);
  const cookie = req.cookies?.["auth_token"] as string | undefined;
  if (cookie) return cookie;
  return null;
}

export function signToken(payload: { id: string; email: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): { id: string; email: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: string; email: string };
  } catch {
    return null;
  }
}

export async function ensureProfile(userId: string, email: string) {
  const shouldBeAdmin = email && ADMIN_EMAILS.has(email.toLowerCase());

  const [existing] = await db.select().from(profilesTable).where(eq(profilesTable.id, userId));
  if (existing) {
    if (shouldBeAdmin && existing.role !== "admin") {
      const [updated] = await db
        .update(profilesTable)
        .set({ role: "admin", updatedAt: new Date() })
        .where(eq(profilesTable.id, userId))
        .returning();
      return updated ?? existing;
    }
    return existing;
  }

  const name = email.split("@")[0] ?? "Pengguna";
  const [created] = await db
    .insert(profilesTable)
    .values({
      id: userId,
      namaLengkap: name,
      role: shouldBeAdmin ? "admin" : "pelanggan",
    })
    .returning();
  return created;
}

export async function attachAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = getBearerToken(req);
    if (!token) { next(); return; }
    const payload = verifyToken(token);
    if (!payload) { next(); return; }
    req.authUser = { id: payload.id, email: payload.email };
    try {
      req.authProfile = await ensureProfile(payload.id, payload.email);
    } catch (err) {
      req.log?.warn?.({ err }, "ensureProfile failed (attachAuth)");
    }
    next();
  } catch (err) {
    req.log?.warn?.({ err }, "Failed to attach auth user");
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
    const payload = verifyToken(token);
    if (!payload) {
      res.status(401).json({ error: "Session tidak valid." });
      return;
    }
    req.authUser = { id: payload.id, email: payload.email };
    req.authProfile = await ensureProfile(payload.id, payload.email);
    next();
  } catch (err) {
    req.log?.error?.({ err }, "Failed to validate auth user");
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
