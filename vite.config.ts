/// <reference types="vitest/config" />
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      // src/test/msw/* es infraestructura de pruebas (servidor MSW +
      // handlers que simulan el backend), no lógica de la aplicación —
      // se excluye del umbral de cobertura por el mismo motivo por el que
      // los fixtures/conftest del backend no cuentan contra su cobertura.
      exclude: ["src/test/**"],
    },
  },
});
