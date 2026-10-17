import LoaderCircle from "lucide-react/dist/esm/icons/loader-circle";
import { cn } from "@/lib/cn";

interface SpinnerProps {
  className?: string;
  label?: string;
}

export function Spinner({ className, label = "Cargando" }: SpinnerProps) {
  return (
    <span role="status" className="inline-flex items-center gap-2">
      <LoaderCircle className={cn("h-5 w-5 animate-spin text-indigo-600", className)} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
