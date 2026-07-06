"use client";

import axios, { AxiosError } from "axios";

import { API_BASE_URL, TOKEN_STORAGE_KEY } from "@/lib/constants";
import type { ApiErrorBody } from "@/types/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 240000,
});

apiClient.interceptors.request.use((config) => {
  if (typeof window === "undefined") {
    return config;
  }

  const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
      if (window.location.pathname.startsWith("/dashboard")) {
        window.location.assign("/login");
      }
    }

    return Promise.reject(error);
  },
);

export function getApiErrorMessage(error: unknown) {
  if (!axios.isAxiosError<ApiErrorBody>(error)) {
    return "Something went wrong. Please try again.";
  }

  const body = error.response?.data;
  if (!body) {
    return "The server could not be reached. Check that the backend is running.";
  }

  if (typeof body === "string") {
    return body;
  }

  if (Array.isArray(body.detail)) {
    return body.detail.map((item) => item.msg).join(" ");
  }

  if ("error" in body && body.error) {
    return body.error;
  }

  if ("detail" in body && typeof body.detail === "string") {
    return body.detail;
  }

  return error.message;
}
