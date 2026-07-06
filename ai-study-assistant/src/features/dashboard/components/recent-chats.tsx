import { MessageSquareText } from "lucide-react";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardRecentChat } from "@/hooks/use-dashboard";

export function RecentChats({
  chats,
  isLoading,
}: {
  chats: DashboardRecentChat[];
  isLoading?: boolean;
}) {
  return (
    <Card className="p-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-white">
          Recent chats
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Latest saved document questions.
        </p>
      </div>
      <div className="mt-6 space-y-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, index) => (
              <Skeleton className="h-20 w-full" key={index} />
            ))
          : null}
        {!isLoading && chats.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.035] p-8 text-center">
            <MessageSquareText className="mx-auto size-8 text-slate-500" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-slate-300">
              No saved chats yet
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Open a document and ask a question to create history.
            </p>
          </div>
        ) : null}
        {!isLoading
          ? chats.map((chat) => (
              <Link
                className="block rounded-xl border border-white/10 bg-white/[0.04] p-4 transition hover:bg-white/[0.08]"
                href={`/dashboard/documents/${chat.documentId}`}
                key={chat.id}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-white/[0.07] text-cyan-200">
                    <MessageSquareText className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-medium leading-6 text-white">
                      {chat.question}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {chat.documentTitle} - {new Date(chat.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </Link>
            ))
          : null}
      </div>
    </Card>
  );
}
