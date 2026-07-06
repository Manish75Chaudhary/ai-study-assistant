"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";

import { LoadingScreen } from "@/components/layout/loading-screen";
import { useAuth } from "@/features/auth/auth-context";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading, token } = useAuth();

  useEffect(() => {
    if (!isLoading && (!token || !isAuthenticated)) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router, token]);

  if (isLoading || !isAuthenticated) {
    return <LoadingScreen label="Securing your workspace" />;
  }

  return children;
}
