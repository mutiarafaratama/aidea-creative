import { Router } from "express";
import { db } from "@workspace/db";
import { profilesTable, bookingTable, pesananProdukTable, itemPesananTable, testimoniTable, chatSessionTable, usersAuthTable } from "@workspace/db";
import { eq, sql, inArray } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";

const router = Router();

router.get("/admin/users", requireAdmin, async (_req, res) => {
  try {
    const profiles = await db.select().from(profilesTable);
    const bookingCounts = await db
      .select({ pelangganId: bookingTable.pelangganId, count: sql<number>`count(*)::int` })
      .from(bookingTable)
      .groupBy(bookingTable.pelangganId);
    const countMap = new Map(bookingCounts.map((b) => [b.pelangganId, b.count]));

    const auths = await db.select({ profileId: usersAuthTable.profileId, email: usersAuthTable.email }).from(usersAuthTable);
    const emailMap = new Map(auths.map((a) => [a.profileId, a.email]));

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
    const userId = req.params.id;
    if (req.authUser?.id === userId) {
      return res.status(400).json({ error: "Tidak bisa menghapus akun sendiri." });
    }

    const pesananIds = await db
      .select({ id: pesananProdukTable.id })
      .from(pesananProdukTable)
      .where(eq(pesananProdukTable.pelangganId, userId));
    if (pesananIds.length > 0) {
      await db.delete(itemPesananTable).where(
        inArray(itemPesananTable.pesananId, pesananIds.map((p) => p.id))
      );
    }

    await db.delete(pesananProdukTable).where(eq(pesananProdukTable.pelangganId, userId));
    await db.delete(bookingTable).where(eq(bookingTable.pelangganId, userId));
    await db.delete(testimoniTable).where(eq(testimoniTable.pelangganId, userId));
    await db.delete(chatSessionTable).where(eq(chatSessionTable.userId, userId));
    await db.delete(usersAuthTable).where(eq(usersAuthTable.profileId, userId));
    await db.delete(profilesTable).where(eq(profilesTable.id, userId));

    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Gagal menghapus pengguna." });
  }
});

export default router;
