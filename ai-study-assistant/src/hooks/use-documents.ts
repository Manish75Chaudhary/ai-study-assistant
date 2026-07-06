import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import {
  chatWithDocument,
  deleteDocument,
  getDocument,
  getDocumentHistory,
  listDocuments,
  summarizeDocument,
  uploadDocument,
  type UploadDocumentInput,
} from "@/services/document-service";

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedValue(value), delayMs);
    return () => window.clearTimeout(timeoutId);
  }, [delayMs, value]);

  return debouncedValue;
}

export function useDocuments(searchTerm = "") {
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 250);

  return useQuery({
    queryKey: ["documents", debouncedSearchTerm],
    queryFn: () => listDocuments(debouncedSearchTerm),
  });
}

export function useDocument(documentId: number) {
  return useQuery({
    queryKey: ["documents", documentId],
    queryFn: () => getDocument(documentId),
    enabled: Number.isFinite(documentId) && documentId > 0,
  });
}

export function useDocumentHistory(documentId: number) {
  return useQuery({
    queryKey: ["documents", documentId, "history"],
    queryFn: () => getDocumentHistory(documentId),
    enabled: Number.isFinite(documentId) && documentId > 0,
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UploadDocumentInput) => uploadDocument(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

export function useSummarizeDocument(documentId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => summarizeDocument(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["documents", documentId] });
    },
  });
}

export function useChatWithDocument(documentId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (question: string) => chatWithDocument(documentId, question),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["documents", documentId, "history"] });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}
