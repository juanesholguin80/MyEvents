import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/store";
import { eventKeys } from "@/features/events/keys";
import { useCancelRegistration, useRegisterToEvent } from "@/features/registrations/hooks";
import { registrationKeys } from "@/features/registrations/keys";
import { resetDb } from "@/test/msw/handlers";

const ASISTENTE = {
  id: 3,
  email: "asistente@example.com",
  full_name: "Asistente Uno",
  role: "asistente" as const,
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

// §4.1 del plan: registrarse/cancelar registro invalida `registrationKeys.my`
// (todas las variantes, vía `myLists()`) + `eventKeys.detail(eventId)` — el
// cupo visible en EventDetailPage puede cambiar.
describe("useRegisterToEvent / useCancelRegistration", () => {
  beforeEach(() => {
    resetDb();
    useAuthStore.setState({
      user: ASISTENTE,
      accessToken: "access-3",
      refreshToken: "refresh-3",
      isAuthenticated: true,
    });
  });

  it("useRegisterToEvent invalida registrationKeys.myLists() y eventKeys.detail(eventId) en éxito", async () => {
    const { queryClient, Wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useRegisterToEvent(1), { wrapper: Wrapper });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: registrationKeys.myLists() });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: eventKeys.detail(1) });
  });

  it("useCancelRegistration invalida registrationKeys.myLists() y eventKeys.detail(eventId) en éxito", async () => {
    const { queryClient, Wrapper } = createWrapper();

    const { result: registerResult } = renderHook(() => useRegisterToEvent(1), {
      wrapper: Wrapper,
    });
    registerResult.current.mutate();
    await waitFor(() => expect(registerResult.current.isSuccess).toBe(true));

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result: cancelResult } = renderHook(() => useCancelRegistration(), {
      wrapper: Wrapper,
    });
    cancelResult.current.mutate(1);

    await waitFor(() => expect(cancelResult.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: registrationKeys.myLists() });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: eventKeys.detail(1) });
  });
});
