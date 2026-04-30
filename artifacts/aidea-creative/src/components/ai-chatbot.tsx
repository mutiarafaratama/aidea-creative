import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, Loader2, ShieldCheck, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const SESSION_KEY = "aidea_chat_session_v1";

type ChatMessage = { id?: string; role: "user" | "assistant" | "admin"; content: string };
type SessionStatus = "ai" | "menunggu_admin" | "admin" | "selesai";

function newSessionId() {
  return `web-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
    { role: "assistant", content: "Halo! Saya asisten AI AideaCreative. Ada yang bisa saya bantu? Jika butuh bantuan langsung dari tim, klik tombol \"Bicara dengan Admin\" di bawah." },
  ]);
  const [status, setStatus] = useState<SessionStatus>("ai");
  const [pending, setPending] = useState(false);
  const [requestingAdmin, setRequestingAdmin] = useState(false);
  const lastSeenRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => { if (isOpen) scrollToBottom(); }, [messages, isOpen]);

  // Poll for new admin / bot messages every 5s when chat is open OR session is admin/menunggu_admin
  useEffect(() => {
    const shouldPoll = isOpen || status === "admin" || status === "menunggu_admin";
    if (!shouldPoll) return;
    const tick = async () => {
      try {
        const url = `${API_BASE}/api/chat/messages?sessionId=${encodeURIComponent(sessionId)}${lastSeenRef.current ? `&after=${encodeURIComponent(lastSeenRef.current)}` : ""}`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status) setStatus(data.status as SessionStatus);
        const newOnes: ChatMessage[] = (data.messages ?? [])
          .filter((m: any) => m.pengirim === "admin" || (lastSeenRef.current && m.pengirim === "bot"))
          .map((m: any) => ({
            id: m.id,
            role: m.pengirim === "admin" ? "admin" : m.pengirim === "user" ? "user" : "assistant",
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
          history: messages.filter((m) => m.role !== "admin").map((m) => ({ role: m.role === "admin" ? "assistant" : m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (data.status) setStatus(data.status as SessionStatus);
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply ?? "Maaf, terjadi kesalahan." }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Maaf, terjadi kesalahan. Silakan coba lagi." }]);
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
      setMessages((prev) => [
        ...prev,
        { role: "user", content: "[Saya ingin bicara dengan admin]" },
        { role: "assistant", content: "Permintaan Anda sudah dikirim ke admin. Mohon tunggu sebentar, admin akan segera membalas Anda di chat ini." },
      ]);
    } catch {}
    setRequestingAdmin(false);
  };

  const statusBanner = status === "menunggu_admin"
    ? { text: "Menunggu admin...", cls: "bg-amber-500/10 text-amber-700" }
    : status === "admin"
    ? { text: "Anda terhubung dengan admin", cls: "bg-emerald-500/10 text-emerald-700" }
    : null;

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg p-0 z-50 ${isOpen ? 'scale-0' : 'scale-100'} transition-transform duration-200`}
      >
        <MessageCircle size={28} />
      </Button>

      <div
        className={`fixed bottom-6 right-6 w-80 sm:w-96 bg-card border border-border rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right ${
          isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'
        }`}
        style={{ height: '520px', maxHeight: 'calc(100vh - 48px)' }}
      >
        <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {status === "admin" ? <ShieldCheck size={20} /> : <Bot size={20} />}
            <h3 className="font-medium">{status === "admin" ? "Chat dengan Admin" : "Asisten AideaCreative"}</h3>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
            <X size={20} />
          </button>
        </div>

        {statusBanner && (
          <div className={`text-xs px-4 py-2 ${statusBanner.cls} flex items-center gap-2`}>
            {status === "menunggu_admin" && <Loader2 size={12} className="animate-spin" />}
            {statusBanner.text}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/30">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-sm'
                : msg.role === 'admin' ? 'bg-emerald-500/10 border border-emerald-500/20 text-foreground rounded-bl-sm'
                : 'bg-card border border-border text-foreground rounded-bl-sm'
              }`}>
                {msg.role === "admin" && <p className="text-[10px] uppercase tracking-wider text-emerald-700 font-semibold mb-0.5">Admin</p>}
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
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

        <div className="p-3 border-t border-border bg-card space-y-2">
          {status !== "admin" && status !== "menunggu_admin" && (
            <Button type="button" size="sm" variant="outline" onClick={requestAdmin} disabled={requestingAdmin} className="w-full text-xs">
              {requestingAdmin ? <Loader2 size={14} className="animate-spin mr-1" /> : <UserPlus size={14} className="mr-1" />}
              Bicara dengan Admin
            </Button>
          )}
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={status === "admin" ? "Tulis pesan ke admin..." : "Tanya tentang paket foto..."}
              className="flex-1"
              disabled={pending}
            />
            <Button type="submit" size="icon" disabled={!input.trim() || pending}>
              <Send size={18} />
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
