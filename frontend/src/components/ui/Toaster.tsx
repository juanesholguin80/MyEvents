import { Toaster as SonnerToaster } from "sonner";

// sonner ya renderiza su contenedor como <section aria-live="polite">, sin configuración extra.
export function Toaster() {
  return <SonnerToaster position="top-right" richColors closeButton />;
}
