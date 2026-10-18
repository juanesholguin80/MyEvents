/// <reference types="vitest/config" />
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import type { Plugin } from "vite";
import { imagetools } from "vite-imagetools";
import obfuscatorPluginRaw from "vite-plugin-javascript-obfuscator";
import type { ObfuscatorOptions } from "javascript-obfuscator";

// El .d.ts de este paquete (CJS puro, sin "exports" en su package.json) no
// tipa bien su default export bajo "module": "nodenext" (ver
// tsconfig.node.json) — TS resuelve el import como el namespace completo en
// vez de la función, aunque en runtime (vía esbuild, que es quien de verdad
// carga este archivo) sí es la función. Se castea explícitamente a la firma
// real documentada en su propio dist/index.d.ts.
const obfuscatorPlugin = obfuscatorPluginRaw as unknown as (options?: {
  include?: string | RegExp | Array<string | RegExp>;
  exclude?: string | RegExp | Array<string | RegExp>;
  options?: ObfuscatorOptions;
  apply?: "serve" | "build";
  debugger?: boolean;
}) => Plugin;

// Fase 9 (§0 del plan, "Empaquetado producción"): esbuild ya minifica y
// hace tree-shaking por defecto en `vite build`, pero el mangling de
// nombres locales de un minificador no es ofuscación real (no reescribe
// control de flujo ni cifra strings). `javascript-obfuscator` se aplica
// como paso aparte, solo sobre el bundle final y solo en `mode ===
// "production"` — nunca en dev (`vite`/`vite dev`), por el costo de build
// y porque degradaría la experiencia de debugging local. Los ajustes se
// mantienen deliberadamente moderados (sin `controlFlowFlattening` ni
// `deadCodeInjection`, que son los que más inflan el tamaño del bundle)
// para cumplir "ofuscar" sin que el tamaño crezca de forma desproporcionada.
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    // §0 del plan ("Imágenes"): procesa en build time las 2-3 portadas
    // decorativas de src/assets/covers/*.svg -> WebP + anchos responsivos
    // (320w/640w/960w), vía query params de import (`?w=...;...&format=webp&as=srcset`).
    // El `include` se acota a esa carpeta explícitamente: el default de
    // vite-imagetools no procesa .svg (solo heif/avif/jpeg/jpg/png/tiff/
    // webp/gif), así que se agrega .svg aquí, pero únicamente para estos
    // placeholders — no para cualquier otro .svg que entre al proyecto a
    // futuro (p. ej. public/favicon.svg, ya excluido por el default
    // `exclude: 'public/**/*'` de todas formas).
    imagetools({
      include: /\/assets\/covers\/.*\.svg(\?.*)?$/,
    }),
    // Solo en build de producción: nunca en `vite dev`/`vite serve`.
    // `apply: "build"` es una segunda barrera (en caso de que alguien
    // corra `vite build --mode development`, el array ya ni siquiera
    // incluye el plugin gracias al check de `mode` de más abajo).
    ...(mode === "production"
      ? [
          obfuscatorPlugin({
            apply: "build",
            // El plugin solo implementa el hook `transform` (no
            // `renderChunk`), así que en la práctica ofusca cada módulo
            // fuente justo antes de que Rollup arme los chunks, no el
            // bundle final ya ensamblado. `src/app/router.tsx` es el único
            // archivo con `import()` dinámico (el code-splitting por ruta,
            // §3 del plan) — la ofuscación de strings (`stringArray`)
            // reescribe el literal del especificador de ese `import()` en
            // una llamada computada a una función de decodificación, con lo
            // que Rollup deja de poder resolverlo de forma estática y
            // termina fusionando todas las páginas lazy en un solo chunk.
            // Se excluye únicamente este archivo (sin lógica de negocio,
            // nada sensible que ofuscar) para preservar el code-splitting
            // real por ruta; el resto de `src/` y el bundle de cada página
            // sigue ofuscado igual.
            exclude: [/node_modules/, /\.nuxt/, /[\\/]app[\\/]router\.tsx$/],
            options: {
              compact: true,
              // Deliberadamente apagados: son los que más inflan el bundle
              // (pueden duplicar o triplicar el tamaño) y no aportan
              // protección proporcional a su costo para este entregable.
              controlFlowFlattening: false,
              deadCodeInjection: false,
              // Ofuscación real (más allá del name-mangling de esbuild):
              // cifra los literales de string en un array decodificado en
              // runtime y renombra identificadores locales a hexadecimal.
              stringArray: true,
              stringArrayEncoding: ["base64"],
              stringArrayThreshold: 0.75,
              identifierNamesGenerator: "hexadecimal",
              renameGlobals: false,
              numbersToExpressions: true,
              simplify: true,
              splitStrings: false,
              transformObjectKeys: true,
              // selfDefending/debugProtection se dejan desactivados (default):
              // pueden romper bajo el output ESM con code-splitting de Vite
              // y no son necesarios para el alcance de esta prueba.
            },
          }),
        ]
      : []),
  ],
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
}));
