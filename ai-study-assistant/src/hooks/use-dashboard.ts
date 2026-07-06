import { useQuery } from "@tanstack/react-query";

import { getDashboard } from "@/services/dashboard-service";
import { getDocumentHistory, listDocuments } from "@/services/document-service";

export type DashboardRecentChat = {
  id: number;
  documentId: number;
  documentTitle: string;
  question: string;
  createdAt: string;
};

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboard,
  });
}

export function useDashboardRecentChats() {
  return useQuery({
    queryKey: ["dashboard", "recent-chats"],
    queryFn: async () => {
      const documents = await listDocuments();
      const histories = await Promise.all(
        documents.slice(0, 5).map(async (document) => {
          const history = await getDocumentHistory(document.id);

          return history.map((item) => ({
            id: item.id,
            documentId: document.id,
            documentTitle: document.title,
            question: item.question,
            createdAt: item.created_at,
          }));
        }),
      );

      return histories
        .flat()
        .sort(
          (first, second) =>
            new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
        )
        .slice(0, 5);
    },
  });
}
