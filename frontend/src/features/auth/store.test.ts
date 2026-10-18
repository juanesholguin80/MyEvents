import { beforeEach, describe, expect, it } from "vitest";
import { queryClient } from "@/app/queryClient";
import { clearSession, useAuthStore } from "@/features/auth/store";

const STORAGE_KEY = "mis-eventos-auth";

const AUTHENTICATED_STATE = {
  user: {
    id: 2,
    email: "organizador@example.com",
    full_name: "Organizador Uno",
    role: "organizador" as const,
    is_active: true,
  },
  accessToken: "access-2",
  refreshToken: "refresh-2",
  isAuthenticated: true,
};

function seedAuthenticatedSessionWithCachedData() {
  useAuthStore.setState(AUTHENTICATED_STATE);
  // Datos privados que una sesión autenticada dejaría en caché (GET /me,
  // listado de eventos, etc.) — deben desaparecer en un logout, en esta
  // pestaña o en otra, para no quedar visibles tras cambiar de cuenta.
  queryClient.setQueryData(["auth", "me"], AUTHENTICATED_STATE.user);
  queryClient.setQueryData(["events", "list", {}], { items: [], total: 0 });
}

describe("clearSession (logout)", () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it("clears the auth store", () => {
    seedAuthenticatedSessionWithCachedData();

    clearSession();

    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  });

  it("calls queryClient.clear() so no cached data from the previous user survives", () => {
    seedAuthenticatedSessionWithCachedData();
    expect(queryClient.getQueryCache().getAll().length).toBeGreaterThan(0);

    clearSession();

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });
});

describe("cross-tab sync via the storage event", () => {
  beforeEach(() => {
    queryClient.clear();
  });

  function dispatchStorageEvent(newValue: string | null) {
    window.dispatchEvent(
      new StorageEvent("storage", { key: STORAGE_KEY, newValue, storageArea: window.localStorage }),
    );
  }

  it("reflects a logout performed in another tab: clears the store", () => {
    seedAuthenticatedSessionWithCachedData();

    // Otra pestaña cerró sesión: localStorage ya no tiene accessToken/user.
    dispatchStorageEvent(
      JSON.stringify({ state: { accessToken: null, refreshToken: null, user: null }, version: 0 }),
    );

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("also clears the query cache on cross-tab logout (bug fixed in Fase 8: antes solo limpiaba el store)", () => {
    seedAuthenticatedSessionWithCachedData();
    expect(queryClient.getQueryCache().getAll().length).toBeGreaterThan(0);

    dispatchStorageEvent(null);

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it("ignores storage events for unrelated keys", () => {
    seedAuthenticatedSessionWithCachedData();

    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "some-other-app-key",
        newValue: "irrelevant",
        storageArea: window.localStorage,
      }),
    );

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(queryClient.getQueryCache().getAll().length).toBeGreaterThan(0);
  });

  it("does nothing if the current tab is already logged out", () => {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });

    // No debe lanzar ni intentar limpiar de nuevo.
    expect(() => dispatchStorageEvent(null)).not.toThrow();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it("stays authenticated when the other tab's storage still has a valid session (e.g. a redundant refresh write)", () => {
    seedAuthenticatedSessionWithCachedData();

    dispatchStorageEvent(
      JSON.stringify({
        state: AUTHENTICATED_STATE,
        version: 0,
      }),
    );

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });
});
