// vite.ts
import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { type Server } from "http";
import { nanoid } from "nanoid";

// Keep a tiny logger that doesn't depend on Vite
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  // ⬇️ lazy import so production never needs "vite"
  console.log("Setting up Vite and vite imports...");
  const { createServer: createViteServer, createLogger } = await import("vite");
  const { default: react } = await import("@vitejs/plugin-react");

  const clientRoot = path.resolve(process.cwd(), "client");
  const publicPath = path.join(clientRoot, "public");
  if (fs.existsSync(publicPath)) {
    app.use(express.static(publicPath));
    // Optional: make sure these are always raw-file responses
    app.get(
      ["/robots.txt", "/sitemap.xml", "/favicon.ico", "/og-image.jpg"],
      (req, res) => {
        res.sendFile(path.join(publicPath, req.path));
      }
    );
  }

  const vite = await createViteServer({
    configFile: false,
    root: clientRoot,
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(process.cwd(), "client", "src"),
        "@shared": path.resolve(process.cwd(), "shared"),
        "@assets": path.resolve(process.cwd(), "attached_assets"),
      },
    },
    server: {
      middlewareMode: true,
      hmr: {
        server,
      },
      allowedHosts: true as const,
    },
    appType: "custom",
    customLogger: createLogger(),
  });

  app.use(vite.middlewares);
  app.use("*", async (req: any, res: any, next: any) => {
    try {
      const tpl = path.join(clientRoot, "index.html");
      let html = await fs.promises.readFile(tpl, "utf8");
      html = html.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      
      // Inject nonce into script tags if CSP nonce is available
      const nonce = (res.locals as any).cspNonce;
      if (nonce) {
        // Add nonce to the main script tag
        html = html.replace(
          '<script type="module" src="/src/main.tsx',
          `<script type="module" nonce="${nonce}" src="/src/main.tsx`
        );
      }
      
      const page = await vite.transformIndexHtml(req.originalUrl, html);
      res.type("html").status(200).end(page);
    } catch (e) {
      // @ts.ignore
      vite.ssrFixStacktrace?.(e as any);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  console.log("Serving Static...");
  const distPath = require("path").resolve(process.cwd(), "dist", "public");
  const fs = require("fs");
  const path = require("path");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}. Did you run the client build?`
    );
  }

  app.use(
    require("express").static(distPath, {
      maxAge: "1y",
      setHeaders(
        res: { setHeader: (arg0: string, arg1: string) => void },
        filePath: string
      ) {
        if (filePath.endsWith(".html")) {
          res.setHeader("Cache-Control", "no-cache");
        } else {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      },
    })
  );

  const seoFiles = ["robots.txt", "sitemap.xml", "favicon.ico", "og-image.jpg"];
  for (const file of seoFiles) {
    app.get(`/${file}`, (_req, res) => {
      res.sendFile(file, { root: distPath });
    });
  }

  // SPA fallback – never catch /api or /api exactly
  app.get(/^\/(?!api(?:\/|$)).*/, (req, res) => {
    const indexPath = path.join(distPath, "index.html");
    let html = fs.readFileSync(indexPath, "utf-8");
    
    // Inject nonce into script tags if CSP nonce is available
    const nonce = (res.locals as any).cspNonce;
    if (nonce) {
      // Add nonce to all script tags (Vite generates multiple scripts in production)
      html = html.replace(
        /<script(?![^>]*\snonce=)/g,
        `<script nonce="${nonce}" `
      );
      
      // Add nonce to style tags if any exist
      html = html.replace(
        /<style>/g,
        `<style nonce="${nonce}">`
      );
    }
    
    // Add preload for main CSS to prevent FOUC
    // Find the stylesheet link and add a preload before it
    const cssMatch = html.match(/<link rel="stylesheet"[^>]*href="([^"]+\.css)"/);
    if (cssMatch && cssMatch[1]) {
      const cssPath = cssMatch[1];
      const preloadTag = `<link rel="preload" href="${cssPath}" as="style">`;
      // Insert preload before the stylesheet link
      html = html.replace(
        /<link rel="stylesheet"/,
        `${preloadTag}\n    <link rel="stylesheet"`
      );
    }
    
    res.type("html").send(html);
  });
}
