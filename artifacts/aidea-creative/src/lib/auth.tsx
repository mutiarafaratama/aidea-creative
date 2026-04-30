import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { supabase } from "@/lib/supabase";

export type Profile = {
  id: string;
  nama_lengkap: string;
  no_telepon: string | null;
  alamat: string | null;
  foto_profil: string | null;
  role: "admin" | "pelanggan";
};

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  profileChecked: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function loadProfile(_userId: string): Promise<Profile | null> {
  if (!supabase) return null;
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  if (!token) return null;
  // Use server-side /api/me which auto-provisions the profile row and
  // promotes known admin emails to role='admin'.
  try {
    const res = await fetch(`${API_BASE}/api/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const body = await res.json();
    const p = body.profile;
    if (!p) return null;
    return {
      id: p.id,
      nama_lengkap: p.namaLengkap,
      no_telepon: p.noTelepon,
      alamat: p.alamat,
      foto_profil: p.fotoProfil,
      role: p.role,
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileChecked, setProfileChecked] = useState(false);

  const refreshProfile = async () => {
    if (!session?.user.id) {
      setProfile(null);
      setProfileChecked(true);
      return;
    }
    setProfile(await loadProfile(session.user.id));
    setProfileChecked(true);
  };

  useEffect(() => {
    setAuthTokenGetter(async () => {
      if (!supabase) return null;
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token ?? null;
    });

    if (!supabase) {
      setIsLoading(false);
      return;
    }

    let mounted = true;

    const safetyTimer = setTimeout(() => {
      if (mounted) {
        setIsLoading(false);
        setProfileChecked(true);
      }
    }, 3000);

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user.id) {
        try {
          setProfile(await loadProfile(data.session.user.id));
        } catch {
          setProfile(null);
        }
      }
      setProfileChecked(true);
      setIsLoading(false);
    }).catch(() => {
      if (mounted) {
        setProfileChecked(true);
        setIsLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (nextSession?.user.id) {
        setIsLoading(true);
        setProfileChecked(false);
      }
      setSession(nextSession);
      if (nextSession?.user.id) {
        try {
          setProfile(await loadProfile(nextSession.user.id));
        } catch {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setProfileChecked(true);
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      listener.subscription.unsubscribe();
      setAuthTokenGetter(null);
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      profile,
      isLoading,
      profileChecked,
      refreshProfile,
      signOut: async () => {
        try {
          if (supabase) {
            await Promise.race([
              supabase.auth.signOut({ scope: "local" }),
              new Promise((resolve) => setTimeout(resolve, 1500)),
            ]);
          }
        } catch (err) {
          console.error("signOut error", err);
        }
        setSession(null);
        setProfile(null);
        try {
          Object.keys(localStorage)
            .filter((k) => k.startsWith("sb-") || k.toLowerCase().includes("supabase") || k.toLowerCase().includes("auth"))
            .forEach((k) => localStorage.removeItem(k));
          Object.keys(sessionStorage)
            .filter((k) => k.startsWith("sb-") || k.toLowerCase().includes("supabase"))
            .forEach((k) => sessionStorage.removeItem(k));
        } catch {}
        if (typeof window !== "undefined") {
          window.location.replace("/login");
        }
      },
    }),
    [session, profile, isLoading, profileChecked],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}