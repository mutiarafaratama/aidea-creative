import { useEffect, useRef, useState } from "react";
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

  const loadSessions = async () => {
    setLoading(true);
    try {
      const res = await adminFetch<Session[]>("/admin/chat/sessions");
      setSessions(Array.isArray(res) ? res : []);
    } catch (err: any) { toast({ title: "Gagal", description: err?.message, variant: "destructive" }); }
    setLoading(false);
  };
  useEffect(() => { loadSessions(); }, []);

  // Auto-poll sessions list every 8s for new "menunggu_admin"
  useEffect(() => {
    const t = setInterval(() => loadSessions(), 8000);
    return () => clearInterval(t);
  }, []);

  const openSession = async (id: string) => {
    setActive(id); setMsgs([]);
    try {
      const res = await adminFetch<{ session: Session; messages: Msg[] }>(`/admin/chat/sessions/${id}`);
      setMsgs(res.messages ?? []);
      setActiveSession(res.session ?? null);
      setTimeout(() => scrollRef.current?.scrollTo({ top: 9999, behavior: "smooth" }), 50);
    } catch (err: any) { toast({ title: "Gagal", description: err?.message, variant: "destructive" }); }
  };

  // Poll messages of active session every 5s
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => openSession(active), 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const sendReply = async () => {
    if (!active || !reply.trim()) return;
    setSending(true);
    try {
      await adminFetch("/admin/chat/reply", { method: "POST", body: JSON.stringify({ sessionId: active, pesan: reply.trim() }) });
      setReply("");
      await openSession(active);
      loadSessions();
    } catch (err: any) {
      toast({ title: "Gagal mengirim", description: err?.message, variant: "destructive" });
    }
    setSending(false);
  };

  const setStatus = async (status: Session["status"]) => {
    if (!active) return;
    try {
      await adminFetch(`/admin/chat/sessions/${active}`, { method: "PATCH", body: JSON.stringify({ status }) });
      toast({ title: "Status diperbarui" });
      await openSession(active);
      loadSessions();
    } catch (err: any) {
      toast({ title: "Gagal", description: err?.message, variant: "destructive" });
    }
  };

  const pendingCount = sessions.filter((s) => s.status === "menunggu_admin").length;

  return (
    <div className="grid md:grid-cols-[340px,1fr] gap-4 min-h-[60vh]">
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between p-3 border-b">
            <div>
              <p className="font-semibold text-sm">Percakapan ({sessions.length})</p>
              {pendingCount > 0 && <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/20 mt-1 text-[10px]">{pendingCount} menunggu admin</Badge>}
            </div>
            <Button size="icon" variant="ghost" onClick={loadSessions}><RefreshCw className="h-4 w-4" /></Button>
          </div>
          <div className="max-h-[65vh] overflow-y-auto divide-y">
            {loading ? <div className="p-3 space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div> : sessions.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">Belum ada percakapan.</p>
            ) : sessions.map((s) => {
              const sb = statusBadge[s.status];
              return (
                <button key={s.sessionId} onClick={() => openSession(s.sessionId)} className={`w-full text-left p-3 hover:bg-muted transition-colors ${active === s.sessionId ? "bg-muted" : ""}`}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs truncate max-w-[150px] font-medium">{s.namaTamu ?? `Tamu ${s.sessionId.slice(0, 6)}`}</p>
                    <Badge variant="outline" className={`text-[10px] ${sb.cls}`}>{sb.label}</Badge>
                  </div>
                  <p className="text-sm line-clamp-2 text-foreground/80">{s.lastMessage}</p>
                  <div className="flex justify-between mt-1">
                    <span className="text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(s.lastAt), { locale: idLocale, addSuffix: true })}</span>
                    <span className="text-[10px] text-muted-foreground">{s.messageCount} msg</span>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 h-full">
          {!active ? (
            <div className="flex flex-col items-center justify-center h-full p-10 text-center text-muted-foreground min-h-[60vh]">
              <MessagesSquare className="h-10 w-10 mb-3 opacity-40" />
              <p>Pilih percakapan untuk membaca & membalas.</p>
            </div>
          ) : (
            <div className="flex flex-col h-full max-h-[70vh]">
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{activeSession?.namaTamu ?? "Tamu"}</p>
                  <p className="font-mono text-xs text-muted-foreground">{active}</p>
                </div>
                <Select value={activeSession?.status ?? "ai"} onValueChange={(v) => setStatus(v as Session["status"])}>
                  <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ai">AI Aktif</SelectItem>
                    <SelectItem value="menunggu_admin">Menunggu Admin</SelectItem>
                    <SelectItem value="admin">Admin Aktif</SelectItem>
                    <SelectItem value="selesai">Selesai</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {msgs.map((m) => (
                  <div key={m.id} className={`flex gap-2 ${m.pengirim === "user" ? "justify-end" : "justify-start"}`}>
                    {m.pengirim === "bot" && <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0"><Bot className="h-4 w-4" /></div>}
                    {m.pengirim === "admin" && <div className="h-7 w-7 rounded-full bg-emerald-500/10 text-emerald-700 flex items-center justify-center shrink-0"><ShieldCheck className="h-4 w-4" /></div>}
                    <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                      m.pengirim === "user" ? "bg-foreground text-background"
                      : m.pengirim === "admin" ? "bg-emerald-500/10 border border-emerald-500/20"
                      : "bg-muted"
                    }`}>
                      <p className="whitespace-pre-wrap">{m.pesan}</p>
                      <p className={`text-[10px] mt-1 ${m.pengirim === "user" ? "text-background/60" : "text-muted-foreground"}`}>{new Date(m.createdAt).toLocaleString("id-ID")}</p>
                    </div>
                    {m.pengirim === "user" && <div className="h-7 w-7 rounded-full bg-foreground text-background flex items-center justify-center shrink-0"><User className="h-4 w-4" /></div>}
                  </div>
                ))}
              </div>
              <div className="p-3 border-t bg-card">
                <form onSubmit={(e) => { e.preventDefault(); sendReply(); }} className="flex gap-2">
                  <Input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Balas sebagai admin..." disabled={sending} />
                  <Button type="submit" disabled={!reply.trim() || sending}>
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </form>
                <p className="text-[10px] text-muted-foreground mt-1">Kirim balasan akan otomatis mengubah status percakapan jadi "Admin Aktif" — AI berhenti membalas.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
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

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminFetch<Kb[]>("/admin/kb");
      setItems(Array.isArray(res) ? res : []);
    } catch (err: any) { toast({ title: "Gagal", description: err?.message, variant: "destructive" }); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ kategori: "umum", pertanyaan: "", jawaban: "", keywords: [], prioritas: 0, isAktif: true }); setOpen(true); };
  const openEdit = (k: Kb) => { setEditing(k); setForm({ ...k }); setOpen(true); };

  const save = async () => {
    const payload = { ...form, keywords: Array.isArray(form.keywords) ? form.keywords : String(form.keywords ?? "").split(",").map((s) => s.trim()).filter(Boolean) };
    try {
      if (editing) await adminFetch(`/admin/kb/${editing.id}`, { method: "PUT", body: JSON.stringify(payload) });
      else await adminFetch("/admin/kb", { method: "POST", body: JSON.stringify(payload) });
      toast({ title: editing ? "Topik diperbarui" : "Topik ditambah" });
      setOpen(false);
      load();
    } catch (err: any) { toast({ title: "Gagal", description: err?.message, variant: "destructive" }); }
  };

  const remove = async (id: string) => {
    if (!confirm("Hapus topik ini?")) return;
    try {
      await adminFetch(`/admin/kb/${id}`, { method: "DELETE" });
      toast({ title: "Dihapus" });
      load();
    } catch (err: any) { toast({ title: "Gagal", description: err?.message, variant: "destructive" }); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div className="text-sm text-muted-foreground max-w-xl">
          Topik di bawah akan otomatis disertakan ke prompt AI untuk meningkatkan akurasi jawaban. Susun pertanyaan & jawaban sesuai FAQ paling sering ditanyakan pelanggan.
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Tambah Topik</Button>
      </div>

      {loading ? <Skeleton className="h-40 w-full" /> : items.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">
          <Sparkles className="h-8 w-8 mx-auto mb-3 opacity-40" />
          <p>Belum ada topik. Tambahkan FAQ pertama Anda agar AI lebih pintar.</p>
        </CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {items.map((k) => (
            <Card key={k.id} className={!k.isAktif ? "opacity-60" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex gap-2 items-center">
                    <Badge variant="outline" className="text-[10px]">{k.kategori}</Badge>
                    {!k.isAktif && <Badge variant="outline" className="text-[10px]">Nonaktif</Badge>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(k)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600" onClick={() => remove(k.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
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
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Topik" : "Tambah Topik KB"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Kategori</Label><Input value={form.kategori ?? ""} onChange={(e) => setForm({ ...form, kategori: e.target.value })} placeholder="harga, paket, lokasi, pembayaran..." /></div>
            <div><Label>Pertanyaan</Label><Input value={form.pertanyaan ?? ""} onChange={(e) => setForm({ ...form, pertanyaan: e.target.value })} placeholder="Berapa biaya paket prewedding?" /></div>
            <div><Label>Jawaban</Label><Textarea rows={4} value={form.jawaban ?? ""} onChange={(e) => setForm({ ...form, jawaban: e.target.value })} /></div>
            <div><Label>Keywords (pisah koma)</Label><Input value={Array.isArray(form.keywords) ? form.keywords.join(", ") : (form.keywords as any) ?? ""} onChange={(e) => setForm({ ...form, keywords: e.target.value as any })} placeholder="prewedding, harga, paket" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Prioritas</Label><Input type="number" value={form.prioritas ?? 0} onChange={(e) => setForm({ ...form, prioritas: Number(e.target.value) })} /></div>
              <label className="flex items-end gap-2 text-sm pb-2"><input type="checkbox" checked={form.isAktif !== false} onChange={(e) => setForm({ ...form, isAktif: e.target.checked })} /> Aktif</label>
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
