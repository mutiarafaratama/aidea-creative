import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

export type Profile = {
  id: string;
  nama_lengkap: string;
  no_telepon: string | null;
  alamat: string | null;
  foto_profil: string | null;
  role: "admin" | "pelanggan";
};

export type AuthUser = {
  id: string;
  email: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  profile: Profile | null;
  isLoading: boolean;
  profileChecked: boolean;
  token: string | null;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (opts: { email: string; password: string; namaLengkap: string; noTelepon?: string }) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  handleOAuthToken: (token: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const TOKEN_KEY = "auth_token";

function getStoredToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

function storeToken(token: string) {
  try { localStorage.setItem(TOKEN_KEY, token); } catch {}
}

function clearToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch {}
}

async function apiFetch<T>(path: string, opts: RequestInit = {}, token?: string | null): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const t = token ?? getStoredToken();
  if (t) headers["Authorization"] = `Bearer ${t}`;
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers: { ...headers, ...(opts.headers as Record<string, string> ?? {}) }, credentials: "include" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

async function loadProfileFromServer(token: string): Promise<{ user: AuthUser; profile: Profile } | null> {
  try {
    const data = await apiFetch<{ user: AuthUser; profile: any }>("/api/auth/me", {}, token);
    if (!data?.profile) return null;
    return {
      user: data.user,
      profile: {
        id: data.profile.id,
        nama_lengkap: data.profile.namaLengkap,
        no_telepon: data.profile.noTelepon,
        alamat: data.profile.alamat,
        foto_profil: data.profile.fotoProfil,
        role: data.profile.role,
      },
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileChecked, setProfileChecked] = useState(false);

  const refreshProfile = async () => {
    const t = token ?? getStoredToken();
    if (!t) {
      setUser(null);
      setProfile(null);
      setProfileChecked(true);
      return;
    }
    const result = await loadProfileFromServer(t);
    if (result) {
      setUser(result.user);
      setProfile(result.profile);
    } else {
      setUser(null);
      setProfile(null);
    }
    setProfileChecked(true);
  };

  useEffect(() => {
    const t = getStoredToken();
    setToken(t);

    setAuthTokenGetter(async () => getStoredToken());

    if (!t) {
      setIsLoading(false);
      setProfileChecked(true);
      return;
    }

    loadProfileFromServer(t).then((result) => {
      if (result) {
        setUser(result.user);
        setProfile(result.profile);
      } else {
        clearToken();
        setToken(null);
      }
      setProfileChecked(true);
      setIsLoading(false);
    }).catch(() => {
      setProfileChecked(true);
      setIsLoading(false);
    });

    return () => {
      setAuthTokenGetter(null);
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    try {
      const data = await apiFetch<{ token: string; user: AuthUser; profile: any }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      storeToken(data.token);
      setToken(data.token);
      setAuthTokenGetter(async () => data.token);
      setUser(data.user);
      setProfile({
        id: data.profile.id,
        nama_lengkap: data.profile.namaLengkap,
        no_telepon: data.profile.noTelepon,
        alamat: data.profile.alamat,
        foto_profil: data.profile.fotoProfil,
        role: data.profile.role,
      });
      setProfileChecked(true);
      return {};
    } catch (err: any) {
      return { error: err.message ?? "Login gagal." };
    }
  };

  const signUp = async (opts: { email: string; password: string; namaLengkap: string; noTelepon?: string }): Promise<{ error?: string }> => {
    try {
      const data = await apiFetch<{ token: string; user: AuthUser; profile: any }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(opts),
      });
      storeToken(data.token);
      setToken(data.token);
      setAuthTokenGetter(async () => data.token);
      setUser(data.user);
      setProfile({
        id: data.profile.id,
        nama_lengkap: data.profile.namaLengkap,
        no_telepon: data.profile.noTelepon,
        alamat: data.profile.alamat,
        foto_profil: data.profile.fotoProfil,
        role: data.profile.role,
      });
      setProfileChecked(true);
      return {};
    } catch (err: any) {
      return { error: err.message ?? "Registrasi gagal." };
    }
  };

  const signOut = async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {}
    clearToken();
    setToken(null);
    setUser(null);
    setProfile(null);
    setProfileChecked(true);
    setAuthTokenGetter(null);
    if (typeof window !== "undefined") {
      window.location.replace("/login");
    }
  };

  const handleOAuthToken = async (newToken: string) => {
    storeToken(newToken);
    setToken(newToken);
    setAuthTokenGetter(async () => newToken);
    const result = await loadProfileFromServer(newToken);
    if (result) {
      setUser(result.user);
      setProfile(result.profile);
    }
    setProfileChecked(true);
    setIsLoading(false);
  };

  const value = useMemo<AuthContextValue>(
    () => ({ user, profile, isLoading, profileChecked, token, refreshProfile, signIn, signUp, signOut, handleOAuthToken }),
    [user, profile, isLoading, profileChecked, token],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
