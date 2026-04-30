import { useQuery } from "@tanstack/react-query";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export type SiteSettings = {
  heroImage?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroBadge?: string;
  loginBgImage?: string;
  aboutTitle?: string;
  aboutText?: string;
  contactWhatsapp?: string;
  contactEmail?: string;
  contactAddress?: string;
  instagramUrl?: string;
  [key: string]: any;
};

export function useSiteSettings() {
  return useQuery<SiteSettings>({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/settings`);
      if (!res.ok) return {};
      return res.json();
    },
    staleTime: 60_000,
  });
}
