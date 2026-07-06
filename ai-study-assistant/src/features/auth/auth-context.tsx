"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { TOKEN_STORAGE_KEY } from "@/lib/constants";
import { getCurrentUser, login as loginRequest } from "@/services/auth-service";
import type { LoginPayload, User } from "@/types/api";

type AuthContextValue = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<unknown>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setToken(window.localStorage.getItem(TOKEN_STORAGE_KEY));
    setIsReady(true);
  }, []);

  const userQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: getCurrentUser,
    enabled: isReady && Boolean(token),
  });

  const login = useCallback(
    async (payload: LoginPayload) => {
      const response = await loginRequest(payload);
      window.localStorage.setItem(TOKEN_STORAGE_KEY, response.access_token);
      setToken(response.access_token);
      queryClient.setQueryData(["auth", "me"], response.user);
      router.push("/dashboard");
    },
    [queryClient, router],
  );

  const logout = useCallback(() => {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    queryClient.removeQueries({ queryKey: ["auth"] });
    router.push("/login");
  }, [queryClient, router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: userQuery.data ?? null,
      token,
      isAuthenticated: Boolean(token && userQuery.data),
      isLoading: !isReady || userQuery.isLoading,
      login,
      logout,
      refreshUser: userQuery.refetch,
    }),
    [isReady, login, logout, token, userQuery.data, userQuery.isLoading, userQuery.refetch],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
