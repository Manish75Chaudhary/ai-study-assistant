import { FileText } from "lucide-react";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardLatestUpload } from "@/types/api";

export function RecentDocuments({
  documents,
  isLoading,
}: {
  documents: DashboardLatestUpload[];
  isLoading?: boolean;
}) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-white">
            Recent documents
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Your latest uploaded study material.
          </p>
        </div>
      </div>
      <div className="mt-6 space-y-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, index) => (
              <Skeleton className="h-16 w-full" key={index} />
            ))
          : null}
        {!isLoading && documents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.035] p-8 text-center">
            <FileText className="mx-auto size-8 text-slate-500" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-slate-300">
              No documents yet
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Upload a PDF to start studying with summaries and chat.
            </p>
          </div>
        ) : null}
        {!isLoading
          ? documents.map((document) => (
              <Link
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] p-4 transition hover:bg-white/[0.08]"
                href={`/dashboard/documents/${document.id}`}
                key={document.id}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[0.07] text-cyan-200">
                    <FileText className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      {document.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(document.upload_date).toLocaleString()}
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
