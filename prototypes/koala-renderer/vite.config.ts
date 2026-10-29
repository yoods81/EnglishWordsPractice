import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "./",
  server: { host: "127.0.0.1", port: 4178, strictPort: true, open: "/koala.html" },
  preview: { host: "127.0.0.1", port: 4179, strictPort: true },
  build: { rollupOptions: { input: { koala: "koala.html" } } },
  test: { include: ["tests/**/*.test.ts"], environment: "node" },
});
