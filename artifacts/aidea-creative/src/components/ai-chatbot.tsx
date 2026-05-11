import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Bot, Loader2, ShieldCheck, UserPlus, Info, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { soundNewMessage, soundStatusUpdate, unlockAudio } from "@/lib/notify-sound";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const SESSION_KEY = "aidea_chat_session_v1";
// v2: y = fromBottom (distance from bottom of viewport) — stable across browser chrome show/hide
const MOBILE_BTN_POS_KEY = "aidea_chat_btn_pos_v2";

type ChatMessage = {
  id?: string;
  role: "user" | "assistant" | "admin" | "system";
  content: string;
};
type SessionStatus = "ai" | "menunggu_admin" | "admin" | "selesai";

function newSessionId() {
  return `web-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// x = distance from left, y = distance from BOTTOM of viewport
function clampPos(x: number, fromBottom: number, btnSize = 56): { x: number; y: number } {
  if (typeof window === "undefined") return { x, y: fromBottom };
  return {
    x: Math.max(8, Math.min(window.innerWidth - btnSize - 8, x)),
    y: Math.max(8, Math.min(window.innerHeight - btnSize - 8, fromBottom)),
  };
}

function loadMobilePos(): { x: number; y: number } | null {
  try {
    const s = localStorage.getItem(MOBILE_BTN_POS_KEY);
    if (s) {
      const parsed = JSON.parse(s);
      if (typeof parsed.x === "number" && typeof parsed.y === "number") {
        return clampPos(parsed.x, parsed.y);
      }
    }
  } catch {}
  return null;
}

function isMobile() {
  return typeof window !== "undefined" && window.innerWidth < 768;
}

const WELCOME_MSG: ChatMessage = {
  role: "assistant",
  content: 'Halo! Saya asisten AI AideaCreative. Ada yang bisa saya bantu? Jika butuh bantuan langsung dari tim, klik tombol "Bicara dengan Admin" di bawah.',
};

export function AiChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sessionId] = useState<string>(() => {
    const existing = typeof window !== "undefined" ? window.localStorage.getItem(SESSION_KEY) : null;
    if (existing) return existing;
    const fresh = newSessionId();
    if (typeof window !== "undefined") window.localStorage.setItem(SESSION_KEY, fresh);
    return fresh;
  });

  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MSG]);
  const [status, setStatus] = useState<SessionStatus>("ai");
  const [pending, setPending] = useState(false);
  const [requestingAdmin, setRequestingAdmin] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const lastSeenRef = useRef<string | null>(null);
  const prevStatusRef = useRef<SessionStatus>("ai");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<SessionStatus>("ai");
  statusRef.current = status;

  // ── Mobile drag state ────────────────────────────────────────────────
  const [mobile, setMobile] = useState(() => isMobile());
  // mobilePos.y = fromBottom (distance from bottom of viewport, NOT from top)
  const [mobilePos, setMobilePos] = useState<{ x: number; y: number }>(() => {
    const saved = loadMobilePos();
    if (saved) return saved;
    if (typeof window !== "undefined") return { x: window.innerWidth - 80, y: 24 };
    return { x: 300, y: 24 };
  });
  const dragRef = useRef<{ startX: number; startY: number; btnX: number; btnFromBottom: number; moved: boolean } | null>(null);

  useEffect(() => {
    const onResize = () => {
      const nowMobile = isMobile();
      setMobile(nowMobile);
      if (nowMobile) setMobilePos((prev) => clampPos(prev.x, prev.y));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ── Load full history from server on mount ───────────────────────────
  const loadHistory = useCallback(async (silent = false) => {
    if (!silent) setHistoryLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/chat/messages?sessionId=${encodeURIComponent(sessionId)}`);
      if (!res.ok) return;
      const data = await res.json();

      // Restore session status
      const serverStatus = (data.status ?? "ai") as SessionStatus;
      const finalStatus = serverStatus === "selesai" ? "ai" : serverStatus;
      setStatus(finalStatus);
      prevStatusRef.current = finalStatus;
      statusRef.current = finalStatus;

      // Map server messages to local format
      const serverMsgs: ChatMessage[] = (data.messages ?? [])
        .filter((m: any) => m.pengirim !== "bot" || m.pesan !== "[Pelanggan meminta dilayani admin]")
        .map((m: any): ChatMessage => {
          if (m.pengirim === "user") return { id: m.id, role: "user", content: m.pesan };
          if (m.pengirim === "admin") return { id: m.id, role: "admin", content: m.pesan };
          if (m.pesan === "[Pelanggan meminta dilayani admin]") return { id: m.id, role: "system", content: "Permintaan Anda sudah dikirim ke admin. Mohon tunggu sebentar." };
          return { id: m.id, role: "assistant", content: m.pesan };
        });

      if (serverMsgs.length > 0) {
        setMessages([WELCOME_MSG, ...serverMsgs]);
        if (data.messages?.length > 0) {
          lastSeenRef.current = data.messages[data.messages.length - 1].createdAt;
        }
      }

      // Badge: jika ada balasan admin yang belum dilihat & chat tertutup
      const hasAdminMsg = serverMsgs.some((m) => m.role === "admin");
      if (hasAdminMsg && !isOpen && finalStatus === "admin") {
        setHasUnread(true);
        soundNewMessage();
      }
    } catch {}
    setHistoryLoaded(true);
    if (!silent) setHistoryLoading(false);
  }, [sessionId, isOpen]);

  // Load history once on mount
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // ── Polling for new messages & status ───────────────────────────────
  useEffect(() => {
    if (!historyLoaded) return;
    const shouldPoll = isOpen || status === "admin" || status === "menunggu_admin";
    if (!shouldPoll) return;

    const tick = async () => {
      try {
        const url =
          `${API_BASE}/api/chat/messages?sessionId=${encodeURIComponent(sessionId)}` +
          (lastSeenRef.current ? `&after=${encodeURIComponent(lastSeenRef.current)}` : "");
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();

        const newStatus = data.status as SessionStatus | undefined;
        const oldStatus = prevStatusRef.current;

        if (newStatus && newStatus !== oldStatus) {
          prevStatusRef.current = newStatus;
          const finalStatus = newStatus === "selesai" ? "ai" : newStatus;
          setStatus(finalStatus);
          if (
            (oldStatus === "admin" || oldStatus === "menunggu_admin") &&
            (newStatus === "ai" || newStatus === "selesai")
          ) {
            setMessages((prev) => [
              ...prev,
              {
                role: "system",
                content:
                  newStatus === "selesai"
                    ? "Chat dengan admin telah selesai. Terima kasih sudah menghubungi kami! Asisten AI siap membantu Anda kembali."
                    : "Admin telah mengalihkan percakapan kembali ke asisten AI. Silakan lanjutkan bertanya.",
              },
            ]);
          }
          // Status jadi admin sementara chat tertutup → nyalakan badge + suara
          if (newStatus === "admin" && !isOpen) {
            setHasUnread(true);
            soundStatusUpdate();
          }
        } else if (newStatus) {
          setStatus((prev) => (prev === newStatus ? prev : (newStatus === "selesai" ? "ai" : newStatus)));
        }

        const newOnes: ChatMessage[] = (data.messages ?? [])
          .filter((m: any) => m.pengirim === "admin")
          .map((m: any) => ({ id: m.id, role: "admin" as const, content: m.pesan }));
        if ((data.messages ?? []).length > 0) {
          lastSeenRef.current = data.messages[data.messages.length - 1].createdAt;
        }
        if (newOnes.length > 0) {
          setMessages((prev) => {
            const seenIds = new Set(prev.filter((p) => p.id).map((p) => p.id));
            const additions = newOnes.filter((n) => !n.id || !seenIds.has(n.id));
            if (additions.length && !isOpen) {
              setHasUnread(true);
              soundNewMessage();
            }
            return additions.length ? [...prev, ...additions] : prev;
          });
        }
      } catch {}
    };

    tick();
    const t = setInterval(tick, 3000);
    return () => clearInterval(t);
  }, [isOpen, sessionId, status, historyLoaded]);

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  // ── Submit message to AI ─────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || pending) return;
    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setPending(true);
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 30_000);
      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          message: userMessage,
          history: messages
            .filter((m) => m.role !== "admin" && m.role !== "system")
            .slice(-12)
            .map((m) => ({ role: m.role === "admin" ? "assistant" : m.role, content: m.content })),
        }),
        signal: ctrl.signal,
      });
      clearTimeout(timeout);
      const data = await res.json();
      if (data.status) {
        const s = data.status as SessionStatus;
        setStatus(s === "selesai" ? "ai" : s);
        prevStatusRef.current = s === "selesai" ? "ai" : s;
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply ?? "Maaf, terjadi kesalahan." },
      ]);
    } catch (err: any) {
      const isTimeout = err?.name === "AbortError";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: isTimeout
            ? "Maaf, AI membutuhkan waktu terlalu lama. Silakan coba lagi atau hubungi admin langsung."
            : "Maaf, terjadi kesalahan. Silakan coba lagi.",
        },
      ]);
    }
    setPending(false);
  };

  // ── Submit message to admin (when admin-mode) ────────────────────────
  const handleAdminMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || pending) return;
    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setPending(true);
    try {
      await fetch(`${API_BASE}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: userMessage, history: [] }),
      });
    } catch {}
    setPending(false);
  };

  // ── Request admin handoff ─────────────────────────────────────────────
  const requestAdmin = async () => {
    if (requestingAdmin || status === "menunggu_admin" || status === "admin") return;
    setRequestingAdmin(true);
    try {
      await fetch(`${API_BASE}/api/chat/handoff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      setStatus("menunggu_admin");
      prevStatusRef.current = "menunggu_admin";
      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          content:
            "Permintaan Anda sudah dikirim ke admin. Mohon tunggu sebentar, admin akan segera membalas Anda di chat ini.",
        },
      ]);
    } catch {}
    setRequestingAdmin(false);
  };

  // ── Drag handlers (mobile only) ──────────────────────────────────────
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (!mobile || isOpen) return;
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, btnX: mobilePos.x, btnFromBottom: mobilePos.y, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [mobile, isOpen, mobilePos]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) dragRef.current.moved = true;
    if (dragRef.current.moved) {
      // drag down (dy > 0) → fromBottom decreases; drag up (dy < 0) → fromBottom increases
      const clamped = clampPos(dragRef.current.btnX + dx, dragRef.current.btnFromBottom - dy);
      setMobilePos(clamped);
      try { localStorage.setItem(MOBILE_BTN_POS_KEY, JSON.stringify(clamped)); } catch {}
    }
  }, []);

  const onPointerUp = useCallback(() => {
    const moved = dragRef.current?.moved ?? false;
    dragRef.current = null;
    if (!moved) { unlockAudio(); setIsOpen(true); setHasUnread(false); }
  }, []);

  const onMobileClickFallback = useCallback(() => {
    if (!dragRef.current) { unlockAudio(); setIsOpen(true); setHasUnread(false); }
  }, []);

  const onDesktopClick = useCallback(() => { unlockAudio(); setIsOpen(true); setHasUnread(false); }, []);

  // ── Styles ───────────────────────────────────────────────────────────
  const btnStyle: React.CSSProperties = mobile
    ? { position: "fixed", left: mobilePos.x, bottom: mobilePos.y, right: "auto", top: "auto", zIndex: 9998, width: 56, height: 56, borderRadius: "50%", touchAction: "none", transform: "translateZ(0)", willChange: "transform" }
    : { position: "fixed", right: 24, bottom: 24, left: "auto", top: "auto", zIndex: 9998, width: 56, height: 56, borderRadius: "50%", transform: "translateZ(0)" };

  const chatWindowStyle: React.CSSProperties = mobile
    ? { position: "fixed", left: 8, right: 8, bottom: 16, top: "auto", width: "auto", height: "min(520px, calc(100dvh - 80px))", maxHeight: "calc(100dvh - 80px)", zIndex: 9999 }
    : { position: "fixed", right: 24, bottom: 24, left: "auto", top: "auto", width: 384, height: 520, maxHeight: "calc(100vh - 48px)", zIndex: 9999 };

  const statusBanner =
    status === "menunggu_admin"
      ? { text: "Menunggu admin membalas...", cls: "bg-amber-500/10 text-amber-700" }
      : status === "admin"
      ? { text: "Anda terhubung dengan admin", cls: "bg-emerald-500/10 text-emerald-700" }
      : null;

  return (
    <>
      {/* Floating button */}
      <div
        style={{ ...btnStyle }}
        className={`transition-transform duration-200 ${isOpen ? "scale-0 pointer-events-none" : "scale-100"}`}
      >
        <button
          style={{ width: "100%", height: "100%", borderRadius: "50%", touchAction: "none" }}
          className="bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center relative"
          {...(mobile
            ? { onPointerDown, onPointerMove, onPointerUp, onClick: onMobileClickFallback }
            : { onClick: onDesktopClick })}
          aria-label="Buka chat asisten"
        >
          <MessageCircle size={26} />
          {/* Badge: unread pesan admin */}
          {hasUnread && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center" aria-label="Pesan baru">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </span>
          )}
          {/* Badge: menunggu admin (tanpa pesan baru) */}
          {!hasUnread && (status === "menunggu_admin" || status === "admin") && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center" aria-label="Sesi aktif">
              <span className={`relative inline-flex rounded-full h-3 w-3 ${status === "admin" ? "bg-emerald-500" : "bg-amber-500"}`} />
            </span>
          )}
        </button>
      </div>

      {/* Chat window */}
      <div
        className={`bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right ${
          isOpen ? "scale-100 opacity-100" : "scale-0 opacity-0 pointer-events-none"
        }`}
        style={chatWindowStyle}
      >
        {/* Header */}
        <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {status === "admin" ? <ShieldCheck size={20} /> : <Bot size={20} />}
            <h3 className="font-medium">
              {status === "admin" ? "Chat dengan Admin" : "Asisten AideaCreative"}
            </h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => loadHistory(true)}
              className="text-primary-foreground/70 hover:text-primary-foreground transition-colors p-1"
              title="Muat ulang riwayat"
            >
              <RefreshCw size={15} />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="text-primary-foreground/80 hover:text-primary-foreground transition-colors p-1"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Status banner */}
        {statusBanner && (
          <div className={`text-xs px-4 py-2 ${statusBanner.cls} flex items-center gap-2 shrink-0`}>
            {status === "menunggu_admin" && <Loader2 size={12} className="animate-spin" />}
            {statusBanner.text}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/30">
          {historyLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
              <Loader2 size={20} className="animate-spin" />
              <p className="text-xs">Memuat riwayat chat...</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              if (msg.role === "system") {
                return (
                  <div key={idx} className="flex justify-center">
                    <div className="flex items-start gap-1.5 max-w-[90%] bg-muted/60 border border-border/60 rounded-xl px-3 py-2">
                      <Info size={12} className="text-muted-foreground mt-0.5 shrink-0" />
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                );
              }
              return (
                <div key={msg.id ?? idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : msg.role === "admin"
                        ? "bg-emerald-500/10 border border-emerald-500/20 text-foreground rounded-bl-sm"
                        : "bg-card border border-border text-foreground rounded-bl-sm"
                    }`}
                  >
                    {msg.role === "admin" && (
                      <p className="text-[10px] uppercase tracking-wider text-emerald-700 font-semibold mb-0.5">
                        Admin
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              );
            })
          )}
          {pending && (
            <div className="flex justify-start">
              <div className="bg-card border border-border text-foreground rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Mengetik...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="p-3 border-t border-border bg-card space-y-2 shrink-0">
          {status !== "admin" && status !== "menunggu_admin" && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={requestAdmin}
              disabled={requestingAdmin}
              className="w-full text-xs"
            >
              {requestingAdmin ? (
                <Loader2 size={14} className="animate-spin mr-1" />
              ) : (
                <UserPlus size={14} className="mr-1" />
              )}
              Bicara dengan Admin
            </Button>
          )}
          <form
            onSubmit={status === "admin" ? handleAdminMessage : handleSubmit}
            className="flex items-center gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                status === "admin"
                  ? "Tulis pesan ke admin..."
                  : status === "menunggu_admin"
                  ? "Menunggu admin membalas..."
                  : "Tanya tentang paket foto..."
              }
              className="flex-1"
              disabled={pending || status === "menunggu_admin"}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || pending || status === "menunggu_admin"}
            >
              <Send size={18} />
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
