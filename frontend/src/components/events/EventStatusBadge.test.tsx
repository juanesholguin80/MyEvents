import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EventStatusBadge } from "@/components/events/EventStatusBadge";
import type { EventStatus } from "@/features/events/types";

// Espejo de STATUS_CONFIG en el componente: cada uno de los 4 estados debe
// tener su propio texto + clase de color (nunca solo color, por el
// requisito de accesibilidad del plan). El ícono se verifica por su
// presencia en el DOM (cada lucide-react icon renderiza un <svg>).
const EXPECTED: Record<EventStatus, { label: string; colorClass: string }> = {
  draft: { label: "Borrador", colorClass: "bg-gray-100" },
  published: { label: "Publicado", colorClass: "bg-green-100" },
  cancelled: { label: "Cancelado", colorClass: "bg-red-100" },
  finished: { label: "Finalizado", colorClass: "bg-blue-100" },
};

describe("EventStatusBadge", () => {
  it.each(Object.entries(EXPECTED) as [EventStatus, { label: string; colorClass: string }][])(
    "renders status %s with its text, icon, and color",
    (status, { label, colorClass }) => {
      render(<EventStatusBadge status={status} />);

      const badge = screen.getByText(label);
      expect(badge).toBeInTheDocument();
      expect(badge.closest("span")).toHaveClass(colorClass);
      expect(badge.closest("span")?.querySelector("svg")).toBeInTheDocument();
    },
  );

  it("merges an extra className onto the badge without replacing the status classes", () => {
    render(<EventStatusBadge status="published" className="ml-2" />);
    const badge = screen.getByText("Publicado").closest("span");
    expect(badge).toHaveClass("ml-2");
    expect(badge).toHaveClass("bg-green-100");
  });
});
