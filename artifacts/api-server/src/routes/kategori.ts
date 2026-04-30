import { Router } from "express";
import { db } from "@workspace/db";
import { kategoriLayananTable } from "@workspace/db";

const router = Router();

router.get("/kategori", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(kategoriLayananTable)
      .orderBy(kategoriLayananTable.createdAt);
    res.json(
      rows.map((r) => ({
        id: r.id,
        nama: r.nama,
        deskripsi: r.deskripsi,
        icon: r.icon,
        createdAt: r.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list kategori");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
