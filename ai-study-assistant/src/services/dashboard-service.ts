import { apiClient } from "@/lib/api-client";
import type { DashboardResponse } from "@/types/api";

export async function getDashboard() {
  const response = await apiClient.get<DashboardResponse>("/documents/dashboard");
  return response.data;
}
