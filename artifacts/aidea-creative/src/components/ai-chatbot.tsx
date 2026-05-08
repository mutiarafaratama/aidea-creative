import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, Loader2, ShieldCheck, UserPlus, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const SESSION_KEY = "aidea_chat_session_v1";
const BTN_POS_KEY = "aidea_chat_btn_pos";

type ChatMessage = {
  id?: string;
  role: "user" | "assistant" | "admin" | "system";
  content: string;
};
type SessionStatus = "ai" | "menunggu_admin" | "admin" | "selesai";

function newSessionId() {
  return `web-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function clampPos(x: number, y: number): { x: number; y: number } {
  const maxX = Math.max(8, window.innerWidth - 64);
  const maxY = Math.max(8, window.innerHeight - 64);
  return {
    x: Math.max(8, Math.min(maxX, x)),
    y: Math.max(8, Math.min(maxY, y)),
  };
}

function loadSavedPos(): { x: number; y: number } | null {
  try {
    const s = localStorage.getItem(BTN_POS_KEY);
    if (s) {
      const parsed = JSON.parse(s);
      return clampPos(parsed.x, parsed.y);
    }
  } catch {}
  return null;
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
  const lastSeenRef = useRef<string | null>(null);
  const prevStatusRef = useRef<SessionStatus>("ai");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [btnPos, setBtnPos] = useState<{ x: number; y: number } | null>(loadSavedPos);
  const dragInfoRef = useRef<{
    startX: number;
    startY: number;
    btnX: number;
    btnY: number;
    moved: boolean;
  } | null>(null);

  const isMobile = () => window.innerWidth < 640;

  const getDefaultPos = () => ({
    x: window.innerWidth - 80,
    y: window.innerHeight - 80,
  });

  const getCurrentPos = () => btnPos ?? getDefaultPos();

  useEffect(() => {
    const handleResize = () => {
      setBtnPos((prev) => {
        if (!prev) return null;
        return clampPos(prev.x, prev.y);
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const onBtnPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (isOpen) return;
    e.preventDefault();
    const pos = getCurrentPos();
    dragInfoRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      btnX: pos.x,
      btnY: pos.y,
      moved: false,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onBtnPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragInfoRef.current) return;
    const dx = e.clientX - dragInfoRef.current.startX;
    const dy = e.clientY - dragInfoRef.current.startY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) dragInfoRef.current.moved = true;
    if (dragInfoRef.current.moved) {
      const { x, y } = clampPos(
        dragInfoRef.current.btnX + dx,
        dragInfoRef.current.btnY + dy
      );
      setBtnPos({ x, y });
      try {
        localStorage.setItem(BTN_POS_KEY, JSON.stringify({ x, y }));
      } catch {}
    }
  };

  const onBtnPointerUp = () => {
    const moved = dragInfoRef.current?.moved ?? false;
    dragInfoRef.current = null;
    if (!moved) setIsOpen(true);
  };

  const btnStyle: React.CSSProperties = btnPos
    ? { position: "fixed", left: btnPos.x, top: btnPos.y, right: "auto", bottom: "auto" }
    : { position: "fixed", right: 24, bottom: 24 };

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

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
          .map((m: any) => ({
            id: m.id,
            role: "admin" as const,
            content: m.pesan,
          }));
        if ((data.messages ?? []).length > 0) {
          lastSeenRef.current = data.messages[data.messages.length - 1].createdAt;
        }
        if (newOnes.length > 0) {
          setMessages((prev) => {
            const seenIds = new Set(prev.filter((p) => p.id).map((p) => p.id));
            const additions = newOnes.filter((n) => !n.id || !seenIds.has(n.id));
            return additions.length ? [...prev, ...additions] : prev;
          });
        }
      } catch {}
    };

    tick();
    const t = setInterval(tick, 5000);
    return () => clearInterval(t);
  }, [isOpen, sessionId, status]);

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
            .map((m) => ({
              role: m.role === "admin" ? "assistant" : m.role,
              content: m.content,
            })),
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

  const chatWindowStyle: React.CSSProperties = isMobile()
    ? {
        position: "fixed",
        left: 8,
        right: 8,
        bottom: 16,
        top: "auto",
        width: "auto",
        height: "min(520px, calc(100dvh - 80px))",
        maxHeight: "calc(100dvh - 80px)",
      }
    : {
        position: "fixed",
        right: 24,
        bottom: 24,
        width: 384,
        height: 520,
        maxHeight: "calc(100vh - 48px)",
      };

  return (
    <>
      <button
        style={{
          ...btnStyle,
          zIndex: 50,
          width: 56,
          height: 56,
          borderRadius: "50%",
          touchAction: "none",
        }}
        className={`bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center ${
          isOpen ? "scale-0 pointer-events-none" : "scale-100"
        } transition-transform duration-200`}
        onPointerDown={onBtnPointerDown}
        onPointerMove={onBtnPointerMove}
        onPointerUp={onBtnPointerUp}
        aria-label="Buka chat asisten"
      >
        <MessageCircle size={26} />
      </button>

      <div
        className={`bg-card border border-border rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right ${
          isOpen ? "scale-100 opacity-100" : "scale-0 opacity-0 pointer-events-none"
        }`}
        style={{ ...chatWindowStyle, zIndex: 50 }}
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
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
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
