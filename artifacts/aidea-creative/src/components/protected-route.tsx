import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

export function ProtectedRoute({
  children,
  requireAdmin = false,
}: {
  children: ReactNode;
  requireAdmin?: boolean;
}) {
  const [location, setLocation] = useLocation();
  const { user, profile, isLoading, profileChecked } = useAuth();

  // Hard cap: never show "Memeriksa akses..." for more than ~4s. After that,
  // force the page to render so the user is never stuck on the spinner.
  const [waitedTooLong, setWaitedTooLong] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setWaitedTooLong(true), 4000);
    return () => clearTimeout(t);
  }, []);

  // Pending = we know there's a user but haven't checked their profile yet.
  const profilePending = Boolean(user) && !profileChecked && !waitedTooLong;
  const effectiveLoading = (isLoading || profilePending) && !waitedTooLong;

  useEffect(() => {
    if (effectiveLoading) return;
    if (!user) {
      setLocation(`/login?redirect=${encodeURIComponent(location)}`);
      return;
    }
    // Only kick out of an admin route once we actually have a profile and
    // it is definitively not admin. A null profile is treated as "unknown"
    // and we let the page render rather than bouncing the user to /profil.
    if (requireAdmin && profile && profile.role !== "admin") {
      setLocation("/profil");
    }
  }, [effectiveLoading, user, profile, requireAdmin, location, setLocation]);

  // Spinner only while genuinely loading. For non-admin routes we render as
  // soon as we have a user. For admin routes we also require that the
  // profile (if loaded) is admin; if profile is null we still render so a
  // transient /api/me failure doesn't leave the user stuck.
  const blockForRole =
    requireAdmin && profile !== null && profile.role !== "admin";

  if (effectiveLoading || !user || blockForRole) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Memeriksa akses...
      </div>
    );
  }

  return <>{children}</>;
}
