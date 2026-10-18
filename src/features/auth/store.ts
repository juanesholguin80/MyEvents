import { create } from "zustand";
import { persist } from "zustand/middleware";
import { queryClient } from "@/app/queryClient";
import type { TokenPair, UserRead } from "@/features/auth/types";

const STORAGE_KEY = "mis-eventos-auth";

interface AuthState {
  user: UserRead | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setSession: (tokens: TokenPair, user: UserRead) => void;
  setAccessToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      setSession: (tokens, user) =>
        set({
          user,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          isAuthenticated: true,
        }),
      setAccessToken: (token) => set({ accessToken: token }),
      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isAuthenticated = Boolean(state.accessToken && state.user);
        }
      },
    },
  ),
);

export function clearSession() {
  useAuthStore.getState().logout();
  queryClient.clear();
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;
    if (!useAuthStore.getState().isAuthenticated) return;

    const persisted = event.newValue ? JSON.parse(event.newValue) : null;
    const stillAuthenticated = Boolean(
      persisted?.state?.accessToken && persisted?.state?.user,
    );
    if (!stillAuthenticated) {
      // Usa clearSession() (no logout() directo) para que esta pestaña
      // también limpie la caché de TanStack Query: sin esto, datos
      // privados ya cacheados (GET /me, listados de admin, drafts del
      // organizador) seguían visibles en memoria en esta pestaña tras un
      // logout disparado en otra pestaña, igual que el motivo documentado
      // en §2.5 punto 5 del plan para el logout local.
      clearSession();
    }
  });
}
