import { supabase } from "@/lib/supabase";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function getToken() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function adminFetch<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  // Ensure every admin call goes through `/api/*` so Vite's dev proxy
  // forwards it to the backend instead of returning the SPA HTML.
  const normalized = path.startsWith("/api/") ? path : `/api${path.startsWith("/") ? "" : "/"}${path}`;
  const res = await fetch(`${API_BASE}${normalized}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return null as T;
  return res.json();
}
