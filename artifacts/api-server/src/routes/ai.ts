import { Router } from "express";
import OpenAI from "openai";
import { AiChatBody, AiRecommendBody } from "@workspace/api-zod";
import { db } from "@workspace/db";
import { chatHistoryTable, chatKbTable, chatSessionTable, paketLayananTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { attachAuth } from "../middlewares/auth";
import { ensureSession } from "./chat";

const router = Router();

const client = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? "placeholder",
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ?? undefined,
});

const BASE_PROMPT = `Kamu adalah asisten AI yang ramah dari AideaCreative Studio Foto, studio foto profesional di Pujodadi, Pringsewu, Lampung.

Tugasmu: bantu calon pelanggan memilih paket foto, jawab pertanyaan layanan, beri info berguna.
Selalu jawab dalam Bahasa Indonesia yang ramah & profesional. Jika perlu konfirmasi spesifik (booking, harga custom), sarankan booking via website atau minta admin.
Jika kamu tidak tahu jawabannya atau pelanggan minta bicara dengan manusia, sarankan tombol "Bicara dengan Admin".`;

async function buildSystemPrompt(): Promise<string> {
  let prompt = BASE_PROMPT;
  try {
    const paket = await db.select().from(paketLayananTable);
    if (paket.length > 0) {
      prompt += "\n\nPaket yang tersedia (data live):\n" +
        paket
          .map((p) => `- ${p.namaPaket} (${p.kategori ?? "umum"}): Rp ${Number(p.harga).toLocaleString("id-ID")} — ${p.deskripsi ?? ""}`)
          .join("\n");
    }
  } catch {}

  try {
    const kb = await db.select().from(chatKbTable).where(eq(chatKbTable.isAktif, true));
    if (kb.length > 0) {
      prompt += "\n\nKnowledge Base (gunakan jika relevan):\n" +
        kb.map((k) => `Q: ${k.pertanyaan}\nA: ${k.jawaban}`).join("\n\n");
    }
  } catch {}

  return prompt;
}

router.post("/ai/chat", attachAuth, async (req, res) => {
  try {
    const body = AiChatBody.parse(req.body);
    const sessionId = (req.body?.sessionId as string) || `web-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    await ensureSession(sessionId, req.authUser?.id, req.authProfile?.nama_lengkap);

    // Save user message
    await db.insert(chatHistoryTable).values({
      sessionId,
      userId: req.authUser?.id ?? null,
      pesan: body.message,
      pengirim: "user",
    });

    // Check session status — if admin is handling, don't reply with AI
    const [session] = await db.select().from(chatSessionTable).where(eq(chatSessionTable.sessionId, sessionId));
    if (session && (session.status === "admin" || session.status === "menunggu_admin")) {
      const note =
        session.status === "menunggu_admin"
          ? "Pesan Anda sudah diteruskan ke admin. Mohon tunggu sebentar, admin akan segera membalas."
          : "Anda sedang terhubung dengan admin. Silakan tunggu balasan admin di chat ini.";
      return res.json({ reply: note, sessionId, status: session.status });
    }

    const systemPrompt = await buildSystemPrompt();
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...(body.history || []).map((h) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
      { role: "user", content: body.message },
    ];

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 500,
    });

    const reply = completion.choices[0]?.message?.content ?? "Maaf, saya tidak dapat menjawab saat ini.";

    await db.insert(chatHistoryTable).values({
      sessionId,
      pesan: reply,
      pengirim: "bot",
    });

    res.json({ reply, sessionId, status: "ai" });
  } catch (err) {
    req.log.error({ err }, "AI chat error");
    res.json({ reply: "Maaf, layanan AI sedang tidak tersedia. Silakan hubungi kami langsung di studio." });
  }
});

router.post("/ai/recommend", async (req, res) => {
  try {
    const body = AiRecommendBody.parse(req.body);
    const paket = await db.select().from(paketLayananTable).catch(() => []);
    const paketList = paket
      .map((p, i) => `${i + 1}. ${p.namaPaket} - Rp ${Number(p.harga).toLocaleString("id-ID")} (id: ${p.id})`)
      .join("\n") || "1. Paket Prewedding\n2. Paket Wedding\n3. Paket Wisuda";

    const prompt = `Berikan rekomendasi paket foto AideaCreative Studio.
Kebutuhan: ${body.kebutuhan}
${body.acara ? `Acara: ${body.acara}` : ""}
${body.budget ? `Budget: Rp ${body.budget.toLocaleString("id-ID")}` : ""}

Paket tersedia:
${paketList}

Balas dalam JSON: { "rekomendasi": "...", "paketDisarankan": [<id atau nomor>, ...] }`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content ?? '{"rekomendasi":"","paketDisarankan":[]}';
    const parsed = JSON.parse(content);
    res.json({
      rekomendasi: parsed.rekomendasi ?? "Kami merekomendasikan paket yang sesuai kebutuhan Anda.",
      paketDisarankan: Array.isArray(parsed.paketDisarankan) ? parsed.paketDisarankan : [],
    });
  } catch (err) {
    req.log.error({ err }, "AI recommend error");
    res.json({ rekomendasi: "Silakan konsultasikan kebutuhan foto Anda langsung dengan tim kami.", paketDisarankan: [] });
  }
});

export default router;
