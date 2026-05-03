import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, Download, RefreshCw, ChevronLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

type Theme = {
  id: string;
  name: string;
  stripBg: string;
  headerBg: string;
  headerText: string;
  borderColor: string;
  footerBg: string;
  footerText: string;
  dot: string;
};

const THEMES: Theme[] = [
  {
    id: "classic",
    name: "Classic Blue",
    stripBg: "#FFFFFF",
    headerBg: "#1e3a8a",
    headerText: "#FFFFFF",
    borderColor: "#1e3a8a",
    footerBg: "#1e3a8a",
    footerText: "#FFFFFF",
    dot: "bg-blue-800",
  },
  {
    id: "pink",
    name: "Pink Blossom",
    stripBg: "#FFF0F6",
    headerBg: "#db2777",
    headerText: "#FFFFFF",
    borderColor: "#db2777",
    footerBg: "#db2777",
    footerText: "#FFFFFF",
    dot: "bg-pink-600",
  },
  {
    id: "sage",
    name: "Sage Green",
    stripBg: "#F6FAF7",
    headerBg: "#15803d",
    headerText: "#FFFFFF",
    borderColor: "#15803d",
    footerBg: "#15803d",
    footerText: "#FFFFFF",
    dot: "bg-green-700",
  },
  {
    id: "gold",
    name: "Gold Wedding",
    stripBg: "#FFFBF0",
    headerBg: "#92400e",
    headerText: "#FDE68A",
    borderColor: "#b45309",
    footerBg: "#92400e",
    footerText: "#FDE68A",
    dot: "bg-amber-800",
  },
  {
    id: "teal",
    name: "Teal Fresh",
    stripBg: "#F0FDFA",
    headerBg: "#0f766e",
    headerText: "#FFFFFF",
    borderColor: "#0f766e",
    footerBg: "#0f766e",
    footerText: "#FFFFFF",
    dot: "bg-teal-700",
  },
  {
    id: "purple",
    name: "Purple Dream",
    stripBg: "#FAF5FF",
    headerBg: "#6d28d9",
    headerText: "#FFFFFF",
    borderColor: "#6d28d9",
    footerBg: "#6d28d9",
    footerText: "#FFFFFF",
    dot: "bg-violet-700",
  },
];

const TOTAL_SHOTS = 4;
const PHOTO_W = 360;
const PHOTO_H = 270;
const STRIP_PAD_X = 20;
const STRIP_GAP = 10;
const STRIP_HEADER_H = 52;
const STRIP_FOOTER_H = 58;
const STRIP_W = PHOTO_W + STRIP_PAD_X * 2;
const STRIP_H =
  STRIP_HEADER_H + TOTAL_SHOTS * PHOTO_H + (TOTAL_SHOTS - 1) * STRIP_GAP + STRIP_FOOTER_H;

type Step = "preview" | "countdown" | "flash" | "between" | "processing" | "edit";

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function generateStrip(photos: string[], theme: Theme): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = STRIP_W;
    canvas.height = STRIP_H;
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = theme.stripBg;
    ctx.fillRect(0, 0, STRIP_W, STRIP_H);

    ctx.fillStyle = theme.borderColor;
    ctx.fillRect(0, 0, 6, STRIP_H);
    ctx.fillRect(STRIP_W - 6, 0, 6, STRIP_H);

    // Header
    ctx.fillStyle = theme.headerBg;
    ctx.fillRect(0, 0, STRIP_W, STRIP_HEADER_H);
    ctx.fillStyle = theme.headerText;
    ctx.font = "bold 18px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("AideaCreative Studio Foto", STRIP_W / 2, STRIP_HEADER_H / 2 - 6);
    ctx.font = "12px Arial, sans-serif";
    ctx.fillStyle = theme.headerText + "BB";
    ctx.fillText(
      `${theme.name}  -  ${new Date().toLocaleDateString("id-ID", {
        day: "2-digit", month: "long", year: "numeric",
      })}`,
      STRIP_W / 2,
      STRIP_HEADER_H / 2 + 12
    );

    const loadAndDraw = async () => {
      for (let i = 0; i < photos.length; i++) {
        const img = new Image();
        await new Promise<void>((res) => {
          img.onload = () => {
            const x = STRIP_PAD_X;
            const y = STRIP_HEADER_H + i * (PHOTO_H + STRIP_GAP);
            ctx.fillStyle = theme.borderColor;
            ctx.fillRect(x - 4, y - 4, PHOTO_W + 8, PHOTO_H + 8);
            ctx.save();
            drawRoundRect(ctx, x, y, PHOTO_W, PHOTO_H, 2);
            ctx.clip();
            const sw = img.naturalWidth, sh = img.naturalHeight;
            const targetRatio = PHOTO_W / PHOTO_H;
            const srcRatio = sw / sh;
            let sx = 0, sy = 0, sW = sw, sH = sh;
            if (srcRatio > targetRatio) { sW = sh * targetRatio; sx = (sw - sW) / 2; }
            else { sH = sw / targetRatio; sy = (sh - sH) / 2; }
            ctx.drawImage(img, sx, sy, sW, sH, x, y, PHOTO_W, PHOTO_H);
            ctx.restore();
            // Numbering badge
            ctx.fillStyle = theme.borderColor;
            ctx.beginPath();
            ctx.arc(x + 18, y + 18, 13, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = theme.headerText;
            ctx.font = "bold 12px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(`${i + 1}`, x + 18, y + 18);
            res();
          };
          img.src = photos[i];
        });
      }

      // Footer
      const fy = STRIP_H - STRIP_FOOTER_H;
      ctx.fillStyle = theme.footerBg;
      ctx.fillRect(0, fy, STRIP_W, STRIP_FOOTER_H);
      ctx.fillStyle = theme.footerText;
      ctx.font = "bold 14px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Web Photobooth - AideaCreative", STRIP_W / 2, fy + 20);
      ctx.font = "11px Arial";
      ctx.fillStyle = theme.footerText + "CC";
      ctx.fillText("Studio Foto Pringsewu, Lampung", STRIP_W / 2, fy + 40);

      resolve(canvas.toDataURL("image/png"));
    };

    loadAndDraw();
  });
}

export default function Photobooth() {
  const [step, setStep] = useState<Step>("preview");
  const [theme, setTheme] = useState<Theme>(THEMES[0]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [shotIdx, setShotIdx] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [stripUrl, setStripUrl] = useState<string | null>(null);
  const [stripLoading, setStripLoading] = useState(false);
  const [mirror, setMirror] = useState(true);
  const [camError, setCamError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const photosRef = useRef<string[]>([]);
  photosRef.current = photos;

  // ── Camera management ──
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const startCamera = useCallback(async () => {
    setCamError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setCamError("Kamera tidak bisa diakses. Berikan izin kamera di browser lalu muat ulang halaman.");
    }
  }, []);

  // Start camera on mount
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  // ── Capture ──
  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = captureCanvasRef.current;
    if (!video || !canvas) return null;
    canvas.width = PHOTO_W * 2;
    canvas.height = PHOTO_H * 2;
    const ctx = canvas.getContext("2d")!;
    const vw = video.videoWidth, vh = video.videoHeight;
    const targetRatio = PHOTO_W / PHOTO_H;
    const srcRatio = vw / vh;
    let sx = 0, sy = 0, sw = vw, sh = vh;
    if (srcRatio > targetRatio) { sw = vh * targetRatio; sx = (vw - sw) / 2; }
    else { sh = vw / targetRatio; sy = (vh - sh) / 2; }
    if (mirror) { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.92);
  }, [mirror]);

  const runCountdown = useCallback((idx: number) => {
    setStep("countdown");
    setShotIdx(idx);
    setCountdown(3);
    let c = 3;
    const tick = () => {
      c--;
      if (c > 0) {
        setCountdown(c);
        timerRef.current = setTimeout(tick, 1000);
      } else {
        setStep("flash");
        timerRef.current = setTimeout(() => {
          const dataUrl = captureFrame();
          if (dataUrl) {
            const next = [...photosRef.current, dataUrl];
            setPhotos(next);
            if (next.length < TOTAL_SHOTS) {
              setStep("between");
              timerRef.current = setTimeout(() => runCountdown(next.length), 1800);
            } else {
              setStep("processing");
            }
          }
        }, 200);
      }
    };
    timerRef.current = setTimeout(tick, 1000);
  }, [captureFrame]);

  const startCapture = useCallback(() => {
    setPhotos([]);
    setStripUrl(null);
    setShotIdx(0);
    timerRef.current = setTimeout(() => runCountdown(0), 300);
  }, [runCountdown]);

  // ── Strip generation — auto-regenerates when theme changes in edit mode ──
  useEffect(() => {
    if (step === "processing" && photosRef.current.length === TOTAL_SHOTS) {
      setStripLoading(true);
      generateStrip(photosRef.current, theme).then((url) => {
        setStripUrl(url);
        setStripLoading(false);
        stopCamera();
        setStep("edit");
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    if (step !== "edit" || photos.length < TOTAL_SHOTS) return;
    setStripLoading(true);
    generateStrip(photos, theme).then((url) => {
      setStripUrl(url);
      setStripLoading(false);
    });
  }, [theme, step, photos]);

  const retake = useCallback(async () => {
    setPhotos([]);
    setStripUrl(null);
    setShotIdx(0);
    setStep("preview");
    await startCamera();
  }, [startCamera]);

  const downloadStrip = () => {
    if (!stripUrl) return;
    const a = document.createElement("a");
    a.href = stripUrl;
    a.download = `photobooth-${theme.id}-${Date.now()}.png`;
    a.click();
  };

  const isCapturing =
    step === "countdown" || step === "flash" || step === "between" || step === "processing";
  const showCamera = step === "preview" || isCapturing;

  return (
    <div className="bg-muted/30 min-h-screen">
      <div className="container mx-auto px-4 md:px-6 py-8 md:py-12">

        {/* Page header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1.5 text-xs font-medium text-primary mb-4">
            <Camera className="h-3 w-3" />
            Web Photobooth
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            Photobooth Virtual
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-xl">
            {step === "preview" || isCapturing
              ? "Posisikan diri kamu, lalu klik Mulai Foto — countdown 3-2-1 otomatis dimulai."
              : "Foto berhasil diambil! Pilih tema frame dan download photo strip kamu."}
          </p>
        </div>

        {/* ── CAMERA SCREEN (preview + capture) ── */}
        {showCamera && (
          <div className="flex flex-col items-center gap-5">
            <div className="relative w-full max-w-2xl">

              {/* Video frame */}
              <div
                className="relative rounded-2xl overflow-hidden shadow-xl bg-muted"
                style={{ aspectRatio: "4/3", border: "4px solid hsl(var(--border))" }}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: mirror ? "scaleX(-1)" : "none" }}
                />

                {/* Camera error */}
                {camError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted/90 px-6">
                    <p className="text-sm text-center text-muted-foreground">{camError}</p>
                  </div>
                )}

                {/* Flash */}
                <AnimatePresence>
                  {step === "flash" && (
                    <motion.div
                      className="absolute inset-0 bg-white"
                      initial={{ opacity: 0.95 }}
                      animate={{ opacity: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    />
                  )}
                </AnimatePresence>

                {/* Countdown */}
                <AnimatePresence mode="wait">
                  {step === "countdown" && (
                    <motion.div
                      key={countdown}
                      className="absolute inset-0 flex flex-col items-center justify-center"
                      style={{ background: "rgba(0,0,0,0.4)" }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <motion.span
                        key={countdown}
                        initial={{ scale: 1.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.6, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="text-[110px] font-black leading-none text-white drop-shadow-2xl"
                      >
                        {countdown}
                      </motion.span>
                      <p className="text-white/90 font-semibold text-lg mt-2 drop-shadow">
                        Foto {shotIdx + 1} dari {TOTAL_SHOTS}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Between shots */}
                {step === "between" && (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ background: "rgba(0,0,0,0.4)" }}
                  >
                    <div className="text-center">
                      <p className="text-white font-bold text-xl drop-shadow">
                        Foto {photos.length} selesai
                      </p>
                      <p className="text-white/70 text-sm mt-1">
                        Bersiap foto {photos.length + 1}...
                      </p>
                    </div>
                  </div>
                )}

                {/* Processing */}
                {step === "processing" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <p className="text-white font-semibold">Membuat photo strip...</p>
                  </div>
                )}

                {/* Shot counter */}
                {isCapturing && step !== "processing" && (
                  <div className="absolute top-3 right-3 rounded-full px-3 py-1 text-xs font-bold bg-white/90 text-foreground shadow">
                    {photos.length} / {TOTAL_SHOTS}
                  </div>
                )}

                {/* Preview controls overlay */}
                {step === "preview" && (
                  <div className="absolute inset-x-0 bottom-0 flex flex-col items-center pb-5 gap-2 bg-gradient-to-t from-black/30 to-transparent pt-8">
                    <Button
                      onClick={startCapture}
                      size="lg"
                      className="h-12 px-10 rounded-full font-semibold shadow-lg"
                    >
                      Mulai Foto
                    </Button>
                  </div>
                )}
              </div>

              {/* Mirror toggle + instructions below camera */}
              {step === "preview" && (
                <div className="mt-3 flex items-center justify-between px-1">
                  <p className="text-xs text-muted-foreground">
                    4 foto akan diambil otomatis secara berurutan
                  </p>
                  <button
                    onClick={() => setMirror(!mirror)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-all ${
                      mirror
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    Mirror {mirror ? "On" : "Off"}
                  </button>
                </div>
              )}

              {/* Thumbnail row during capture */}
              {isCapturing && step !== "processing" && (
                <div className="mt-4 flex gap-2 justify-center">
                  {[...Array(TOTAL_SHOTS)].map((_, i) => (
                    <div
                      key={i}
                      className="rounded-lg overflow-hidden bg-muted"
                      style={{
                        width: 72, height: 54,
                        border: `2px solid ${i < photos.length ? "hsl(var(--primary))" : "hsl(var(--border))"}`,
                      }}
                    >
                      {photos[i] ? (
                        <img src={photos[i]} className="w-full h-full object-cover" alt={`foto ${i + 1}`} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[11px] text-muted-foreground font-semibold">
                          {i + 1}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <canvas ref={captureCanvasRef} className="hidden" />
          </div>
        )}

        {/* ── EDIT SCREEN ── */}
        {step === "edit" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col lg:flex-row gap-8 items-start"
          >
            {/* Left: captured photos + theme picker */}
            <div className="flex-1 min-w-0 space-y-5">

              {/* 4 captured thumbnails */}
              <div className="bg-background rounded-2xl border border-border p-5 shadow-sm">
                <p className="text-sm font-semibold mb-3">Hasil Foto</p>
                <div className="grid grid-cols-4 gap-2">
                  {photos.map((p, i) => (
                    <div
                      key={i}
                      className="rounded-xl overflow-hidden aspect-[4/3] bg-muted ring-1 ring-border"
                    >
                      <img src={p} className="w-full h-full object-cover" alt={`foto ${i + 1}`} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Theme picker */}
              <div className="bg-background rounded-2xl border border-border p-5 shadow-sm">
                <p className="text-sm font-semibold mb-4">Pilih Tema Frame</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {THEMES.map((t) => {
                    const selected = theme.id === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setTheme(t)}
                        className={`relative rounded-xl p-3 text-left border-2 transition-all ${
                          selected
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border bg-muted/40 hover:bg-muted"
                        }`}
                      >
                        {selected && (
                          <span className="absolute top-2 right-2 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                            <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-white">
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </span>
                        )}
                        {/* Mini strip preview */}
                        <div className="w-full h-14 rounded-md mb-2.5 overflow-hidden bg-white border border-border relative">
                          <div className="absolute inset-x-0 top-0 h-3" style={{ background: t.headerBg }} />
                          <div className="absolute inset-x-0 bottom-0 h-3" style={{ background: t.footerBg }} />
                          <div className="absolute inset-x-2 top-3 bottom-3 flex flex-col gap-0.5">
                            {[...Array(4)].map((_, i) => (
                              <div key={i} className="flex-1 rounded-sm" style={{ background: t.borderColor + "20" }} />
                            ))}
                          </div>
                          <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: t.borderColor }} />
                          <div className="absolute right-0 top-0 bottom-0 w-1.5" style={{ background: t.borderColor }} />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${t.dot}`} />
                          <p className="text-xs font-semibold text-foreground truncate">{t.name}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={downloadStrip}
                  disabled={stripLoading || !stripUrl}
                  className="flex-1 h-11 rounded-xl font-semibold gap-2"
                >
                  <Download className="h-4 w-4" />
                  {stripLoading ? "Memproses..." : "Download Strip PNG"}
                </Button>
                <Button
                  onClick={retake}
                  variant="outline"
                  className="h-11 rounded-xl font-semibold gap-2 px-5"
                >
                  <RefreshCw className="h-4 w-4" />
                  Foto Ulang
                </Button>
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-xs text-muted-foreground mb-3">
                  Suka hasilnya? Yuk booking sesi foto sungguhan di studio kami!
                </p>
                <Link href="/booking">
                  <Button variant="outline" className="w-full rounded-xl border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
                    Booking Studio Sekarang
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right: strip preview */}
            <div className="lg:w-[220px] shrink-0 sticky top-24">
              <div className="bg-background rounded-2xl border border-border p-4 shadow-sm">
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                  Preview Strip
                </p>
                {stripLoading ? (
                  <div className="flex flex-col gap-1.5">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="w-full aspect-[4/3] rounded-lg bg-muted animate-pulse" />
                    ))}
                    <p className="text-[10px] text-muted-foreground text-center mt-1">Memproses...</p>
                  </div>
                ) : stripUrl ? (
                  <div
                    className="rounded-xl overflow-hidden shadow-md"
                    style={{ border: `3px solid ${theme.borderColor}` }}
                  >
                    <img
                      src={stripUrl}
                      alt="photo strip preview"
                      className="block w-full"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
