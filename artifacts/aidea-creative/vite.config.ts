import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { VitePWA } from "vite-plugin-pwa";

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    "BASE_PATH environment variable is required but was not provided.",
  );
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "pwa-192.png", "pwa-512.png", "opengraph.jpg"],
      devOptions: { enabled: false },
      manifest: {
        name: "AideaCreative Studio Foto",
        short_name: "AideaCreative",
        description: "Studio Foto profesional di Pringsewu, Lampung. Wedding, Portrait, Produk & Event.",
        theme_color: "#1d4ed8",
        background_color: "#ffffff",
        display: "standalone",
        display_override: ["standalone", "minimal-ui"],
        orientation: "portrait-primary",
        start_url: "/",
        scope: "/",
        lang: "id",
        dir: "ltr",
        prefer_related_applications: false,
        icons: [
          { src: "/pwa-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        screenshots: [
          {
            src: "/opengraph.jpg",
            sizes: "1200x630",
            type: "image/jpeg",
            form_factor: "wide",
            label: "AideaCreative Studio Foto",
          },
        ],
        shortcuts: [
          {
            name: "Booking Sesi Foto",
            short_name: "Booking",
            description: "Pesan sesi foto sekarang",
            url: "/booking",
            icons: [{ src: "/pwa-192.png", sizes: "192x192" }],
          },
          {
            name: "Lihat Portfolio",
            short_name: "Portfolio",
            description: "Galeri hasil foto studio",
            url: "/portfolio",
            icons: [{ src: "/pwa-192.png", sizes: "192x192" }],
          },
          {
            name: "Toko Produk",
            short_name: "Toko",
            description: "Beli produk foto & cetak",
            url: "/toko",
            icons: [{ src: "/pwa-192.png", sizes: "192x192" }],
          },
        ],
        categories: ["photography", "business", "lifestyle"],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff,woff2}"],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\/api\/(?!pesanan|booking|me|auth)/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "api-static-cache",
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 10 },
            },
          },
          {
            urlPattern: /\/api\/(pesanan|booking|me|auth)/,
            handler: "NetworkOnly",
          },
          {
            urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "cloudinary-images",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    proxy: {
      "/api": {
        target: "http://localhost:8099",
        changeOrigin: true,
      },
    },
    // Pre-compile the heaviest, most-visited entries at server start so the
    // first page load doesn't have to wait for on-demand transforms.
    warmup: {
      clientFiles: [
        "./src/main.tsx",
        "./src/App.tsx",
        "./src/components/admin-layout.tsx",
        "./src/components/layout.tsx",
        "./src/lib/auth.tsx",
        "./src/pages/admin/produk.tsx",
        "./src/pages/admin/beranda.tsx",
        "./src/pages/home.tsx",
      ],
    },
  },
  optimizeDeps: {
    // Force Vite to pre-bundle these into a single dep chunk (instead of
    // serving each module file individually over many HTTP requests).
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "wouter",
      "@tanstack/react-query",
      "@supabase/supabase-js",
      "lucide-react",
      "framer-motion",
      "@workspace/api-client-react",
    ],
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
