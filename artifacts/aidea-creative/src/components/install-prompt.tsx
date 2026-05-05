import { useState, useEffect } from "react";
import { X, Share, Smartphone } from "lucide-react";

type PromptState = "idle" | "android" | "ios" | "dismissed";

function isIOS() {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    !(window as any).MSStream
  );
}

function isSafariBrowser() {
  return (
    /safari/i.test(navigator.userAgent) &&
    !/chrome|crios|fxios/i.test(navigator.userAgent)
  );
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

export function InstallPrompt() {
  const [state, setState] = useState<PromptState>("idle");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    if (isStandalone()) return;

    try {
      const dismissed = localStorage.getItem("pwa-prompt-dismissed-v2");
      if (dismissed) return;
    } catch { }

    if (isIOS() && isSafariBrowser()) {
      const t = setTimeout(() => setState("ios"), 4000);
      return () => clearTimeout(t);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setState("android");
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    setState("dismissed");
    try { localStorage.setItem("pwa-prompt-dismissed-v2", "1"); } catch { }
  };

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (result.outcome === "accepted") {
      setState("dismissed");
    }
  };

  if (state === "idle" || state === "dismissed") return null;

  return (
    <div
      role="dialog"
      aria-label="Pasang aplikasi AideaCreative"
      className="fixed bottom-4 inset-x-0 z-50 flex justify-center px-4 pointer-events-none"
    >
      <div className="pointer-events-auto w-full max-w-sm bg-background border border-border rounded-2xl shadow-2xl shadow-black/15 p-4 flex items-center gap-3 animate-in slide-in-from-bottom-4 fade-in duration-300">
        <img
          src="/pwa-192.png"
          alt="AideaCreative"
          className="h-12 w-12 rounded-xl shrink-0 border border-border"
        />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight">
            Pasang Aplikasi
          </p>
          {state === "android" ? (
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
              Tambahkan ke layar utama untuk akses lebih cepat
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug flex items-center gap-1 flex-wrap">
              Ketuk{" "}
              <Share className="inline h-3 w-3 shrink-0" />
              {" "}lalu <strong className="font-semibold text-foreground">"Add to Home Screen"</strong>
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {state === "android" && (
            <button
              onClick={install}
              className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-primary/90 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <Smartphone className="h-3.5 w-3.5" />
              Pasang
            </button>
          )}
          <button
            onClick={dismiss}
            aria-label="Tutup"
            className="h-7 w-7 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
