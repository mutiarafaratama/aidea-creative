import { Router } from "express";
import { AiChatBody, AiRecommendBody } from "@workspace/api-zod";
import { db } from "@workspace/db";
import { chatHistoryTable, chatKbTable, chatSessionTable, paketLayananTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { attachAuth } from "../middlewares/auth";
import { ensureSession } from "./chat";

const router = Router();

// We deliberately use plain fetch (NOT the openai SDK) because some OpenAI-
// compatible gateways (notably pio.codes, fronted by Cloudflare) WAF-block
// requests carrying the `User-Agent: OpenAI/JS …` and `X-Stainless-*` headers
// the SDK adds. With a generic UA the same payload returns 200.
const AI_BASE_URL = (process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
const AI_API_KEY = process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? "";
const AI_MODEL = process.env.AI_MODEL ?? "qwen-turbo";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

async function chatComplete(messages: ChatMessage[], maxTokens = 500): Promise<string> {
  if (!AI_API_KEY) throw new Error("AI_INTEGRATIONS_OPENAI_API_KEY missing");
  const res = await fetch(`${AI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${AI_API_KEY}`,
      "User-Agent": "AideaCreative/1.0",
      Accept: "application/json",
    },
    body: JSON.stringify({
      model: AI_MODEL,
      max_tokens: maxTokens,
      messages,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw Object.assign(new Error(`AI provider returned ${res.status}: ${text.slice(0, 200)}`), { status: res.status, body: text });
  }
  const json: any = await res.json();
  return json?.choices?.[0]?.message?.content ?? "";
}

// Best-effort JSON extractor for models that don't support response_format.
function extractJson(text: string): any {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

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
          .map((p: any) => `- ${p.namaPaket} (${p.kategori ?? "umum"}): Rp ${Number(p.harga).toLocaleString("id-ID")} — ${p.deskripsi ?? ""}`)
          .join("\n");
    }
  } catch {}

  try {
    const kb = await db.select().from(chatKbTable).where(eq(chatKbTable.isAktif, true));
    if (kb.length > 0) {
      prompt += "\n\nKnowledge Base (gunakan jika relevan):\n" +
        kb.map((k: any) => `Q: ${k.pertanyaan}\nA: ${k.jawaban}`).join("\n\n");
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
      res.json({ reply: note, sessionId, status: session.status });
      return;
    }

    const systemPrompt = await buildSystemPrompt();
    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...(body.history || []).map((h: any) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
      { role: "user", content: body.message },
    ];

    const reply = (await chatComplete(messages, 500)) || "Maaf, saya tidak dapat menjawab saat ini.";

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

// Lightweight one-shot generation endpoint (no system prompt baggage).
// Used by admin tools like product description generator.
router.post("/ai/generate", async (req, res) => {
  try {
    const prompt = typeof req.body?.prompt === "string" ? req.body.prompt : "";
    const system = typeof req.body?.system === "string" ? req.body.system : "Kamu adalah asisten yang membantu menulis teks pemasaran dalam Bahasa Indonesia. Jawab langsung tanpa pembuka.";
    const maxTokens = Math.max(50, Math.min(1000, Number(req.body?.maxTokens) || 300));
    if (!prompt.trim()) {
      res.status(400).json({ error: "prompt required" });
      return;
    }
    const text = await chatComplete(
      [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      maxTokens,
    );
    res.json({ text: text.trim() });
  } catch (err: any) {
    req.log.error({ err }, "AI generate error");
    res.status(502).json({ error: "ai_unavailable", text: "" });
  }
});

router.post("/ai/recommend", async (req, res) => {
  try {
    const body = AiRecommendBody.parse(req.body);
    const paket = await db.select().from(paketLayananTable).catch(() => []);
    const paketList = paket
      .map((p: any, i: number) => `${i + 1}. ${p.namaPaket} - Rp ${Number(p.harga).toLocaleString("id-ID")} (id: ${p.id})`)
      .join("\n") || "1. Paket Prewedding\n2. Paket Wedding\n3. Paket Wisuda";

    const prompt = `Berikan rekomendasi paket foto AideaCreative Studio.
Kebutuhan: ${body.kebutuhan}
${body.acara ? `Acara: ${body.acara}` : ""}
${body.budget ? `Budget: Rp ${body.budget.toLocaleString("id-ID")}` : ""}

Paket tersedia:
${paketList}

Balas HANYA dalam format JSON valid (tanpa pembuka, tanpa code fence). Contoh:
{"rekomendasi": "Saran singkat...", "paketDisarankan": ["<id atau nomor>"]}`;

    const content = await chatComplete([{ role: "user", content: prompt }], 300);
    const parsed = extractJson(content) ?? {};
    res.json({
      rekomendasi:
        typeof parsed.rekomendasi === "string" && parsed.rekomendasi.trim()
          ? parsed.rekomendasi
          : content.trim() || "Kami merekomendasikan paket yang sesuai kebutuhan Anda.",
      paketDisarankan: Array.isArray(parsed.paketDisarankan) ? parsed.paketDisarankan : [],
    });
  } catch (err) {
    req.log.error({ err }, "AI recommend error");
    res.json({ rekomendasi: "Silakan konsultasikan kebutuhan foto Anda langsung dengan tim kami.", paketDisarankan: [] });
  }
});

export default router;
