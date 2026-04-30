import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import { db } from "@workspace/db";
import { profilesTable, bookingTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";

const router = Router();

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin =
  supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } }) : null;

router.get("/admin/users", requireAdmin, async (_req, res) => {
  try {
    const profiles = await db.select().from(profilesTable);
    const bookingCounts = await db
      .select({ pelangganId: bookingTable.pelangganId, count: sql<number>`count(*)::int` })
      .from(bookingTable)
      .groupBy(bookingTable.pelangganId);
    const countMap = new Map(bookingCounts.map((b) => [b.pelangganId, b.count]));

    let emailMap = new Map<string, string>();
    if (supabaseAdmin) {
      try {
        const { data } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        emailMap = new Map((data?.users ?? []).map((u) => [u.id, u.email ?? ""]));
      } catch {
        // ignore
      }
    }

    res.json(
      profiles.map((p) => ({
        id: p.id,
        namaLengkap: p.namaLengkap,
        email: emailMap.get(p.id) ?? null,
        noTelepon: p.noTelepon,
        alamat: p.alamat,
        fotoProfil: p.fotoProfil,
        role: p.role,
        totalBooking: countMap.get(p.id) ?? 0,
        createdAt: p.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/admin/users/:id", requireAdmin, async (req, res) => {
  try {
    const b = req.body as { role?: "admin" | "pelanggan"; namaLengkap?: string; noTelepon?: string };
    const set: Record<string, any> = { updatedAt: new Date() };
    if (b.role) set.role = b.role;
    if (b.namaLengkap !== undefined) set.namaLengkap = b.namaLengkap;
    if (b.noTelepon !== undefined) set.noTelepon = b.noTelepon;
    const [row] = await db.update(profilesTable).set(set).where(eq(profilesTable.id, req.params.id)).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json({ id: row.id, role: row.role, namaLengkap: row.namaLengkap, noTelepon: row.noTelepon });
  } catch {
    res.status(400).json({ error: "Bad request" });
  }
});

router.delete("/admin/users/:id", requireAdmin, async (req, res) => {
  try {
    if (req.authUser?.id === req.params.id) {
      return res.status(400).json({ error: "Tidak bisa menghapus akun sendiri." });
    }
    await db.delete(profilesTable).where(eq(profilesTable.id, req.params.id));
    if (supabaseAdmin) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(req.params.id);
      } catch {
        // ignore — profile already removed
      }
    }
    res.status(204).send();
  } catch {
    res.status(400).json({ error: "Bad request" });
  }
});

export default router;
