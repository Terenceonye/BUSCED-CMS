import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The SPA is served from the site root by Express. Bundles are emitted to
// "app-assets" rather than the Vite default "assets", because public/assets
// already holds the legacy admin theme and uploaded branding images.
export default defineConfig({
  plugins: [react()],
  base: "/",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "../public/app"),
    assetsDir: "app-assets",
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        // Split the heavy vendors so a page that never charts does not pay
        // for recharts, and so vendor code caches across deploys.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          const path = id.split("node_modules/").pop() ?? "";
          // Only React core lives here. It has no other node_modules imports,
          // so the chunk stays a leaf and nothing becomes circular. Routing
          // stays in vendor because it depends on @remix-run/router.
          if (/^(react|react-dom|scheduler)\//.test(path)) {
            return "react";
          }
          if (/^(recharts|d3-|victory-|internmap|delaunator|robust-predicates)/.test(path)) {
            return "charts";
          }
          if (path.startsWith("@radix-ui/")) return "radix";
          return "vendor";
        },
      },
    },
  },
  server: {
    port: 5173,
    // During `npm run dev` the API and uploaded/branding files still come from
    // the Express server on :3000.
    proxy: {
      "/api": "http://localhost:3000",
      "/uploads": "http://localhost:3000",
      "/uploadedNewsImages": "http://localhost:3000",
      "/branding": "http://localhost:3000",
    },
  },
});
