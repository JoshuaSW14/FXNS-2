import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from "node:fs";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5000,
    strictPort: true,
    https: {
      key: fs.readFileSync("./localhost-key.pem"),
      cert: fs.readFileSync("./localhost.pem"),
    },
    hmr: { protocol: "wss" }, // secure HMR socket
  },
  test: {
    globals: true,
    // Use node environment by default for server tests
    // Client tests can override with @vitest-environment jsdom comment
    environment: 'node',
    setupFiles: [],
    css: true,
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test-setup.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './client/src'),
      '@shared': resolve(__dirname, './shared'),
    },
  },
});