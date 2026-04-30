import { Router } from "express";
import { db } from "@workspace/db";
import { chatHistoryTable, chatSessionTable } from "@workspace/db";
import { eq, and, gt, sql } from "drizzle-orm";
import { attachAuth, requireAdmin } from "../middlewares/auth";

const router = Router();

const fmtMsg = (r: typeof chatHistoryTable.$inferSelect) => ({
  id: r.id,
  sessionId: r.sessionId,
  pesan: r.pesan,
  pengirim: r.pengirim,
  createdAt: r.createdAt.toISOString(),
});

async function ensureSession(sessionId: string, userId?: string | null, namaTamu?: string | null) {
  await db
    .insert(chatSessionTable)
    .values({
      sessionId,
      userId: userId ?? null,
      namaTamu: namaTamu ?? null,
      status: "ai",
    })
    .onConflictDoUpdate({
      target: chatSessionTable.sessionId,
      set: { lastMessageAt: sql`now()`, ...(userId ? { userId } : {}) },
    });
}

// Public: poll messages for a session (used by chatbot to receive admin replies)
router.get("/chat/messages", async (req, res) => {
  try {
    const sessionId = req.query.sessionId as string;
    const after = req.query.after as string | undefined;
    if (!sessionId) return res.json({ messages: [], status: "ai", needsAdmin: false });

    const where = after
      ? and(eq(chatHistoryTable.sessionId, sessionId), gt(chatHistoryTable.createdAt, new Date(after)))
      : eq(chatHistoryTable.sessionId, sessionId);
    const rows = await db.select().from(chatHistoryTable).where(where).orderBy(chatHistoryTable.createdAt);

    const [session] = await db.select().from(chatSessionTable).where(eq(chatSessionTable.sessionId, sessionId));

    res.json({
      messages: rows.map(fmtMsg),
      status: session?.status ?? "ai",
      needsAdmin: session?.needsAdmin ?? false,
    });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Public: user requests human admin
router.post("/chat/handoff", attachAuth, async (req, res) => {
  try {
    const { sessionId } = req.body as { sessionId: string };
    if (!sessionId) return res.status(400).json({ error: "sessionId required" });
    await ensureSession(sessionId, req.authUser?.id, req.authProfile?.namaLengkap);
    await db
      .update(chatSessionTable)
      .set({ status: "menunggu_admin", needsAdmin: true })
      .where(eq(chatSessionTable.sessionId, sessionId));
    await db.insert(chatHistoryTable).values({
      sessionId,
      userId: req.authUser?.id ?? null,
      pesan: "[Pelanggan meminta dilayani admin]",
      pengirim: "user",
    });
    res.json({ ok: true, status: "menunggu_admin" });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Admin: reply on a session (becomes admin-handled)
router.post("/admin/chat/reply", requireAdmin, async (req, res) => {
  try {
    const { sessionId, pesan } = req.body as { sessionId: string; pesan: string };
    if (!sessionId || !pesan?.trim()) return res.status(400).json({ error: "sessionId & pesan required" });
    await ensureSession(sessionId, null);
    await db
      .update(chatSessionTable)
      .set({
        status: "admin",
        needsAdmin: false,
        assignedAdminId: req.authUser?.id ?? null,
        lastMessageAt: new Date(),
      })
      .where(eq(chatSessionTable.sessionId, sessionId));
    const [row] = await db
      .insert(chatHistoryTable)
      .values({ sessionId, pesan, pengirim: "admin" })
      .returning();
    res.json(fmtMsg(row));
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Admin: change session status (back to AI / closed)
router.patch("/admin/chat/sessions/:sessionId", requireAdmin, async (req, res) => {
  try {
    const { status } = req.body as { status: "ai" | "menunggu_admin" | "admin" | "selesai" };
    const [row] = await db
      .update(chatSessionTable)
      .set({ status, needsAdmin: status === "menunggu_admin" })
      .where(eq(chatSessionTable.sessionId, req.params.sessionId))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json({ sessionId: row.sessionId, status: row.status });
  } catch {
    res.status(400).json({ error: "Bad request" });
  }
});

export default router;
export { ensureSession };
