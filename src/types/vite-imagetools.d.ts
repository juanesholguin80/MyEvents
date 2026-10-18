// vite-imagetools no publica tipos ambientales para sus imports con query
// params (a diferencia de vite/client, que sí cubre `*.svg` plano) — se
// declaran aquí los dos patrones que usa `EventCover.tsx` (Fase 9, §0 del
// plan): `as=srcset` (string "url 320w, url 640w, url 960w") y el fallback
// de un solo ancho en WebP (string con una sola URL, sin `as=`).
declare module "*&as=srcset" {
  const srcset: string;
  export default srcset;
}

declare module "*&format=webp" {
  const src: string;
  export default src;
}
