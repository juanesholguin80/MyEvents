import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/store";
import { useCreateSpeaker, useDeleteSpeaker } from "@/features/speakers/hooks";
import { messageForApiError, normalizeApiError } from "@/lib/errors";
import { resetDb } from "@/test/msw/handlers";

const ADMIN = {
  id: 1,
  email: "admin@example.com",
  full_name: "Admin Principal",
  role: "admin" as const,
  is_active: true,
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { queryClient, Wrapper };
}

// §4.1 del plan: borrar ponente invalida `speakerKeys.list` en `onSuccess`
// únicamente; en `onError` (409 SPEAKER_IN_USE) no se invalida nada — el
// listado cacheado sigue siendo válido.
describe("useDeleteSpeaker", () => {
  beforeEach(() => {
    resetDb();
    useAuthStore.setState({
      user: ADMIN,
      accessToken: "access-1",
      refreshToken: "refresh-1",
      isAuthenticated: true,
    });
  });

  it("no invalida el listado y expone SPEAKER_IN_USE si el ponente tiene sesiones asociadas (409)", async () => {
    const { queryClient, Wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useDeleteSpeaker(), { wrapper: Wrapper });

    // El ponente con id 1 del seed ("Ana Pérez") tiene la sesión 1 asociada.
    result.current.mutate(1);

    await waitFor(() => expect(result.current.isError).toBe(true));

    const apiError = normalizeApiError(result.current.error);
    expect(apiError.code).toBe("SPEAKER_IN_USE");
    expect(messageForApiError(apiError)).toBe(
      "No se puede eliminar: el ponente tiene sesiones asociadas.",
    );
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("invalida el listado tras borrar un ponente sin sesiones asociadas", async () => {
    const { queryClient, Wrapper } = createWrapper();

    const { result: createResult } = renderHook(() => useCreateSpeaker(), {
      wrapper: Wrapper,
    });
    createResult.current.mutate({ full_name: "Ponente Nuevo", email: "nuevo@example.com" });
    await waitFor(() => expect(createResult.current.isSuccess).toBe(true));
    const createdId = createResult.current.data?.id;
    expect(createdId).toBeDefined();

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result: deleteResult } = renderHook(() => useDeleteSpeaker(), {
      wrapper: Wrapper,
    });
    deleteResult.current.mutate(createdId!);

    await waitFor(() => expect(deleteResult.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalled();
  });
});
