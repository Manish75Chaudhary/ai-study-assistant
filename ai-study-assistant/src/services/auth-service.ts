import { apiClient } from "@/lib/api-client";
import type { LoginPayload, LoginResponse, RegisterPayload, User } from "@/types/api";

export async function login(payload: LoginPayload) {
  const formData = new URLSearchParams();
  formData.set("username", payload.email);
  formData.set("password", payload.password);

  const response = await apiClient.post<LoginResponse>("/auth/login", formData, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  return response.data;
}

export async function register(payload: RegisterPayload) {
  const response = await apiClient.post<User>("/auth/register", payload);
  return response.data;
}

export async function getCurrentUser() {
  const response = await apiClient.get<User>("/auth/me");
  return response.data;
}
