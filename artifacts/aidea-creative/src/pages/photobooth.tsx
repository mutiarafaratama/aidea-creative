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
    id: "korea",
    name: "Blossom Korea",
    stripBg: "#FFF0F8",
    headerBg: "#F472B6",
    headerText: "#FFFFFF",
    borderColor: "#EC4899",
    footerBg: "#EC4899",
    footerText: "#FFFFFF",
    dot: "bg-pink-400",
  },
  {
    id: "beige",
    name: "Aesthetic Beige",
    stripBg: "#FAF6F0",
    headerBg: "#A87C5A",
    headerText: "#FFFFFF",
    borderColor: "#A87C5A",
    footerBg: "#A87C5A",
    footerText: "#FFF8F0",
    dot: "bg-amber-700",
  },
  {
    id: "matcha",
    name: "Matcha Latte",
    stripBg: "#F4F8F0",
    headerBg: "#4D7C5A",
    headerText: "#FFFFFF",
    borderColor: "#4D7C5A",
    footerBg: "#4D7C5A",
    footerText: "#FFFFFF",
    dot: "bg-green-700",
  },
  {
    id: "y2k",
    name: "Y2K Holographic",
    stripBg: "#F8F4FF",
    headerBg: "#8B5CF6",
    headerText: "#FFFFFF",
    borderColor: "#7C3AED",
    footerBg: "#7C3AED",
    footerText: "#FFFFFF",
    dot: "bg-violet-500",
  },
  {
    id: "sunset",
    name: "Sunset Glow",
    stripBg: "#FFF6EE",
    headerBg: "#F97316",
    headerText: "#FFFFFF",
    borderColor: "#EA6C0A",
    footerBg: "#EA6C0A",
    footerText: "#FFFFFF",
    dot: "bg-orange-500",
  },
  {
    id: "mocha",
    name: "Mocha Velvet",
    stripBg: "#FAF5EE",
    headerBg: "#6B3F26",
    headerText: "#FAF0E6",
    borderColor: "#6B3F26",
    footerBg: "#6B3F26",
    footerText: "#FAF0E6",
    dot: "bg-amber-900",
  },
  {
    id: "aidea",
    name: "AideaCreative",
    stripBg: "#FFFFFF",
    headerBg: "#1d4ed8",
    headerText: "#FFFFFF",
    borderColor: "#1d4ed8",
    footerBg: "#1d4ed8",
    footerText: "#FFFFFF",
    dot: "bg-blue-600",
  },
];

const TOTAL_SHOTS = 4;

const EMOJI_PALETTE = ["⭐", "💖", "🌸", "✨", "🎀", "🌟", "💫", "🎊", "🌈", "🦋", "🌺", "💎", "🎵", "🤍", "🎭", "🌙", "🥳", "😍", "🔥", "💐"];

// Capture size (used by captureCanvas)
const PHOTO_W = 360;
const PHOTO_H = 270;

type Step = "preview" | "countdown" | "flash" | "between" | "processing" | "edit";

// ── Strip drawing helpers ──────────────────────────────────────────────────

function rrect(
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

function dot(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Theme-specific frame decoration drawers ────────────────────────────────

function drawHeart(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string, a = 0.88) {
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy + r * 0.85);
  ctx.bezierCurveTo(cx - r * 1.6, cy + r * 0.25, cx - r * 1.8, cy - r * 0.9, cx, cy - r * 0.2);
  ctx.bezierCurveTo(cx + r * 1.8, cy - r * 0.9, cx + r * 1.6, cy + r * 0.25, cx, cy + r * 0.85);
  ctx.closePath(); ctx.fill(); ctx.restore();
}

function drawFlower(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string, a = 0.82) {
  ctx.save(); ctx.globalAlpha = a;
  const petalR = r * 0.5;
  const centerDist = r * 0.58;
  for (let i = 0; i < 5; i++) {
    const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx + centerDist * Math.cos(angle), cy + centerDist * Math.sin(angle), petalR, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.28, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawSparkle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string, a = 0.85) {
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const isPoint = i % 2 === 0;
    const dist = isPoint ? r : r * 0.28;
    if (i === 0) ctx.moveTo(cx + dist * Math.cos(angle), cy + dist * Math.sin(angle));
    else ctx.lineTo(cx + dist * Math.cos(angle), cy + dist * Math.sin(angle));
  }
  ctx.closePath(); ctx.fill(); ctx.restore();
}

function drawStar5(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string, a = 0.85) {
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const dist = i % 2 === 0 ? r : r * 0.42;
    const px = cx + dist * Math.cos(angle), py = cy + dist * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.fill(); ctx.restore();
}

function drawSun(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string, a = 0.82) {
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = color;
  // Rays
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.55 * Math.cos(angle), cy + r * 0.55 * Math.sin(angle));
    ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
    ctx.lineWidth = r * 0.3; ctx.strokeStyle = color; ctx.globalAlpha = a;
    ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.48, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawDiamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string, a = 0.82) {
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r * 0.65, cy);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r * 0.65, cy);
  ctx.closePath(); ctx.fill();
  // shine
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.beginPath();
  ctx.moveTo(cx, cy - r * 0.75);
  ctx.lineTo(cx + r * 0.35, cy - r * 0.1);
  ctx.lineTo(cx, cy);
  ctx.lineTo(cx - r * 0.2, cy - r * 0.35);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

type FrameDrawer = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) => void;

const FRAME_DRAWERS: Record<string, FrameDrawer> = {
  korea:  drawHeart,
  beige:  drawFlower,
  matcha: drawFlower,
  y2k:    drawSparkle,
  sunset: drawSun,
  mocha:  drawDiamond,
  aidea:  drawSparkle,
};

// Fixed scatter positions [xFrac(0=outer,1=inner), yFrac(0=top,1=bottom), sizeMult]
const SCATTER: [number, number, number][] = [
  [0.50, 0.025, 1.00], [0.20, 0.065, 0.70], [0.75, 0.105, 0.85],
  [0.40, 0.145, 0.60], [0.65, 0.185, 0.95], [0.25, 0.225, 0.75],
  [0.80, 0.265, 0.65], [0.45, 0.305, 1.00], [0.15, 0.345, 0.80],
  [0.70, 0.385, 0.55], [0.35, 0.425, 0.90], [0.60, 0.465, 0.70],
  [0.20, 0.505, 1.00], [0.75, 0.545, 0.65], [0.45, 0.585, 0.85],
  [0.30, 0.625, 0.60], [0.70, 0.665, 0.95], [0.50, 0.705, 0.75],
  [0.15, 0.745, 0.65], [0.65, 0.785, 1.00], [0.35, 0.825, 0.80],
  [0.80, 0.865, 0.60], [0.50, 0.905, 0.90], [0.25, 0.945, 0.70],
];

function generateStrip(photos: string[], theme: Theme): Promise<string> {
  return new Promise((resolve) => {
    // ── Layout ──
    const SW   = 440;           // strip total width
    const FW   = 48;            // frame width each side
    const PW   = SW - FW * 2;  // photo width = 344
    const PH   = Math.round(PW * 3 / 4); // 4:3 = 258
    const GAP  = 8;             // gap between photos (frame color shows through)
    const TOP  = 36;            // top band
    const FOOT = 72;            // footer
    const SH   = TOP + 4 * PH + 3 * GAP + FOOT;  // total height

    const canvas = document.createElement("canvas");
    canvas.width = SW; canvas.height = SH;
    const ctx = canvas.getContext("2d")!;

    // ── 1. Fill entire strip with frame color ──
    ctx.fillStyle = theme.headerBg;
    ctx.fillRect(0, 0, SW, SH);

    // ── 2. Draw photo-column background (light tint) ──
    ctx.fillStyle = theme.stripBg;
    ctx.fillRect(FW, TOP, PW, 4 * PH + 3 * GAP);

    // ── 3. Frame decorations (left & right sides) ──
    const drawDeco = FRAME_DRAWERS[theme.id] ?? drawStar5;
    const decoColor = hexToRgba(theme.headerText, 1);
    const decoH = SH - FOOT; // area to scatter decorations

    for (const [xFrac, yFrac, sizeMult] of SCATTER) {
      const r = 6.5 * sizeMult;
      const cy = yFrac * decoH;
      // Left frame
      const lx = xFrac * FW;
      drawDeco(ctx, lx, cy, r, decoColor);
      // Right frame (mirror)
      const rx = SW - FW + (1 - xFrac) * FW;
      drawDeco(ctx, rx, cy, r, decoColor);
    }

    // Small dot accents between main deco elements
    for (let yFrac = 0.04; yFrac < 0.98; yFrac += 0.08) {
      const cy = yFrac * decoH;
      dot(ctx, FW * 0.5, cy, 1.8, hexToRgba(theme.headerText, 0.25));
      dot(ctx, SW - FW * 0.5, cy, 1.8, hexToRgba(theme.headerText, 0.25));
    }

    // ── 4. TOP band subtle text ──
    ctx.fillStyle = hexToRgba(theme.headerText, 0.55);
    ctx.font = "bold 11px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`✦  ${theme.name}  ✦`, SW / 2, TOP / 2);

    // ── 5. Photos ──
    const loadAndDraw = async () => {
      for (let i = 0; i < photos.length; i++) {
        const photoY = TOP + i * (PH + GAP);
        const img = new Image();
        await new Promise<void>((res) => {
          img.onload = () => {
            ctx.save();
            rrect(ctx, FW, photoY, PW, PH, 0);
            ctx.clip();
            const sw = img.naturalWidth, sh = img.naturalHeight;
            const targetRatio = PW / PH;
            const srcRatio = sw / sh;
            let sx = 0, sy = 0, sW = sw, sH = sh;
            if (srcRatio > targetRatio) { sW = sh * targetRatio; sx = (sw - sW) / 2; }
            else { sH = sw / targetRatio; sy = (sh - sH) / 2; }
            ctx.drawImage(img, sx, sy, sW, sH, FW, photoY, PW, PH);
            ctx.restore();

            // Number badge on photo (top-left corner)
            dot(ctx, FW + 14, photoY + 14, 12, hexToRgba(theme.headerBg, 0.88));
            ctx.fillStyle = theme.headerText;
            ctx.font = "bold 11px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(`${i + 1}`, FW + 14, photoY + 14);
            res();
          };
          img.src = photos[i];
        });
      }

      // ── 6. Footer ──
      const fy = SH - FOOT;
      ctx.fillStyle = theme.footerBg;
      ctx.fillRect(0, fy, SW, FOOT);

      // Separator line at top of footer
      ctx.fillStyle = hexToRgba(theme.headerText, 0.20);
      ctx.fillRect(0, fy, SW, 1);

      // Corner deco in footer
      drawDeco(ctx, 18, fy + FOOT / 2, 6, hexToRgba(theme.headerText, 0.5));
      drawDeco(ctx, SW - 18, fy + FOOT / 2, 6, hexToRgba(theme.headerText, 0.5));

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const dateText = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });

      // Try to load logo image for watermark
      const logoImg = new Image();
      const logoLoaded = await new Promise<boolean>((res2) => {
        logoImg.onload = () => res2(true);
        logoImg.onerror = () => res2(false);
        logoImg.src = "/images/logo_nobg.png";
      });

      if (logoLoaded && logoImg.naturalWidth > 0) {
        const logoH = 26;
        const logoW = Math.round(logoImg.naturalWidth * (logoH / logoImg.naturalHeight));
        ctx.globalAlpha = 0.92;
        ctx.drawImage(logoImg, (SW - logoW) / 2, fy + 7, logoW, logoH);
        ctx.globalAlpha = 1;

        ctx.font = "10px Arial";
        ctx.fillStyle = hexToRgba(theme.footerText, 0.70);
        ctx.fillText("Web Photobooth  •  Pringsewu, Lampung", SW / 2, fy + 44);

        ctx.font = "9px Arial";
        ctx.fillStyle = hexToRgba(theme.footerText, 0.48);
        ctx.fillText(dateText, SW / 2, fy + 58);
      } else {
        ctx.fillStyle = theme.footerText;
        ctx.font = "bold 15px Arial";
        ctx.fillText("AideaCreative Studio Foto", SW / 2, fy + 22);

        ctx.font = "10.5px Arial";
        ctx.fillStyle = hexToRgba(theme.footerText, 0.72);
        ctx.fillText("Web Photobooth  •  Pringsewu, Lampung", SW / 2, fy + 40);

        ctx.font = "9.5px Arial";
        ctx.fillStyle = hexToRgba(theme.footerText, 0.50);
        ctx.fillText(dateText, SW / 2, fy + 57);
      }

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
  const [stickers, setStickers] = useState<{ id: string; emoji: string; x: number; y: number }[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const photosRef = useRef<string[]>([]);
  photosRef.current = photos;

  const addSticker = (emoji: string) => {
    setStickers((prev) => [...prev, {
      id: Math.random().toString(36).slice(2),
      emoji,
      x: 0.15 + Math.random() * 0.70,
      y: 0.05 + Math.random() * 0.88,
    }]);
  };

  const handleStickerMouseDown = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setDraggingId(id);
  };

  const handleStripMouseMove = (e: React.MouseEvent) => {
    if (!draggingId || !stripRef.current) return;
    const rect = stripRef.current.getBoundingClientRect();
    const x = Math.max(0.02, Math.min(0.98, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0.02, Math.min(0.98, (e.clientY - rect.top) / rect.height));
    setStickers((prev) => prev.map((s) => s.id === draggingId ? { ...s, x, y } : s));
  };

  const handleStripMouseUp = () => setDraggingId(null);

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
    setStickers([]);
    setShotIdx(0);
    setStep("preview");
    await startCamera();
  }, [startCamera]);

  const downloadStrip = async () => {
    if (!stripUrl) return;
    if (stickers.length === 0) {
      const a = document.createElement("a");
      a.href = stripUrl;
      a.download = `photobooth-${theme.id}-${Date.now()}.png`;
      a.click();
      return;
    }
    const img = new Image();
    img.src = stripUrl;
    await new Promise<void>((res) => { img.onload = () => res(); });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const fontSize = Math.round(img.naturalWidth * 0.07);
    ctx.font = `${fontSize}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const s of stickers) {
      ctx.fillText(s.emoji, s.x * img.naturalWidth, s.y * img.naturalHeight);
    }
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
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
                        {/* Mini strip preview — wide frame style */}
                        <div
                          className="w-full h-16 rounded-md mb-2.5 overflow-hidden relative flex"
                          style={{ background: t.headerBg }}
                        >
                          {/* Left frame */}
                          <div className="w-7 shrink-0 flex flex-col items-center justify-around py-1">
                            {[...Array(4)].map((_, i) => (
                              <div key={i} className="w-2 h-2 rounded-full opacity-70" style={{ background: t.headerText }} />
                            ))}
                          </div>
                          {/* Center photo column */}
                          <div className="flex-1 flex flex-col gap-0.5 py-1" style={{ background: t.stripBg }}>
                            {[...Array(4)].map((_, i) => (
                              <div key={i} className="flex-1 opacity-25 rounded-sm" style={{ background: t.borderColor }} />
                            ))}
                          </div>
                          {/* Right frame */}
                          <div className="w-7 shrink-0 flex flex-col items-center justify-around py-1">
                            {[...Array(4)].map((_, i) => (
                              <div key={i} className="w-2 h-2 rounded-full opacity-70" style={{ background: t.headerText }} />
                            ))}
                          </div>
                          {/* Footer strip */}
                          <div className="absolute inset-x-0 bottom-0 h-3 flex items-center justify-center" style={{ background: t.footerBg }}>
                            <div className="h-0.5 w-8 rounded-full opacity-40" style={{ background: t.footerText }} />
                          </div>
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
            <div className="lg:w-[300px] shrink-0 sticky top-24 space-y-3">
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
                    ref={stripRef}
                    className="rounded-xl overflow-hidden shadow-md relative select-none"
                    style={{ border: `3px solid ${theme.borderColor}`, cursor: draggingId ? "grabbing" : "default" }}
                    onMouseMove={handleStripMouseMove}
                    onMouseUp={handleStripMouseUp}
                    onMouseLeave={handleStripMouseUp}
                  >
                    <img
                      src={stripUrl}
                      alt="photo strip preview"
                      className="block w-full pointer-events-none"
                      draggable={false}
                    />
                    {stickers.map((s) => (
                      <div
                        key={s.id}
                        className="absolute text-2xl leading-none hover:scale-110 transition-transform"
                        style={{
                          left: `${s.x * 100}%`,
                          top: `${s.y * 100}%`,
                          transform: "translate(-50%, -50%)",
                          cursor: "grab",
                          userSelect: "none",
                          filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))",
                        }}
                        onMouseDown={(e) => handleStickerMouseDown(e, s.id)}
                        onDoubleClick={() => setStickers((prev) => prev.filter((x) => x.id !== s.id))}
                        title="Geser untuk pindahkan · Klik 2× untuk hapus"
                      >
                        {s.emoji}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Emoji sticker palette */}
              {stripUrl && !stripLoading && (
                <div className="bg-background rounded-2xl border border-border p-4 shadow-sm">
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                    Tambah Stiker
                  </p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {EMOJI_PALETTE.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => addSticker(emoji)}
                        className="text-xl h-9 w-full rounded-lg hover:bg-muted transition-colors flex items-center justify-center"
                        title={`Tambah ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  {stickers.length > 0 && (
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-[10px] text-muted-foreground">{stickers.length} stiker · geser untuk pindah · klik 2× hapus</p>
                      <button
                        onClick={() => setStickers([])}
                        className="text-[10px] text-destructive hover:underline"
                      >
                        Hapus semua
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
