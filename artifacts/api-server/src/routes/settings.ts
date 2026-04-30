import { Router } from "express";
import { db } from "@workspace/db";
import { pengaturanSitusTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";

const router = Router();

router.get("/settings", async (_req, res) => {
  try {
    const rows = await db.select().from(pengaturanSitusTable);
    const settings: Record<string, any> = {};
    for (const r of rows) settings[r.key] = r.value;
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/admin/settings", requireAdmin, async (req, res) => {
  try {
    const updates = req.body as Record<string, any>;
    if (!updates || typeof updates !== "object") {
      res.status(400).json({ error: "Body harus object key-value." });
      return;
    }
    const entries = Object.entries(updates);
    for (const [key, value] of entries) {
      await db
        .insert(pengaturanSitusTable)
        .values({ key, value })
        .onConflictDoUpdate({ target: pengaturanSitusTable.key, set: { value, updatedAt: sql`now()` } });
    }
    const rows = await db.select().from(pengaturanSitusTable);
    const settings: Record<string, any> = {};
    for (const r of rows) settings[r.key] = r.value;
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
