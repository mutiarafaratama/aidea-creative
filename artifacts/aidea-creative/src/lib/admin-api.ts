const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function getToken(): string | null {
  try { return localStorage.getItem("auth_token"); } catch { return null; }
}

export async function adminFetch<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const normalized = path.startsWith("/api/") ? path : `/api${path.startsWith("/") ? "" : "/"}${path}`;
  const res = await fetch(`${API_BASE}${normalized}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return null as T;
  return res.json();
}
