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
      handleOAuthToken(token).then((result: any) => {
        const safeRedirect =
          redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/";
        // Redirect admin to dashboard if no specific redirect is given
        if (safeRedirect === "/" && result?.profile?.role === "admin") {
          setLocation("/dashboard");
        } else {
          setLocation(safeRedirect);
        }
      });
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
