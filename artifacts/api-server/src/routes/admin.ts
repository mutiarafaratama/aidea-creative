import { Router } from "express";
import { db } from "@workspace/db";
import { chatHistoryTable, chatSessionTable } from "@workspace/db";
import { sql, eq } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";

const router = Router();

// List chat sessions with last message preview + status
// Excludes internal AI-generated sessions (insight/narasi calls)
// Query param: ?filter=open (default) | closed | all
router.get("/admin/chat/sessions", requireAdmin, async (req, res) => {
  try {
    const filter = (req.query.filter as string) || "open";

    // Status clause for ticket system (HAVING since status is in GROUP BY)
    const havingClause =
      filter === "closed"
        ? sql`HAVING COALESCE(MAX(s.status::text), 'ai') = 'selesai'`
        : filter === "open"
        ? sql`HAVING COALESCE(MAX(s.status::text), 'ai') != 'selesai'`
        : sql``;

    const rows = await db.execute(sql`
      SELECT
        h.session_id AS "sessionId",
        MAX(h.created_at) AS "lastAt",
        COUNT(*)::int AS "messageCount",
        (ARRAY_AGG(h.pesan ORDER BY h.created_at DESC))[1] AS "lastMessage",
        (ARRAY_AGG(h.pengirim::text ORDER BY h.created_at DESC))[1] AS "lastFrom",
        MAX(h.user_id::text) AS "userId",
        COALESCE(MAX(s.status::text), 'ai') AS "status",
        COALESCE(MAX(s.needs_admin::text) = 'true', false) AS "needsAdmin",
        MAX(s.nama_tamu) AS "namaTamu"
      FROM chat_history h
      LEFT JOIN chat_session s ON s.session_id = h.session_id
      WHERE NOT EXISTS (
        SELECT 1 FROM chat_history ih
        WHERE ih.session_id = h.session_id
          AND ih.pengirim = 'user'
          AND (
            ih.pesan ILIKE 'Anda adalah AI analis%'
            OR ih.pesan ILIKE 'Buat narasi laporan%'
            OR ih.pesan ILIKE 'Buat deskripsi produk%'
          )
      )
      GROUP BY h.session_id
      ${havingClause}
      ORDER BY MAX(h.created_at) DESC
      LIMIT 200
    `);
    res.json(rows.rows ?? rows);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/chat/sessions/:sessionId", requireAdmin, async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(chatHistoryTable)
      .where(eq(chatHistoryTable.sessionId, req.params.sessionId))
      .orderBy(chatHistoryTable.createdAt);
    const [session] = await db.select().from(chatSessionTable).where(eq(chatSessionTable.sessionId, req.params.sessionId));
    res.json({
      session: session
        ? { sessionId: session.sessionId, status: session.status, needsAdmin: session.needsAdmin, namaTamu: session.namaTamu }
        : { sessionId: req.params.sessionId, status: "ai", needsAdmin: false, namaTamu: null },
      messages: rows.map((r) => ({
        id: r.id,
        sessionId: r.sessionId,
        userId: r.userId,
        pesan: r.pesan,
        pengirim: r.pengirim,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/laporan/bulanan", requireAdmin, async (req, res) => {
  try {
    const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
    const start = `${month}-01`;
    const endDate = new Date(`${month}-01T00:00:00Z`);
    endDate.setUTCMonth(endDate.getUTCMonth() + 1);
    const end = endDate.toISOString().slice(0, 10);

    const stats = await db.execute(sql`
      SELECT
        COUNT(*)::int AS "totalBooking",
        COUNT(*) FILTER (WHERE status = 'selesai')::int AS "selesai",
        COUNT(*) FILTER (WHERE status = 'dibatalkan')::int AS "dibatalkan",
        COUNT(*) FILTER (WHERE status = 'menunggu')::int AS "menunggu",
        COALESCE(SUM(total_harga) FILTER (WHERE status = 'selesai'), 0)::bigint AS "pendapatan"
      FROM booking WHERE created_at >= ${start} AND created_at < ${end}
    `);
    const top = await db.execute(sql`
      SELECT p.nama_paket AS "namaPaket", COUNT(*)::int AS "count"
      FROM booking b JOIN paket_layanan p ON p.id = b.paket_id
      WHERE b.created_at >= ${start} AND b.created_at < ${end}
      GROUP BY p.nama_paket ORDER BY count DESC LIMIT 5
    `);
    res.json({
      month,
      stats: (stats.rows ?? stats)[0] ?? {},
      topPaket: top.rows ?? top,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
