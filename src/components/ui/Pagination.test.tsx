import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Pagination } from "@/components/ui/Pagination";

describe("Pagination", () => {
  it("disables 'Anterior' and keeps 'Siguiente' enabled on page 1 of several", () => {
    render(<Pagination page={1} pageSize={10} total={35} onPageChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: /anterior/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /siguiente/i })).toBeEnabled();
    expect(screen.getByText("Página 1 de 4")).toBeInTheDocument();
  });

  it("disables 'Siguiente' and keeps 'Anterior' enabled on the last page", () => {
    render(<Pagination page={4} pageSize={10} total={35} onPageChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: /siguiente/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /anterior/i })).toBeEnabled();
  });

  it("treats total=0 as a single page with both buttons disabled", () => {
    render(<Pagination page={1} pageSize={10} total={0} onPageChange={vi.fn()} />);

    expect(screen.getByText("Página 1 de 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /anterior/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /siguiente/i })).toBeDisabled();
  });

  it("calls onPageChange with page - 1 / page + 1 when the buttons are clicked", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination page={2} pageSize={10} total={35} onPageChange={onPageChange} />);

    await user.click(screen.getByRole("button", { name: /anterior/i }));
    await user.click(screen.getByRole("button", { name: /siguiente/i }));

    expect(onPageChange).toHaveBeenCalledWith(1);
    expect(onPageChange).toHaveBeenCalledWith(3);
  });
});
