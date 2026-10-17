import axios from "axios";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import type { AccessTokenResponse } from "@/features/auth/types";
import { clearSession, useAuthStore } from "@/features/auth/store";
import { apiBaseUrl } from "@/lib/env";

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _retriedAfterRefresh?: boolean;
}

export const http = axios.create({
  baseURL: apiBaseUrl,
});

const AUTH_FREE_PATHS = ["/auth/register", "/auth/login", "/auth/refresh"];
const PASSTHROUGH_ERROR_PATHS = ["/auth/register", "/auth/login"];

http.interceptors.request.use((config) => {
  const isAuthFree = AUTH_FREE_PATHS.some((path) => config.url?.includes(path));
  if (!isAuthFree) {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      config.headers.set("Authorization", `Bearer ${accessToken}`);
    }
  }
  return config;
});

function redirectToLogin() {
  const redirect = encodeURIComponent(
    `${window.location.pathname}${window.location.search}`,
  );
  window.location.href = `/login?redirect=${redirect}`;
}

function forceLogout() {
  clearSession();
  redirectToLogin();
}

let refreshPromise: Promise<string> | null = null;

function getRefreshPromise(refreshToken: string): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = http
      .post<AccessTokenResponse>("/auth/refresh", { refresh_token: refreshToken })
      .then(({ data }) => {
        useAuthStore.getState().setAccessToken(data.access_token);
        return data.access_token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;
    if (error.response?.status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }
    if (PASSTHROUGH_ERROR_PATHS.some((path) => originalRequest.url?.includes(path))) {
      return Promise.reject(error);
    }
    if (originalRequest.url?.includes("/auth/refresh")) {
      forceLogout();
      return Promise.reject(error);
    }
    if (originalRequest._retriedAfterRefresh) {
      forceLogout();
      return Promise.reject(error);
    }

    const { refreshToken } = useAuthStore.getState();
    if (!refreshToken) {
      forceLogout();
      return Promise.reject(error);
    }

    try {
      const newAccessToken = await getRefreshPromise(refreshToken);
      originalRequest._retriedAfterRefresh = true;
      originalRequest.headers.set("Authorization", `Bearer ${newAccessToken}`);
      return http(originalRequest);
    } catch {
      return Promise.reject(error);
    }
  },
);
