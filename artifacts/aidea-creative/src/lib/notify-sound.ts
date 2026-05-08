/**
 * Lightweight Web Audio API notification sounds — no external files needed.
 * All sounds are synthesized in the browser.
 */

let _ctx: AudioContext | null = null;

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

/** Lembut — untuk pesan masuk di chatbot */
export function soundNewMessage() {
  playTone(880, 0.18, 0.2, "sine");
  setTimeout(() => playTone(1100, 0.15, 0.15, "sine"), 120);
}

/** Lebih tegas — untuk update status booking/pesanan */
export function soundStatusUpdate() {
  playTone(660, 0.12, 0.22, "sine");
  setTimeout(() => playTone(880, 0.12, 0.22, "sine"), 100);
  setTimeout(() => playTone(1100, 0.18, 0.18, "sine"), 200);
}

/** Urgent — untuk notifikasi admin (permintaan chat baru) */
export function soundAdminAlert() {
  playTone(880, 0.1, 0.3, "square");
  setTimeout(() => playTone(880, 0.1, 0.3, "square"), 180);
  setTimeout(() => playTone(1100, 0.2, 0.25, "sine"), 380);
}

/**
 * Panggil ini saat user pertama berinteraksi dengan halaman untuk
 * "unlock" AudioContext (browser blokir audio sebelum user gesture).
 */
export function unlockAudio() {
  const ctx = getCtx();
  if (ctx && ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
}
