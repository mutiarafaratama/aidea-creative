import { useEffect, useState, useCallback } from "react";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function getAuthHeaders() {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

export type PushStatus = "unsupported" | "denied" | "subscribed" | "unsubscribed" | "loading";

export function usePushSubscription() {
  const [status, setStatus] = useState<PushStatus>("loading");
  const [isToggling, setIsToggling] = useState(false);

  const checkStatus = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !VAPID_PUBLIC_KEY) {
      setStatus("unsupported");
      return;
    }
    const permission = Notification.permission;
    if (permission === "denied") { setStatus("denied"); return; }

    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      setStatus(existing ? "subscribed" : "unsubscribed");
    } catch {
      setStatus("unsubscribed");
    }
  }, []);

  useEffect(() => { checkStatus(); }, [checkStatus]);

  const subscribe = useCallback(async () => {
    if (isToggling) return;
    setIsToggling(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setStatus("denied"); return; }

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const headers = await getAuthHeaders();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers,
        body: JSON.stringify(subscription.toJSON()),
      });

      setStatus("subscribed");
    } catch (e) {
      console.error("Push subscribe error:", e);
    } finally {
      setIsToggling(false);
    }
  }, [isToggling]);

  const unsubscribe = useCallback(async () => {
    if (isToggling) return;
    setIsToggling(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        const headers = await getAuthHeaders();
        await fetch("/api/push/unsubscribe", {
          method: "DELETE",
          headers,
          body: JSON.stringify({ endpoint: existing.endpoint }),
        });
        await existing.unsubscribe();
      }
      setStatus("unsubscribed");
    } catch (e) {
      console.error("Push unsubscribe error:", e);
    } finally {
      setIsToggling(false);
    }
  }, [isToggling]);

  const toggle = useCallback(() => {
    if (status === "subscribed") unsubscribe();
    else subscribe();
  }, [status, subscribe, unsubscribe]);

  return { status, isToggling, toggle, subscribe, unsubscribe };
}
