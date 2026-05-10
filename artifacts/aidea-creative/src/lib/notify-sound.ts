/**
 * Notification sounds — tries custom audio file first, falls back to Web Audio synthesis.
 * Place your sound file at /sounds/notif.mp3 (in public/sounds/)
 */

let _ctx: AudioContext | null = null;
let _customAudio: HTMLAudioElement | null = null;
const CUSTOM_SOUND_SRC = "/sounds/notif.mp3";

function getCtx(): AudioContext | null {
  try {
    if (!_ctx || _ctx.state === "closed") {
      _ctx = new AudioContext();
    }
    return _ctx;
  } catch {
    return null;
  }
}

function tryCustomAudio(): boolean {
  try {
    if (!_customAudio) {
      const a = new Audio(CUSTOM_SOUND_SRC);
      a.preload = "none";
      _customAudio = a;
    }
    const clone = _customAudio.cloneNode() as HTMLAudioElement;
    clone.volume = 0.7;
    const p = clone.play();
    if (p) {
      p.catch(() => {});
    }
    return true;
  } catch {
    return false;
  }
}

async function checkCustomAudioExists(): Promise<boolean> {
  try {
    const res = await fetch(CUSTOM_SOUND_SRC, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

let _hasCustomAudio: boolean | null = null;

async function playNotifSound(fallback: () => void): Promise<void> {
  if (_hasCustomAudio === null) {
    _hasCustomAudio = await checkCustomAudioExists();
  }
  if (_hasCustomAudio) {
    tryCustomAudio();
  } else {
    fallback();
  }
}

function playTone(
  freq: number,
  durationSec: number,
  volume = 0.25,
  type: OscillatorType = "sine",
  delayStart = 0,
): Promise<void> {
  return new Promise((resolve) => {
    const ctx = getCtx();
    if (!ctx) { resolve(); return; }
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.value = freq;
      const start = ctx.currentTime + delayStart;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(volume, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + durationSec);
      osc.start(start);
      osc.stop(start + durationSec);
      osc.onended = () => resolve();
    } catch {
      resolve();
    }
  });
}

function synthNewMessage() {
  playTone(880, 0.18, 0.2, "sine");
  setTimeout(() => playTone(1100, 0.15, 0.15, "sine"), 120);
}

function synthStatusUpdate() {
  playTone(660, 0.12, 0.22, "sine");
  setTimeout(() => playTone(880, 0.12, 0.22, "sine"), 100);
  setTimeout(() => playTone(1100, 0.18, 0.18, "sine"), 200);
}

function synthAdminAlert() {
  playTone(880, 0.1, 0.3, "square");
  setTimeout(() => playTone(880, 0.1, 0.3, "square"), 180);
  setTimeout(() => playTone(1100, 0.2, 0.25, "sine"), 380);
}

/** Lembut — untuk pesan masuk di chatbot */
export function soundNewMessage() {
  playNotifSound(synthNewMessage);
}

/** Tegas — untuk update status booking/pesanan */
export function soundStatusUpdate() {
  playNotifSound(synthStatusUpdate);
}

/** Urgent — untuk notifikasi admin */
export function soundAdminAlert() {
  playNotifSound(synthAdminAlert);
}

/** Vibrate helper — no-op on unsupported devices */
export function vibrate(pattern: number | number[] = [200, 50, 200]) {
  try {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  } catch { }
}

/**
 * Panggil ini saat user pertama berinteraksi untuk "unlock" AudioContext.
 * Reset _hasCustomAudio so the file check runs again if needed.
 */
export function unlockAudio() {
  const ctx = getCtx();
  if (ctx && ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
}
