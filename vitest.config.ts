import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Prevent Vitest from resolving tests or workspace files above this project folder.
export default defineConfig({
  root: process.cwd(),
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
