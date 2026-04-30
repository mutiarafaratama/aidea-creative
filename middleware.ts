export const protectedRoutes = {
  admin: ["/dashboard"],
  authenticated: ["/profil"],
};

export function getLoginRedirect(pathname: string) {
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/profil")) {
    return `/login?redirect=${encodeURIComponent(pathname)}`;
  }
  return null;
}