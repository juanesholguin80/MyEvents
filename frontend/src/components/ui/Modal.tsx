import * as RadixDialog from "@radix-ui/react-dialog";
import X from "lucide-react/dist/esm/icons/x";
import type { ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
}

export function Modal({ open, onOpenChange, title, description, children }: ModalProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 bg-black/40" />
        {/* Fase 9 (pasada de responsividad): un elemento `fixed` resuelve
           `width: 100%` contra el viewport, no contra un padre con margen —
           con `w-full` puro el modal tocaba ambos bordes de la pantalla en
           móvil. `w-[calc(100%-2rem)]` deja un gutter de 1rem (16px) por
           lado en pantallas angostas; `max-w-md` sigue acotando el ancho en
           pantallas grandes. */}
        <RadixDialog.Content className="fixed left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-xl focus:outline-none">
          <div className="flex items-start justify-between gap-4">
            <div>
              <RadixDialog.Title className="text-lg font-semibold text-gray-900">
                {title}
              </RadixDialog.Title>
              {description ? (
                <RadixDialog.Description className="mt-1 text-sm text-gray-600">
                  {description}
                </RadixDialog.Description>
              ) : null}
            </div>
            <RadixDialog.Close
              aria-label="Cerrar"
              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </RadixDialog.Close>
          </div>
          {children ? <div className="mt-4">{children}</div> : null}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
