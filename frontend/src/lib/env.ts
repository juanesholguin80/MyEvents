declare global {
  interface ImportMetaEnv {
    readonly VITE_API_URL: string;
  }
}

/**
 * En desarrollo (proxy de Vite) y en producción (proxy de Nginx) VITE_API_URL
 * queda vacío: las requests usan rutas relativas y el proxy resuelve el origen
 * real del backend (§2.6 del plan). Solo se define cuando el frontend corre
 * fuera de Docker contra un backend local (ej. "http://localhost:8000").
 */
export const apiBaseUrl = `${import.meta.env.VITE_API_URL ?? ""}/api/v1`;
