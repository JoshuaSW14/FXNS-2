import { defineConfig } from "vite";
import path from "node:path";
import { VitePWA } from "vite-plugin-pwa";
import fs from "node:fs";

export default defineConfig(async ({ command, mode }) => {
  const plugins = [];

  if (command === "serve" || command === "build") {
    const { default: react } = await import("@vitejs/plugin-react");
    plugins.push(react());

    if (mode !== "production") {
      const { default: runtimeErrorOverlay } = await import(
        "@replit/vite-plugin-runtime-error-modal"
      );
      plugins.push(runtimeErrorOverlay());
    }

    if (mode !== "production" && process.env.REPL_ID) {
      const { cartographer } = await import("@replit/vite-plugin-cartographer");
      plugins.push(cartographer());
    }

    // Add PWA plugin
    plugins.push(
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: "auto",
        includeAssets: ["favicon.ico", "robots.txt"],
        workbox: {
          clientsClaim: true,
          skipWaiting: true,
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: "StaleWhileRevalidate",
              options: { cacheName: "google-fonts-stylesheets" },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-webfonts",
                cacheableResponse: { statuses: [0, 200] },
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
              },
            },
            {
              urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
              handler: "NetworkOnly",
            },
          ],
        },
        manifest: {
          name: "fxns - Life Shortcuts",
          short_name: "fxns",
          description: "Simplify everyday tasks with powerful micro-tools",
          theme_color: "#6366f1",
          background_color: "#ffffff",
          display: "standalone",
          orientation: "portrait",
          scope: "/",
          start_url: "/",
          icons: [
            {
              src: "/icon-192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any maskable",
            },
            {
              src: "/icon-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable",
            },
          ],
        },
      })
    );
  }

  return {
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "client", "src"),
        "@shared": path.resolve(__dirname, "shared"),
        "@assets": path.resolve(__dirname, "attached_assets"),
      },
      dedupe: ["react", "react-dom", "@radix-ui/react-popover"],
    },
    root: path.resolve(__dirname, "client"),
    build: {
      outDir: path.resolve(__dirname, "dist/public"),
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks: {
            "react-vendor": ["react", "react-dom", "wouter"],
            "ui-vendor": [
              "@radix-ui/react-dialog",
              "@radix-ui/react-dropdown-menu",
              "@radix-ui/react-popover",
              "@radix-ui/react-select",
              "@radix-ui/react-tabs",
              "@radix-ui/react-toast",
              "@radix-ui/react-tooltip",
              "@radix-ui/react-alert-dialog",
              "@radix-ui/react-accordion",
              "@radix-ui/react-avatar",
            ],
            "form-vendor": ["react-hook-form", "@hookform/resolvers", "zod"],
            "query-vendor": ["@tanstack/react-query"],
            "stripe-vendor": ["@stripe/stripe-js", "@stripe/react-stripe-js"],
            "chart-vendor": ["recharts"],
          },
        },
      },
      chunkSizeWarningLimit: 600,
    },
    server: {
      port: 4200,
      https: {
        key: fs.readFileSync("./localhost-key.pem"),
        cert: fs.readFileSync("./localhost.pem"),
      },
      hmr: { protocol: "wss" },
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
      strictPort: true,
      proxy: {
        "/api": {
          target: `https://localhost:${process.env.PORT || 5001}`,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
      },
    },
  };
});
