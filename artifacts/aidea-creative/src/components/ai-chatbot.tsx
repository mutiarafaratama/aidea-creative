import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Bot, Loader2, ShieldCheck, UserPlus, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const SESSION_KEY = "aidea_chat_session_v1";
const MOBILE_BTN_POS_KEY = "aidea_chat_btn_pos_mobile";

type ChatMessage = {
  id?: string;
  role: "user" | "assistant" | "admin" | "system";
  content: string;
};
type SessionStatus = "ai" | "menunggu_admin" | "admin" | "selesai";

function newSessionId() {
  return `web-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function clampPos(x: number, y: number, btnSize = 56): { x: number; y: number } {
  if (typeof window === "undefined") return { x, y };
  return {
    x: Math.max(8, Math.min(window.innerWidth - btnSize - 8, x)),
    y: Math.max(8, Math.min(window.innerHeight - btnSize - 8, y)),
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
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        'Halo! Saya asisten AI AideaCreative. Ada yang bisa saya bantu? Jika butuh bantuan langsung dari tim, klik tombol "Bicara dengan Admin" di bawah.',
    },
  ]);
  const [status, setStatus] = useState<SessionStatus>("ai");
  const [pending, setPending] = useState(false);
  const [requestingAdmin, setRequestingAdmin] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const lastSeenRef = useRef<string | null>(null);
  const prevStatusRef = useRef<SessionStatus>("ai");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Separate mobile drag state from desktop fixed position
  const [mobile, setMobile] = useState(() => isMobile());
  const [mobilePos, setMobilePos] = useState<{ x: number; y: number }>(() => {
    const saved = loadMobilePos();
    if (saved) return saved;
    if (typeof window !== "undefined") {
      return { x: window.innerWidth - 80, y: window.innerHeight - 80 };
    }
    return { x: 320, y: 600 };
  });

  const dragRef = useRef<{
    startX: number;
    startY: number;
    btnX: number;
    btnY: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    const onResize = () => {
      const nowMobile = isMobile();
      setMobile(nowMobile);
      if (nowMobile) {
        setMobilePos((prev) => clampPos(prev.x, prev.y));
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // --- Drag handlers (mobile only) ---
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (!mobile || isOpen) return;
    e.preventDefault();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      btnX: mobilePos.x,
      btnY: mobilePos.y,
      moved: false,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [mobile, isOpen, mobilePos]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) dragRef.current.moved = true;
    if (dragRef.current.moved) {
      const clamped = clampPos(dragRef.current.btnX + dx, dragRef.current.btnY + dy);
      setMobilePos(clamped);
      try {
        localStorage.setItem(MOBILE_BTN_POS_KEY, JSON.stringify(clamped));
      } catch {}
    }
  }, []);

  const onPointerUp = useCallback(() => {
    const moved = dragRef.current?.moved ?? false;
    dragRef.current = null;
    if (!moved) {
      setIsOpen(true);
      setHasUnread(false);
    }
  }, []);

  // Desktop: always click to open, no drag
  const onDesktopClick = useCallback(() => {
    setIsOpen(true);
    setHasUnread(false);
  }, []);

  // Button position style
  const btnStyle: React.CSSProperties = mobile
    ? {
        position: "fixed",
        left: mobilePos.x,
        top: mobilePos.y,
        right: "auto",
        bottom: "auto",
        zIndex: 9998,
        width: 56,
        height: 56,
        borderRadius: "50%",
        touchAction: "none",
      }
    : {
        position: "fixed",
        right: 24,
        bottom: 24,
        left: "auto",
        top: "auto",
        zIndex: 9998,
        width: 56,
        height: 56,
        borderRadius: "50%",
      };

  // Chat window position style
  const chatWindowStyle: React.CSSProperties = mobile
    ? {
        position: "fixed",
        left: 8,
        right: 8,
        bottom: 16,
        top: "auto",
        width: "auto",
        height: "min(520px, calc(100dvh - 80px))",
        maxHeight: "calc(100dvh - 80px)",
        zIndex: 9999,
      }
    : {
        position: "fixed",
        right: 24,
        bottom: 24,
        left: "auto",
        top: "auto",
        width: 384,
        height: 520,
        maxHeight: "calc(100vh - 48px)",
        zIndex: 9999,
      };

  // --- Polling for admin messages ---
  useEffect(() => {
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
          setStatus(newStatus);
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
            if (newStatus === "selesai") setStatus("ai");
          }
        } else if (newStatus) {
          setStatus(newStatus);
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
            if (additions.length && !isOpen) setHasUnread(true);
            return additions.length ? [...prev, ...additions] : prev;
          });
        }
      } catch {}
    };

    tick();
    const t = setInterval(tick, 5000);
    return () => clearInterval(t);
  }, [isOpen, sessionId, status]);

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || pending) return;
    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setPending(true);
    try {
      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          message: userMessage,
          history: messages
            .filter((m) => m.role !== "admin" && m.role !== "system")
            .map((m) => ({ role: m.role === "admin" ? "assistant" : m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (data.status) setStatus(data.status as SessionStatus);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply ?? "Maaf, terjadi kesalahan." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Maaf, terjadi kesalahan. Silakan coba lagi." },
      ]);
    }
    setPending(false);
  };

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

  const statusBanner =
    status === "menunggu_admin"
      ? { text: "Menunggu admin...", cls: "bg-amber-500/10 text-amber-700" }
      : status === "admin"
      ? { text: "Anda terhubung dengan admin", cls: "bg-emerald-500/10 text-emerald-700" }
      : null;

  return (
    <>
      {/* Floating button */}
      <div
        style={{ ...btnStyle, width: btnStyle.width, height: btnStyle.height }}
        className={`transition-transform duration-200 ${isOpen ? "scale-0 pointer-events-none" : "scale-100"}`}
      >
        <button
          style={{ width: "100%", height: "100%", borderRadius: "50%", touchAction: "none" }}
          className="bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center relative"
          {...(mobile
            ? { onPointerDown, onPointerMove, onPointerUp }
            : { onClick: onDesktopClick })}
          aria-label="Buka chat asisten"
        >
          <MessageCircle size={26} />
          {hasUnread && (
            <span
              className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center"
              aria-label="Pesan baru"
            >
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
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
          <button
            onClick={() => setIsOpen(false)}
            className="text-primary-foreground/80 hover:text-primary-foreground transition-colors p-1"
          >
            <X size={20} />
          </button>
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
          {messages.map((msg, idx) => {
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
              <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
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
          })}
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
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
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
