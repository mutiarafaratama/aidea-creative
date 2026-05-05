import { useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const { handleOAuthToken } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const redirect = params.get("redirect") ?? "/";
    const error = params.get("error");

    if (error) {
      setLocation(`/login?oauth_error=${encodeURIComponent(error)}`);
      return;
    }

    if (token) {
      handleOAuthToken(token).then(() => {
        const safeRedirect =
          redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/";
        setLocation(safeRedirect);
      });
      return;
    }

    const hash = window.location.hash.slice(1);
    const hashParams = new URLSearchParams(hash);
    const supabaseToken = hashParams.get("access_token");

    if (supabaseToken) {
      fetch("/api/auth/supabase-exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: supabaseToken }),
        credentials: "include",
      })
        .then((r) => r.json())
        .then(async (data) => {
          if (data.token) {
            await handleOAuthToken(data.token);
            const safeRedirect =
              redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/";
            setLocation(safeRedirect);
          } else {
            setLocation(`/login?oauth_error=${encodeURIComponent(data.error ?? "unknown")}`);
          }
        })
        .catch(() => setLocation("/login?oauth_error=server_error"));
      return;
    }

    setLocation("/login");
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Memproses login Google…</p>
      </div>
    </div>
  );
}
