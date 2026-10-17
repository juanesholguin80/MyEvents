import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { getMe, login, register } from "@/features/auth/api";
import type { LoginFormValues, RegisterFormValues } from "@/features/auth/schemas";
import { useAuthStore } from "@/features/auth/store";

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);

  return useMutation({
    mutationFn: async (values: LoginFormValues) => {
      const tokens = await login(values);
      const user = await getMe(tokens.access_token);
      setSession(tokens, user);
      return user;
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (values: RegisterFormValues) => register(values),
  });
}

const CURRENT_USER_QUERY_KEY = ["auth", "me"] as const;

export function useCurrentUser() {
  const accessToken = useAuthStore((s) => s.accessToken);

  const query = useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: () => getMe(),
    enabled: Boolean(accessToken),
    staleTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  });

  useEffect(() => {
    if (query.data) {
      useAuthStore.setState({ user: query.data });
    }
  }, [query.data]);

  return query;
}
