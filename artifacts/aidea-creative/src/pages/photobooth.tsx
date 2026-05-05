import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, Download, RefreshCw, ChevronLeft, RotateCcw } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

type Theme = {
  id: string;
  name: string;
  clip: "rect" | "oval";
  stripBg: string;
  frameBg: string;
  frameText: string;
  borderColor: string;
  footerBg: string;
  footerText: string;
  dot: string;
  accent: string;
};

const THEMES: Theme[] = [
  {
    id: "aidea",
    name: "Aidea Blue",
    clip: "rect",
    stripBg: "#EFF6FF",
    frameBg: "#1d4ed8",
    frameText: "#FFFFFF",
    borderColor: "#1d4ed8",
    footerBg: "#1e40af",
    footerText: "#FFFFFF",
    dot: "bg-blue-600",
    accent: "#93C5FD",
  },
  {
    id: "love",
    name: "Love Edition",
    clip: "oval",
    stripBg: "#FFF0F6",
    frameBg: "#EC4899",
    frameText: "#FFFFFF",
    borderColor: "#DB2777",
    footerBg: "#DB2777",
    footerText: "#FFFFFF",
    dot: "bg-pink-500",
    accent: "#FBCFE8",
  },
  {
    id: "night",
    name: "Night Sky",
    clip: "rect",
    stripBg: "#1e293b",
    frameBg: "#0f172a",
    frameText: "#F59E0B",
    borderColor: "#F59E0B",
    footerBg: "#0f172a",
    footerText: "#F59E0B",
    dot: "bg-amber-400",
    accent: "#FCD34D",
  },
];

const TOTAL_SHOTS = 4;

const EMOJI_PALETTE = ["⭐", "💖", "🌸", "✨", "🎀", "🌟", "💫", "🎊", "🌈", "🦋", "🌺", "💎", "🎵", "🤍", "🎭", "🌙", "🥳", "😍", "🔥", "💐"];

const PHOTO_W = 360;
const PHOTO_H = 270;

type Step = "preview" | "countdown" | "flash" | "between" | "processing" | "edit";

// ── Canvas helpers ──────────────────────────────────────────────────────────

function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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

function drawHeart(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string, a = 0.88) {
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy + r * 0.85);
  ctx.bezierCurveTo(cx - r * 1.6, cy + r * 0.25, cx - r * 1.8, cy - r * 0.9, cx, cy - r * 0.2);
  ctx.bezierCurveTo(cx + r * 1.8, cy - r * 0.9, cx + r * 1.6, cy + r * 0.25, cx, cy + r * 0.85);
  ctx.closePath(); ctx.fill(); ctx.restore();
}

function drawSparkle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string, a = 0.85) {
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const dist = i % 2 === 0 ? r : r * 0.28;
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

function drawCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string, a = 0.6) {
  ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = color; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
}

// Strip layout constants
const SW = 440;
const FW = 52;
const PW = SW - FW * 2;
const PH = Math.round(PW * 3 / 4);
const GAP = 10;
const TOP = 38;
const FOOT = 90;
const SH = TOP + 4 * PH + 3 * GAP + FOOT;

// Scatter positions for side margins [xFrac(0..1 within FW), yFrac(0..1), sizeMult]
const SCATTER: [number, number, number][] = [
  [0.5, 0.03, 1.0], [0.2, 0.08, 0.7], [0.75, 0.13, 0.85],
  [0.4, 0.18, 0.6], [0.65, 0.23, 0.95], [0.25, 0.28, 0.75],
  [0.8, 0.33, 0.65], [0.45, 0.38, 1.0], [0.15, 0.43, 0.8],
  [0.7, 0.48, 0.55], [0.35, 0.53, 0.9], [0.6, 0.58, 0.7],
  [0.2, 0.63, 1.0], [0.75, 0.68, 0.65], [0.45, 0.73, 0.85],
  [0.3, 0.78, 0.6], [0.7, 0.83, 0.95], [0.5, 0.88, 0.75],
  [0.15, 0.93, 0.65], [0.65, 0.97, 1.0],
];

function drawPhotoClip(
  ctx: CanvasRenderingContext2D,
  clip: "rect" | "oval",
  img: HTMLImageElement,
  x: number, y: number, w: number, h: number,
) {
  ctx.save();
  if (clip === "oval") {
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w / 2 * 0.9, h / 2 * 0.9, 0, 0, Math.PI * 2);
    ctx.clip();
  } else {
    rrect(ctx, x, y, w, h, 0);
    ctx.clip();
  }
  const sw = img.naturalWidth, sh = img.naturalHeight;
  const targetRatio = w / h;
  const srcRatio = sw / sh;
  let sx = 0, sy = 0, sW = sw, sH = sh;
  if (srcRatio > targetRatio) { sW = sh * targetRatio; sx = (sw - sW) / 2; }
  else { sH = sw / targetRatio; sy = (sh - sH) / 2; }
  ctx.drawImage(img, sx, sy, sW, sH, x, y, w, h);
  ctx.restore();
}

async function generateStrip(photos: string[], theme: Theme): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = SW; canvas.height = SH;
  const ctx = canvas.getContext("2d")!;

  // 1. Fill entire strip with frame color
  ctx.fillStyle = theme.frameBg;
  ctx.fillRect(0, 0, SW, SH);

  // 2. Photo column background
  ctx.fillStyle = theme.stripBg;
  ctx.fillRect(FW, TOP, PW, 4 * PH + 3 * GAP);

  // 3. TOP band title
  ctx.fillStyle = hexToRgba(theme.frameText, 0.60);
  ctx.font = "bold 12px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("✦  AideaCreative  ✦", SW / 2, TOP / 2);

  // 4. Load logo early (needed for Frame 1 scatter + footer)
  const logoImg = new Image();
  const logoLoaded = await new Promise<boolean>((resolve) => {
    logoImg.onload = () => resolve(true);
    logoImg.onerror = () => resolve(false);
    logoImg.src = "/images/logo_nobg.png";
  });

  // 5. Side decorations — per-theme
  const decoH = SH - FOOT;

  if (theme.id === "aidea") {
    // Frame 1: Logo scattered + blue sparkle accents
    for (const [xFrac, yFrac, sizeMult] of SCATTER) {
      const cy = yFrac * decoH;
      if (logoLoaded && sizeMult > 0.7) {
        const lh = Math.round(16 * sizeMult);
        const lw = Math.round(logoImg.naturalWidth * (lh / logoImg.naturalHeight));
        const alpha = 0.22 + sizeMult * 0.16;
        ctx.save(); ctx.globalAlpha = alpha;
        ctx.drawImage(logoImg, xFrac * FW - lw / 2, cy - lh / 2, lw, lh);
        ctx.restore();
        ctx.save(); ctx.globalAlpha = alpha;
        ctx.drawImage(logoImg, SW - FW + (1 - xFrac) * FW - lw / 2, cy - lh / 2, lw, lh);
        ctx.restore();
      } else {
        const r = 5 * sizeMult;
        drawSparkle(ctx, xFrac * FW, cy, r, hexToRgba(theme.frameText, 0.5));
        drawSparkle(ctx, SW - FW + (1 - xFrac) * FW, cy, r, hexToRgba(theme.frameText, 0.5));
      }
    }
    // Blue dot row along centerline of frame
    for (let yFrac = 0.03; yFrac < 0.98; yFrac += 0.07) {
      const cy = yFrac * decoH;
      dot(ctx, FW * 0.5, cy, 1.5, hexToRgba(theme.frameText, 0.2));
      dot(ctx, SW - FW * 0.5, cy, 1.5, hexToRgba(theme.frameText, 0.2));
    }
  } else if (theme.id === "love") {
    // Frame 2: Hearts + circles in side margins
    for (const [xFrac, yFrac, sizeMult] of SCATTER) {
      const r = 6 * sizeMult;
      const cy = yFrac * decoH;
      if (sizeMult > 0.8) {
        drawHeart(ctx, xFrac * FW, cy, r, hexToRgba(theme.frameText, 0.9));
        drawHeart(ctx, SW - FW + (1 - xFrac) * FW, cy, r, hexToRgba(theme.frameText, 0.9));
      } else if (sizeMult > 0.6) {
        drawCircle(ctx, xFrac * FW, cy, r * 0.9, hexToRgba(theme.frameText, 0.7));
        drawCircle(ctx, SW - FW + (1 - xFrac) * FW, cy, r * 0.9, hexToRgba(theme.frameText, 0.7));
      } else {
        dot(ctx, xFrac * FW, cy, r * 0.5, hexToRgba(theme.frameText, 0.55));
        dot(ctx, SW - FW + (1 - xFrac) * FW, cy, r * 0.5, hexToRgba(theme.frameText, 0.55));
      }
    }
  } else if (theme.id === "night") {
    // Frame 3: Gold stars of varying sizes
    for (const [xFrac, yFrac, sizeMult] of SCATTER) {
      const r = 6.5 * sizeMult;
      const cy = yFrac * decoH;
      if (sizeMult > 0.85) {
        drawStar5(ctx, xFrac * FW, cy, r, hexToRgba(theme.frameText, 0.9));
        drawStar5(ctx, SW - FW + (1 - xFrac) * FW, cy, r, hexToRgba(theme.frameText, 0.9));
      } else {
        dot(ctx, xFrac * FW, cy, r * 0.45, hexToRgba(theme.frameText, 0.6));
        dot(ctx, SW - FW + (1 - xFrac) * FW, cy, r * 0.45, hexToRgba(theme.frameText, 0.6));
      }
    }
  }

  // 6. Load and draw photos
  for (let i = 0; i < photos.length; i++) {
    const photoY = TOP + i * (PH + GAP);
    const img = new Image();
    await new Promise<void>((resolve) => {
      img.onload = () => {
        drawPhotoClip(ctx, theme.clip, img, FW, photoY, PW, PH);

        // Oval frame outline for love theme
        if (theme.clip === "oval") {
          ctx.save();
          ctx.strokeStyle = hexToRgba(theme.borderColor, 0.55);
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(FW + PW / 2, photoY + PH / 2, PW / 2 * 0.9, PH / 2 * 0.9, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // Gold glow border for night theme
        if (theme.id === "night") {
          ctx.save();
          ctx.strokeStyle = hexToRgba(theme.frameText, 0.55);
          ctx.lineWidth = 2.5;
          rrect(ctx, FW + 1, photoY + 1, PW - 2, PH - 2, 0);
          ctx.stroke();
          ctx.restore();
        }

        // Number badge
        const badgeColor = theme.id === "night" ? "#F59E0B" : hexToRgba(theme.frameBg, 0.92);
        dot(ctx, FW + 16, photoY + 16, 13, badgeColor);
        ctx.fillStyle = theme.id === "night" ? "#0f172a" : theme.frameText;
        ctx.font = "bold 11px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${i + 1}`, FW + 16, photoY + 16);

        resolve();
      };
      img.src = photos[i];
    });
  }

  // 7. Footer
  const fy = SH - FOOT;
  ctx.fillStyle = theme.footerBg;
  ctx.fillRect(0, fy, SW, FOOT);

  // Separator
  ctx.fillStyle = hexToRgba(theme.frameText, 0.15);
  ctx.fillRect(0, fy, SW, 1);

  const dateText = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (logoLoaded && logoImg.naturalWidth > 0) {
    const logoH = 40;
    const logoW = Math.round(logoImg.naturalWidth * (logoH / logoImg.naturalHeight));
    ctx.globalAlpha = theme.id === "night" ? 0.88 : 0.94;
    if (theme.id === "night") {
      // Tint logo gold for night theme
      const offscreen = document.createElement("canvas");
      offscreen.width = logoW; offscreen.height = logoH;
      const oc = offscreen.getContext("2d")!;
      oc.drawImage(logoImg, 0, 0, logoW, logoH);
      oc.globalCompositeOperation = "source-atop";
      oc.fillStyle = "#F59E0B";
      oc.globalAlpha = 0.55;
      oc.fillRect(0, 0, logoW, logoH);
      ctx.drawImage(offscreen, (SW - logoW) / 2, fy + 8, logoW, logoH);
    } else {
      ctx.drawImage(logoImg, (SW - logoW) / 2, fy + 8, logoW, logoH);
    }
    ctx.globalAlpha = 1;

    ctx.font = "10px Arial";
    ctx.fillStyle = hexToRgba(theme.footerText, 0.72);
    ctx.fillText("Studio Foto  •  Pringsewu, Lampung", SW / 2, fy + 58);

    ctx.font = "9px Arial";
    ctx.fillStyle = hexToRgba(theme.footerText, 0.50);
    ctx.fillText(dateText, SW / 2, fy + 74);
  } else {
    ctx.fillStyle = theme.footerText;
    ctx.font = "bold 16px Arial";
    ctx.fillText("AideaCreative Studio Foto", SW / 2, fy + 24);

    ctx.font = "10px Arial";
    ctx.fillStyle = hexToRgba(theme.footerText, 0.72);
    ctx.fillText("Studio Foto  •  Pringsewu, Lampung", SW / 2, fy + 46);

    ctx.font = "9px Arial";
    ctx.fillStyle = hexToRgba(theme.footerText, 0.50);
    ctx.fillText(dateText, SW / 2, fy + 66);
  }

  return canvas.toDataURL("image/png");
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
  const [retakingIdx, setRetakingIdx] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const photosRef = useRef<string[]>([]);
  photosRef.current = photos;

  // ── Sticker drag — mouse ──
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

  // ── Sticker drag — touch ──
  const handleStickerTouchStart = (e: React.TouchEvent, id: string) => {
    e.preventDefault();
    setDraggingId(id);
  };

  const handleStripTouchMove = (e: React.TouchEvent) => {
    if (!draggingId || !stripRef.current) return;
    e.preventDefault();
    const touch = e.touches[0];
    const rect = stripRef.current.getBoundingClientRect();
    const x = Math.max(0.02, Math.min(0.98, (touch.clientX - rect.left) / rect.width));
    const y = Math.max(0.02, Math.min(0.98, (touch.clientY - rect.top) / rect.height));
    setStickers((prev) => prev.map((s) => s.id === draggingId ? { ...s, x, y } : s));
  };

  const handleStripTouchEnd = () => setDraggingId(null);

  // ── Camera ──
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

  // Single-photo retake countdown
  const runCountdownSingle = useCallback((idx: number) => {
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
            setPhotos((prev) => {
              const next = [...prev];
              next[idx] = dataUrl;
              return next;
            });
            setRetakingIdx(null);
            setStep("processing");
          }
        }, 200);
      }
    };
    timerRef.current = setTimeout(tick, 1000);
  }, [captureFrame]);

  // Full sequence countdown
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

  // ── Strip generation ──
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

  // Retake all
  const retakeAll = useCallback(async () => {
    setPhotos([]);
    setStripUrl(null);
    setStickers([]);
    setShotIdx(0);
    setRetakingIdx(null);
    setStep("preview");
    await startCamera();
  }, [startCamera]);

  // Retake single photo
  const handleRetakePhoto = useCallback(async (idx: number) => {
    setRetakingIdx(idx);
    setStep("preview");
    await startCamera();
  }, [startCamera]);

  const startRetake = useCallback(() => {
    if (retakingIdx !== null) {
      timerRef.current = setTimeout(() => runCountdownSingle(retakingIdx), 300);
    } else {
      startCapture();
    }
  }, [retakingIdx, runCountdownSingle, startCapture]);

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

  const isCapturing = step === "countdown" || step === "flash" || step === "between" || step === "processing";
  const showCamera = step === "preview" || isCapturing;

  return (
    <div className="bg-muted/30 min-h-screen">
      <div className="container mx-auto px-4 md:px-6 py-8 md:py-12">

        {/* Header */}
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
              ? retakingIdx !== null
                ? `Bersiap foto ulang nomor ${retakingIdx + 1}. Klik Mulai Ulang saat siap.`
                : "Posisikan diri kamu, lalu klik Mulai Foto — countdown 3-2-1 otomatis dimulai."
              : "Foto berhasil diambil! Pilih frame dan download photo strip kamu."}
          </p>
        </div>

        {/* ── CAMERA SCREEN ── */}
        {showCamera && (
          <div className="flex flex-col items-center gap-5">
            <div className="relative w-full max-w-2xl">

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

                {camError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted/90 px-6">
                    <p className="text-sm text-center text-muted-foreground">{camError}</p>
                  </div>
                )}

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
                        {retakingIdx !== null
                          ? `Foto ulang ${retakingIdx + 1}`
                          : `Foto ${shotIdx + 1} dari ${TOTAL_SHOTS}`}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {step === "between" && (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ background: "rgba(0,0,0,0.4)" }}
                  >
                    <div className="text-center">
                      <p className="text-white font-bold text-xl drop-shadow">Foto {photos.length} selesai</p>
                      <p className="text-white/70 text-sm mt-1">Bersiap foto {photos.length + 1}...</p>
                    </div>
                  </div>
                )}

                {step === "processing" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <p className="text-white font-semibold">Membuat photo strip...</p>
                  </div>
                )}

                {isCapturing && step !== "processing" && (
                  <div className="absolute top-3 right-3 rounded-full px-3 py-1 text-xs font-bold bg-white/90 text-foreground shadow">
                    {retakingIdx !== null ? `Ulang ${retakingIdx + 1}` : `${photos.length} / ${TOTAL_SHOTS}`}
                  </div>
                )}

                {step === "preview" && (
                  <div className="absolute inset-x-0 bottom-0 flex flex-col items-center pb-5 gap-2 bg-gradient-to-t from-black/30 to-transparent pt-8">
                    <Button
                      onClick={startRetake}
                      size="lg"
                      className="h-12 px-10 rounded-full font-semibold shadow-lg"
                    >
                      {retakingIdx !== null ? `Mulai Ulang Foto ${retakingIdx + 1}` : "Mulai Foto"}
                    </Button>
                    {retakingIdx !== null && (
                      <button
                        onClick={retakeAll}
                        className="text-white/80 text-xs hover:text-white underline"
                      >
                        Batal, kembali ke hasil
                      </button>
                    )}
                  </div>
                )}
              </div>

              {step === "preview" && (
                <div className="mt-3 flex items-center justify-between px-1">
                  <p className="text-xs text-muted-foreground">
                    {retakingIdx !== null ? `Mengganti foto nomor ${retakingIdx + 1}` : "4 foto akan diambil otomatis secara berurutan"}
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

              {isCapturing && step !== "processing" && retakingIdx === null && (
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
            {/* Right: strip preview + stickers — shown FIRST on mobile */}
            <div className="lg:hidden w-full space-y-3">
              <div className="bg-background rounded-2xl border border-border p-4 shadow-sm">
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                  Preview Strip
                </p>
                {stripLoading ? (
                  <div className="flex flex-col gap-1.5">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="w-full aspect-[4/3] rounded-lg bg-muted animate-pulse" />
                    ))}
                    <p className="text-[10px] text-muted-foreground text-center mt-1">Memproses...</p>
                  </div>
                ) : stripUrl ? (
                  <div
                    ref={stripRef}
                    className="rounded-xl overflow-hidden shadow-md relative select-none mx-auto"
                    style={{
                      border: `3px solid ${theme.borderColor}`,
                      cursor: draggingId ? "grabbing" : "default",
                      touchAction: draggingId ? "none" : "auto",
                      maxWidth: 280,
                    }}
                    onMouseMove={handleStripMouseMove}
                    onMouseUp={handleStripMouseUp}
                    onMouseLeave={handleStripMouseUp}
                    onTouchMove={handleStripTouchMove}
                    onTouchEnd={handleStripTouchEnd}
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
                          touchAction: "none",
                        }}
                        onMouseDown={(e) => handleStickerMouseDown(e, s.id)}
                        onTouchStart={(e) => handleStickerTouchStart(e, s.id)}
                        onDoubleClick={() => setStickers((prev) => prev.filter((x) => x.id !== s.id))}
                        title="Geser untuk pindahkan · Klik 2× untuk hapus"
                      >
                        {s.emoji}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

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
                      <p className="text-[10px] text-muted-foreground">{stickers.length} stiker · geser pindah · klik 2× hapus</p>
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

            {/* Left: photos + theme picker */}
            <div className="flex-1 min-w-0 space-y-5">

              {/* 4 captured photos with individual retake */}
              <div className="bg-background rounded-2xl border border-border p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold">Hasil Foto</p>
                  <p className="text-xs text-muted-foreground">Hover foto untuk foto ulang individual</p>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {photos.map((p, i) => (
                    <div
                      key={i}
                      className="relative rounded-xl overflow-hidden aspect-[4/3] bg-muted ring-1 ring-border group cursor-pointer"
                      onClick={() => handleRetakePhoto(i)}
                    >
                      <img src={p} className="w-full h-full object-cover" alt={`foto ${i + 1}`} />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                        <RotateCcw className="h-4 w-4 text-white" />
                        <span className="text-white text-[10px] font-semibold">Ulang</span>
                      </div>
                      <span className="absolute top-1.5 left-1.5 bg-black/50 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                        {i + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Theme picker */}
              <div className="bg-background rounded-2xl border border-border p-5 shadow-sm">
                <p className="text-sm font-semibold mb-4">Pilih Frame</p>
                <div className="grid grid-cols-3 gap-3">
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
                        {/* Mini preview */}
                        <div
                          className="w-full h-20 rounded-md mb-2.5 overflow-hidden relative flex"
                          style={{ background: t.frameBg }}
                        >
                          <div className="w-8 shrink-0 flex flex-col items-center justify-around py-1 px-1">
                            {t.id === "love" ? (
                              ["💖", "💕", "💗"].map((h, i) => <span key={i} className="text-[8px]">{h}</span>)
                            ) : t.id === "night" ? (
                              ["⭐", "✦", "⭐"].map((s, i) => <span key={i} style={{ color: t.frameText, fontSize: 8, opacity: 0.8 }}>{s}</span>)
                            ) : (
                              [0, 1, 2].map((_, i) => <div key={i} className="w-1.5 h-1.5 rounded-full opacity-60" style={{ background: t.frameText }} />)
                            )}
                          </div>
                          <div className="flex-1 flex flex-col gap-0.5 py-1" style={{ background: t.stripBg }}>
                            {[0, 1, 2, 3].map((_, i) => (
                              <div
                                key={i}
                                className="flex-1 opacity-30 rounded-sm mx-0.5"
                                style={{
                                  background: t.id === "night" ? "#475569" : t.borderColor,
                                  borderRadius: t.clip === "oval" ? "50%" : "2px",
                                }}
                              />
                            ))}
                          </div>
                          <div className="w-8 shrink-0 flex flex-col items-center justify-around py-1 px-1">
                            {t.id === "love" ? (
                              ["💕", "💖", "💗"].map((h, i) => <span key={i} className="text-[8px]">{h}</span>)
                            ) : t.id === "night" ? (
                              ["✦", "⭐", "✦"].map((s, i) => <span key={i} style={{ color: t.frameText, fontSize: 8, opacity: 0.8 }}>{s}</span>)
                            ) : (
                              [0, 1, 2].map((_, i) => <div key={i} className="w-1.5 h-1.5 rounded-full opacity-60" style={{ background: t.frameText }} />)
                            )}
                          </div>
                          <div className="absolute inset-x-0 bottom-0 h-3 flex items-center justify-center" style={{ background: t.footerBg }}>
                            <div className="h-0.5 w-10 rounded-full opacity-50" style={{ background: t.footerText }} />
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
                  onClick={retakeAll}
                  variant="outline"
                  className="h-11 rounded-xl font-semibold gap-2 px-5"
                >
                  <RefreshCw className="h-4 w-4" />
                  Ulang Semua
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

            {/* Right: strip preview + stickers — desktop only (mobile version shown above) */}
            <div className="hidden lg:block lg:w-[300px] shrink-0 sticky top-24 space-y-3">
              <div className="bg-background rounded-2xl border border-border p-4 shadow-sm">
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                  Preview Strip
                </p>
                {stripLoading ? (
                  <div className="flex flex-col gap-1.5">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="w-full aspect-[4/3] rounded-lg bg-muted animate-pulse" />
                    ))}
                    <p className="text-[10px] text-muted-foreground text-center mt-1">Memproses...</p>
                  </div>
                ) : stripUrl ? (
                  <div
                    ref={stripRef}
                    className="rounded-xl overflow-hidden shadow-md relative select-none"
                    style={{ border: `3px solid ${theme.borderColor}`, cursor: draggingId ? "grabbing" : "default", touchAction: draggingId ? "none" : "auto" }}
                    onMouseMove={handleStripMouseMove}
                    onMouseUp={handleStripMouseUp}
                    onMouseLeave={handleStripMouseUp}
                    onTouchMove={handleStripTouchMove}
                    onTouchEnd={handleStripTouchEnd}
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
                          touchAction: "none",
                        }}
                        onMouseDown={(e) => handleStickerMouseDown(e, s.id)}
                        onTouchStart={(e) => handleStickerTouchStart(e, s.id)}
                        onDoubleClick={() => setStickers((prev) => prev.filter((x) => x.id !== s.id))}
                        title="Geser untuk pindahkan · Klik 2× untuk hapus"
                      >
                        {s.emoji}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Emoji palette */}
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
                      <p className="text-[10px] text-muted-foreground">{stickers.length} stiker · geser pindah · klik 2× hapus</p>
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
