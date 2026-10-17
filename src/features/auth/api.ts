import { http } from "@/lib/http";
import type { AccessTokenResponse, TokenPair, UserRead } from "@/features/auth/types";
import type { LoginFormValues, RegisterFormValues } from "@/features/auth/schemas";

export async function register(payload: RegisterFormValues): Promise<UserRead> {
  const { data } = await http.post<UserRead>("/auth/register", payload);
  return data;
}

export async function login(payload: LoginFormValues): Promise<TokenPair> {
  const { data } = await http.post<TokenPair>("/auth/login", payload);
  return data;
}

export async function refresh(refreshToken: string): Promise<AccessTokenResponse> {
  const { data } = await http.post<AccessTokenResponse>("/auth/refresh", {
    refresh_token: refreshToken,
  });
  return data;
}

export async function getMe(accessToken?: string): Promise<UserRead> {
  const { data } = await http.get<UserRead>("/me", {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
  return data;
}
