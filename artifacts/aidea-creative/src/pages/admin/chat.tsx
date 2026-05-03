import { useCallback, useEffect, useRef, useState } from "react";
import { MessagesSquare, User, Bot, RefreshCw, Send, Plus, Pencil, Trash2, ShieldCheck, Sparkles, BookOpen, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { adminFetch } from "@/lib/admin-api";

type Session = {
  sessionId: string;
  lastAt: string;
  messageCount: number;
  lastMessage: string;
  lastFrom: string;
  userId: string | null;
  status: "ai" | "menunggu_admin" | "admin" | "selesai";
  needsAdmin: boolean;
  namaTamu: string | null;
};
type Msg = { id: string; pesan: string; pengirim: "user" | "bot" | "admin"; createdAt: string };
type Kb = { id: string; kategori: string; pertanyaan: string; jawaban: string; keywords: string[]; prioritas: number; isAktif: boolean };

const statusBadge: Record<Session["status"], { label: string; cls: string }> = {
  ai: { label: "AI", cls: "bg-blue-500/10 text-blue-700 border-blue-500/20" },
  menunggu_admin: { label: "Menunggu Admin", cls: "bg-amber-500/10 text-amber-700 border-amber-500/20" },
  admin: { label: "Admin Aktif", cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" },
  selesai: { label: "Selesai", cls: "bg-muted text-muted-foreground" },
};

function InboxTab() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<string | null>(null);
  activeRef.current = active;

  const fetchSessions = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const res = await adminFetch<Session[]>("/admin/chat/sessions");
      setSessions(Array.isArray(res) ? res : []);
    } catch { /* silent */ }
    if (showLoader) setLoading(false);
  }, []);

  const fetchMsgs = useCallback(async (id: string, scrollToBottom = false) => {
    try {
      const res = await adminFetch<{ session: Session; messages: Msg[] }>(`/admin/chat/sessions/${id}`);
      setMsgs(res.messages ?? []);
      setActiveSession(res.session ?? null);
      if (scrollToBottom) {
        setTimeout(() => scrollRef.current?.scrollTo({ top: 99999, behavior: "smooth" }), 60);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchSessions(true);
    const t = setInterval(() => fetchSessions(false), 8000);
    return () => clearInterval(t);
  }, [fetchSessions]);

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => {
      if (activeRef.current) fetchMsgs(activeRef.current, false);
    }, 5000);
    return () => clearInterval(t);
  }, [active, fetchMsgs]);

  const openSession = (id: string) => {
    setActive(id);
    setMsgs([]);
    setActiveSession(null);
    fetchMsgs(id, true);
  };

  const sendReply = async () => {
    if (!active || !reply.trim()) return;
    setSending(true);
    try {
      await adminFetch("/admin/chat/reply", { method: "POST", body: JSON.stringify({ sessionId: active, pesan: reply.trim() }) });
      setReply("");
      await fetchMsgs(active, true);
      fetchSessions(false);
    } catch (err: any) {
      toast({ title: "Gagal mengirim", description: err?.message, variant: "destructive" });
    }
    setSending(false);
  };

  const setStatus = async (status: Session["status"]) => {
    if (!active) return;
    try {
      await adminFetch(`/admin/chat/sessions/${active}`, { method: "PATCH", body: JSON.stringify({ status }) });
      fetchMsgs(active, false);
      fetchSessions(false);
    } catch (err: any) {
      toast({ title: "Gagal", description: err?.message, variant: "destructive" });
    }
  };

  const pendingCount = sessions.filter((s) => s.status === "menunggu_admin").length;

  return (
    <div className="flex gap-0 border rounded-xl overflow-hidden bg-card" style={{ height: "calc(100vh - 220px)", minHeight: 480 }}>
      {/* Sidebar — session list */}
      <div className="w-[260px] shrink-0 flex flex-col border-r">
        <div className="flex items-center justify-between px-3 py-2.5 border-b bg-muted/40 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold">Percakapan</span>
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{sessions.length}</Badge>
            {pendingCount > 0 && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/20 text-[10px] h-4 px-1.5">
                {pendingCount} baru
              </Badge>
            )}
          </div>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => fetchSessions(true)}>
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
        <div className="overflow-y-auto flex-1 divide-y">
          {loading ? (
            <div className="p-3 space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
            </div>
          ) : sessions.length === 0 ? (
            <p className="p-4 text-center text-xs text-muted-foreground">Belum ada percakapan.</p>
          ) : sessions.map((s) => {
            const sb = statusBadge[s.status];
            const preview = s.lastFrom === "user" ? s.lastMessage : null;
            return (
              <button
                key={s.sessionId}
                onClick={() => openSession(s.sessionId)}
                className={`w-full text-left px-3 py-2.5 hover:bg-muted/60 transition-colors ${active === s.sessionId ? "bg-muted" : ""}`}
              >
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <p className="text-xs font-semibold truncate">{s.namaTamu ?? `Tamu ${s.sessionId.slice(0, 6)}`}</p>
                  <Badge variant="outline" className={`text-[9px] shrink-0 px-1 py-0 h-4 ${sb.cls}`}>{sb.label}</Badge>
                </div>
                {preview ? (
                  <p className="text-[11px] text-muted-foreground line-clamp-1">{preview}</p>
                ) : (
                  <p className="text-[11px] text-muted-foreground/50 italic line-clamp-1">AI membalas...</p>
                )}
                <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                  {formatDistanceToNow(new Date(s.lastAt), { locale: idLocale, addSuffix: true })}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!active ? (
          <div className="flex flex-col items-center justify-center flex-1 text-center text-muted-foreground">
            <MessagesSquare className="h-10 w-10 mb-3 opacity-20" />
            <p className="text-sm">Pilih percakapan di sebelah kiri.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-4 py-2.5 border-b flex items-center justify-between shrink-0 bg-muted/20">
              <div>
                <p className="font-semibold text-sm">{activeSession?.namaTamu ?? "Tamu"}</p>
                <p className="font-mono text-[10px] text-muted-foreground">{active}</p>
              </div>
              <Select value={activeSession?.status ?? "ai"} onValueChange={(v) => setStatus(v as Session["status"])}>
                <SelectTrigger className="w-38 h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ai">AI Aktif</SelectItem>
                  <SelectItem value="menunggu_admin">Menunggu Admin</SelectItem>
                  <SelectItem value="admin">Admin Aktif</SelectItem>
                  <SelectItem value="selesai">Selesai</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {msgs.length === 0 ? (
                <div className="flex justify-center py-8">
                  <Skeleton className="h-4 w-24" />
                </div>
              ) : msgs.map((m) => (
                <div key={m.id} className={`flex gap-2 ${m.pengirim === "user" ? "justify-end" : "justify-start"}`}>
                  {m.pengirim === "bot" && (
                    <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="h-3.5 w-3.5" />
                    </div>
                  )}
                  {m.pengirim === "admin" && (
                    <div className="h-6 w-6 rounded-full bg-emerald-500/10 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                      <ShieldCheck className="h-3.5 w-3.5" />
                    </div>
                  )}
                  <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${
                    m.pengirim === "user" ? "bg-foreground text-background"
                    : m.pengirim === "admin" ? "bg-emerald-500/10 border border-emerald-500/20"
                    : "bg-muted"
                  }`}>
                    <p className="whitespace-pre-wrap">{m.pesan}</p>
                    <p className={`text-[10px] mt-0.5 ${m.pengirim === "user" ? "text-background/50" : "text-muted-foreground"}`}>
                      {new Date(m.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  {m.pengirim === "user" && (
                    <div className="h-6 w-6 rounded-full bg-foreground text-background flex items-center justify-center shrink-0 mt-0.5">
                      <User className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Reply box */}
            <div className="px-4 py-3 border-t bg-card shrink-0">
              <form onSubmit={(e) => { e.preventDefault(); sendReply(); }} className="flex gap-2">
                <Input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Balas sebagai admin..."
                  disabled={sending}
                  className="text-sm"
                />
                <Button type="submit" disabled={!reply.trim() || sending} className="shrink-0">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
              <p className="text-[10px] text-muted-foreground mt-1.5">
                Membalas otomatis mengubah status ke "Admin Aktif" — AI berhenti merespons.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function KbTab() {
  const { toast } = useToast();
  const [items, setItems] = useState<Kb[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Kb | null>(null);
  const [form, setForm] = useState<Partial<Kb>>({ kategori: "umum", pertanyaan: "", jawaban: "", keywords: [], prioritas: 0, isAktif: true });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch<Kb[]>("/admin/kb");
      setItems(Array.isArray(res) ? res : []);
    } catch (err: any) { toast({ title: "Gagal memuat KB", description: err?.message, variant: "destructive" }); }
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditing(null);
    setForm({ kategori: "umum", pertanyaan: "", jawaban: "", keywords: [], prioritas: 0, isAktif: true });
    setOpen(true);
  };
  const openEdit = (k: Kb) => { setEditing(k); setForm({ ...k }); setOpen(true); };

  const save = async () => {
    const payload = {
      ...form,
      keywords: Array.isArray(form.keywords)
        ? form.keywords
        : String(form.keywords ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    };
    try {
      if (editing) await adminFetch(`/admin/kb/${editing.id}`, { method: "PUT", body: JSON.stringify(payload) });
      else await adminFetch("/admin/kb", { method: "POST", body: JSON.stringify(payload) });
      toast({ title: editing ? "Topik diperbarui" : "Topik ditambahkan" });
      setOpen(false);
      load();
    } catch (err: any) { toast({ title: "Gagal menyimpan", description: err?.message, variant: "destructive" }); }
  };

  const remove = async (id: string) => {
    if (!confirm("Hapus topik ini?")) return;
    try {
      await adminFetch(`/admin/kb/${id}`, { method: "DELETE" });
      toast({ title: "Topik dihapus" });
      load();
    } catch (err: any) { toast({ title: "Gagal menghapus", description: err?.message, variant: "destructive" }); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-muted-foreground max-w-xl">
          Topik di bawah disertakan ke prompt AI untuk meningkatkan akurasi jawaban. Tambahkan FAQ yang paling sering ditanyakan pelanggan.
        </p>
        <Button onClick={openNew} className="shrink-0"><Plus className="h-4 w-4 mr-1" /> Tambah Topik</Button>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : items.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">
          <Sparkles className="h-8 w-8 mx-auto mb-3 opacity-40" />
          <p>Belum ada topik. Tambahkan FAQ pertama Anda agar AI lebih pintar.</p>
        </CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {items.map((k) => (
            <Card key={k.id} className={!k.isAktif ? "opacity-50" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex gap-2 items-center flex-wrap">
                    <Badge variant="outline" className="text-[10px]">{k.kategori}</Badge>
                    {!k.isAktif && <Badge variant="outline" className="text-[10px]">Nonaktif</Badge>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(k)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:text-red-600" onClick={() => remove(k.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                <p className="font-semibold text-sm mb-1">Q: {k.pertanyaan}</p>
                <p className="text-sm text-muted-foreground line-clamp-3">A: {k.jawaban}</p>
                {k.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {k.keywords.map((kw, i) => <Badge key={i} variant="outline" className="text-[10px]">{kw}</Badge>)}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Topik" : "Tambah Topik KB"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Kategori</Label>
              <Input value={form.kategori ?? ""} onChange={(e) => setForm({ ...form, kategori: e.target.value })} placeholder="harga, paket, lokasi, pembayaran..." />
            </div>
            <div className="space-y-1.5">
              <Label>Pertanyaan</Label>
              <Input value={form.pertanyaan ?? ""} onChange={(e) => setForm({ ...form, pertanyaan: e.target.value })} placeholder="Berapa biaya paket prewedding?" />
            </div>
            <div className="space-y-1.5">
              <Label>Jawaban</Label>
              <Textarea rows={4} value={form.jawaban ?? ""} onChange={(e) => setForm({ ...form, jawaban: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Keywords (pisah koma)</Label>
              <Input
                value={Array.isArray(form.keywords) ? form.keywords.join(", ") : (form.keywords as any) ?? ""}
                onChange={(e) => setForm({ ...form, keywords: e.target.value as any })}
                placeholder="prewedding, harga, paket"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Prioritas</Label>
                <Input type="number" value={form.prioritas ?? 0} onChange={(e) => setForm({ ...form, prioritas: Number(e.target.value) })} />
              </div>
              <label className="flex items-end gap-2 text-sm pb-1 cursor-pointer">
                <input type="checkbox" checked={form.isAktif !== false} onChange={(e) => setForm({ ...form, isAktif: e.target.checked })} className="h-4 w-4" />
                Aktif
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={save}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminChat() {
  return (
    <AdminLayout title="Chat AI & Inbox" subtitle="Kelola percakapan pelanggan, takeover dari AI, dan kelola Knowledge Base AI.">
      <Tabs defaultValue="inbox">
        <TabsList className="mb-4">
          <TabsTrigger value="inbox"><MessagesSquare className="h-4 w-4 mr-1" /> Inbox</TabsTrigger>
          <TabsTrigger value="kb"><BookOpen className="h-4 w-4 mr-1" /> Knowledge Base</TabsTrigger>
        </TabsList>
        <TabsContent value="inbox"><InboxTab /></TabsContent>
        <TabsContent value="kb"><KbTab /></TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
