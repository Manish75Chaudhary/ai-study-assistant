import { apiClient } from "@/lib/api-client";
import type {
  ChatHistoryItem,
  ChatResponse,
  DocumentDetail,
  DocumentListItem,
  SummaryResponse,
  UploadDocumentResponse,
} from "@/types/api";

export type UploadDocumentInput = {
  file: File;
  onProgress?: (progress: number) => void;
};

export async function listDocuments(search?: string) {
  const response = await apiClient.get<DocumentListItem[]>("/documents", {
    params: search?.trim() ? { search: search.trim() } : undefined,
  });
  return response.data;
}

export async function getDocument(documentId: number) {
  const response = await apiClient.get<DocumentDetail>(`/documents/${documentId}`);
  return response.data;
}

export async function uploadDocument({ file, onProgress }: UploadDocumentInput) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.post<UploadDocumentResponse>(
    "/documents/upload",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        if (!onProgress || !progressEvent.total) {
          return;
        }

        onProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
      },
    },
  );

  return response.data;
}

export async function summarizeDocument(documentId: number) {
  const response = await apiClient.post<SummaryResponse>(
    `/documents/${documentId}/summarize`,
  );
  return response.data;
}

export async function chatWithDocument(documentId: number, question: string) {
  const response = await apiClient.post<ChatResponse>(
    `/documents/${documentId}/chat`,
    { question },
  );
  return response.data;
}

export async function getDocumentHistory(documentId: number) {
  const response = await apiClient.get<ChatHistoryItem[]>(
    `/documents/${documentId}/history`,
  );
  return response.data;
}

export async function deleteDocument(documentId: number) {
  const response = await apiClient.delete<{ message: string }>(
    `/documents/${documentId}`,
  );
  return response.data;
}
