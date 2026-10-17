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
      useAuthStore.getState().logout();
    }
  });
}
