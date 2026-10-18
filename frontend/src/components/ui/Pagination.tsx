import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import { Button } from "@/components/ui/Button";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

// Genérico y reutilizable: lo consumen eventos, y luego sesiones/ponentes/
// registros/admin en fases posteriores.
export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const totalPages = total > 0 ? Math.ceil(total / pageSize) : 1;
  const isFirstPage = page <= 1;
  const isLastPage = page >= totalPages;

  return (
    <nav
      aria-label="Paginación"
      className="flex items-center justify-between gap-4 border-t border-gray-200 pt-4"
    >
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={isFirstPage}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Anterior
      </Button>
      <p className="text-sm text-gray-600">
        Página {page} de {totalPages}
      </p>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={isLastPage}
      >
        Siguiente
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </nav>
  );
}
