import { Router } from "express";
import { db } from "@workspace/db";
import { portfolioTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

const formatPortfolio = (r: typeof portfolioTable.$inferSelect) => ({
  id: r.id,
  judul: r.judul,
  deskripsi: r.deskripsi,
  kategori: r.kategori,
  gambarUrl: Array.isArray(r.gambarUrl) ? (r.gambarUrl as string[]) : [],
  tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
  isFeatured: r.isFeatured,
  createdAt: r.createdAt.toISOString(),
});

router.get("/portfolio", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(portfolioTable)
      .orderBy(desc(portfolioTable.createdAt));
    res.json(rows.map(formatPortfolio));
  } catch (err) {
    req.log.error({ err }, "Failed to list portfolio");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/portfolio", async (req, res) => {
  try {
    const body = req.body;
    const [row] = await db
      .insert(portfolioTable)
      .values({
        judul: body.judul,
        deskripsi: body.deskripsi ?? null,
        kategori: body.kategori,
        gambarUrl: body.gambarUrl ?? [],
        tags: body.tags ?? [],
        isFeatured: body.isFeatured ?? false,
      })
      .returning();
    res.status(201).json(formatPortfolio(row));
  } catch (err) {
    req.log.error({ err }, "Failed to create portfolio");
    res.status(400).json({ error: "Bad request" });
  }
});

router.delete("/portfolio/:id", async (req, res) => {
  try {
    await db.delete(portfolioTable).where(eq(portfolioTable.id, req.params.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete portfolio");
    res.status(400).json({ error: "Bad request" });
  }
});

export default router;
