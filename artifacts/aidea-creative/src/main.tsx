import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

setBaseUrl(import.meta.env.BASE_URL.replace(/\/$/, ""));

// Jika PWA service worker serve chunk lama yang sudah tidak ada (stale cache),
// dynamic import akan gagal → halaman blank. Reload otomatis untuk fix.
window.addEventListener("error", (event) => {
  const msg = event.message ?? "";
  if (
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Importing a module script failed") ||
    msg.includes("error loading dynamically imported module")
  ) {
    // Reload sekali saja — tandai di sessionStorage agar tidak loop
    if (!sessionStorage.getItem("chunk_reload")) {
      sessionStorage.setItem("chunk_reload", "1");
      window.location.reload();
    }
  }
});

// Reset flag reload setiap kali app berhasil mount
window.addEventListener("load", () => {
  sessionStorage.removeItem("chunk_reload");
});

createRoot(document.getElementById("root")!).render(<App />);
