"use client";

import { FileText, Search, Sparkles, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageTransition } from "@/components/layout/page-transition";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useDeleteDocument, useDocuments } from "@/hooks/use-documents";
import { getApiErrorMessage } from "@/lib/api-client";
import type { DocumentListItem } from "@/types/api";

function formatBytes(bytes: number) {
  if (!bytes) {
    return "Stored text";
  }

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

export default function DocumentsPage() {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [documentToDelete, setDocumentToDelete] = useState<DocumentListItem | null>(null);
  const documents = useDocuments(query);
  const deleteDocument = useDeleteDocument();

  function confirmDelete() {
    if (!documentToDelete) {
      return;
    }

    deleteDocument.mutate(documentToDelete.id, {
      onSuccess: () => {
        toast({
          title: "Document deleted",
          description: `${documentToDelete.title} was removed from your library.`,
          variant: "success",
        });
        setDocumentToDelete(null);
      },
      onError: (error) => {
        toast({
          title: "Delete failed",
          description: getApiErrorMessage(error),
          variant: "error",
        });
      },
    });
  }

  return (
    <DashboardShell>
      <main className="px-4 py-6 sm:px-6 lg:px-8">
        <PageTransition>
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-200">
                Library
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                Documents
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Browse uploaded PDFs, open a study workspace, or remove documents you no longer need.
              </p>
            </div>
            <Button asChild>
              <Link href="/dashboard/upload">
                <Upload aria-hidden="true" />
                Upload PDF
              </Link>
            </Button>
          </div>

          {documents.isError ? (
            <Alert className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>{getApiErrorMessage(documents.error)}</span>
              <Button onClick={() => documents.refetch()} size="sm" type="button" variant="secondary">
                Retry
              </Button>
            </Alert>
          ) : null}
          {deleteDocument.isError ? (
            <Alert className="mt-6">{getApiErrorMessage(deleteDocument.error)}</Alert>
          ) : null}

          <Card className="mt-6 p-4">
            <div className="flex h-11 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.05] px-3 text-sm text-slate-300">
              <Search className="size-4 shrink-0 text-slate-500" aria-hidden="true" />
              <input
                aria-label="Search documents"
                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-slate-500"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search documents"
                value={query}
              />
            </div>
          </Card>

          <section className="mt-5 grid gap-4">
            {documents.isLoading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton className="h-28 w-full" key={index} />
                ))
              : null}

            {!documents.isLoading && (documents.data ?? []).length === 0 ? (
              <Card className="p-10 text-center">
                <FileText className="mx-auto size-10 text-slate-500" aria-hidden="true" />
                <h3 className="mt-4 text-lg font-semibold text-white">
                  {query ? "No matching documents" : "No documents yet"}
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
                  {query
                    ? "Try another search term or upload a new PDF."
                    : "Upload a PDF to generate summaries and ask questions grounded in the document."}
                </p>
                <Button asChild className="mt-5" variant="secondary">
                  <Link href="/dashboard/upload">
                    <Upload aria-hidden="true" />
                    Upload PDF
                  </Link>
                </Button>
              </Card>
            ) : null}

            {(documents.data ?? []).map((document) => (
              <Card className="p-5" key={document.id}>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <Link
                    className="flex min-w-0 flex-1 items-start gap-4"
                    href={`/dashboard/documents/${document.id}`}
                  >
                    <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-white/[0.07] text-cyan-200">
                      <FileText className="size-6" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-base font-semibold text-white">
                        {document.title}
                      </span>
                      <span className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span>{new Date(document.upload_date).toLocaleString()}</span>
                        <span>{formatBytes(document.file_size)}</span>
                        <span>{document.extracted_text_length.toLocaleString()} chars</span>
                      </span>
                    </span>
                  </Link>
                  <div className="flex items-center gap-2">
                    {document.summary_exists ? (
                      <Badge>
                        <Sparkles className="mr-1 size-3" aria-hidden="true" />
                        Summary
                      </Badge>
                    ) : null}
                    <Button asChild size="sm" variant="secondary">
                      <Link href={`/dashboard/documents/${document.id}`}>Open</Link>
                    </Button>
                    <Button
                      disabled={deleteDocument.isPending}
                      onClick={() => setDocumentToDelete(document)}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <Trash2 aria-hidden="true" />
                      <span className="sr-only">Delete {document.title}</span>
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </section>
        </div>
        </PageTransition>
      </main>

      {documentToDelete ? (
        <div
          aria-labelledby="delete-document-title"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/75 px-4 backdrop-blur-sm"
          role="dialog"
        >
          <Card className="w-full max-w-md p-6">
            <div className="flex items-start gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-rose-500/10 text-rose-200">
                <Trash2 className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h3
                  className="text-lg font-semibold tracking-tight text-white"
                  id="delete-document-title"
                >
                  Delete document?
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  This will remove{" "}
                  <span className="font-medium text-slate-200">
                    {documentToDelete.title}
                  </span>{" "}
                  and its saved study data from your library.
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                disabled={deleteDocument.isPending}
                onClick={() => setDocumentToDelete(null)}
                type="button"
                variant="secondary"
              >
                Cancel
              </Button>
              <Button
                disabled={deleteDocument.isPending}
                onClick={confirmDelete}
                type="button"
                variant="destructive"
              >
                <Trash2 aria-hidden="true" />
                {deleteDocument.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </DashboardShell>
  );
}
