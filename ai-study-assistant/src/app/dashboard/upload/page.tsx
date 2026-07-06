"use client";

import { FileUp, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { DragEvent, FormEvent, useState } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageTransition } from "@/components/layout/page-transition";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { useUploadDocument } from "@/hooks/use-documents";
import { getApiErrorMessage } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

function formatBytes(bytes: number) {
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;

  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function validatePdf(file: File | null) {
  if (!file) {
    return "Choose a PDF before uploading.";
  }

  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return "Only PDF files are supported. Choose a file ending in .pdf.";
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return "PDF upload exceeds the 25 MB limit. Choose a smaller file.";
  }

  return null;
}

export default function UploadPage() {
  const router = useRouter();
  const { toast } = useToast();
  const uploadDocument = useUploadDocument();
  const [file, setFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  function selectFile(nextFile: File | null) {
    setUploadProgress(0);
    setLocalError(null);

    const validationError = validatePdf(nextFile);
    if (validationError) {
      setFile(null);
      setLocalError(validationError);
      return;
    }

    setFile(nextFile);
  }

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    if (!uploadDocument.isPending) {
      setIsDragging(true);
    }
  }

  function handleDragLeave(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);

    if (uploadDocument.isPending) {
      return;
    }

    selectFile(event.dataTransfer.files.item(0));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);

    const validationError = validatePdf(file);
    if (validationError) {
      setLocalError(validationError);
      return;
    }

    const selectedFile = file;
    if (!selectedFile) {
      setLocalError("Choose a PDF before uploading.");
      return;
    }

    uploadDocument.mutate(
      {
        file: selectedFile,
        onProgress: (progress) => setUploadProgress(progress),
      },
      {
        onSuccess: () => {
          setUploadProgress(100);
          toast({
            title: "Upload complete",
            description: `${selectedFile.name} is ready in your document library.`,
            variant: "success",
          });
          router.push("/dashboard/documents");
        },
        onError: (error) => {
          toast({
            title: "Upload failed",
            description: getApiErrorMessage(error),
            variant: "error",
          });
        },
      },
    );
  }

  return (
    <DashboardShell>
      <main className="px-4 py-6 sm:px-6 lg:px-8">
        <PageTransition>
        <div className="mx-auto max-w-3xl">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-200">
              Upload
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
              Add a PDF
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Upload a readable PDF so StudyLens can extract text, index pages, and prepare it for summary and chat.
            </p>
          </div>

          <Card className="mt-6 p-6">
            <form onSubmit={handleSubmit}>
              <label
                className={cn(
                  "flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-cyan-300/30 bg-cyan-300/[0.04] px-6 py-10 text-center transition hover:bg-cyan-300/[0.07]",
                  isDragging && "border-cyan-200 bg-cyan-300/[0.1]",
                  uploadDocument.isPending && "cursor-wait opacity-80",
                )}
                htmlFor="pdf-upload"
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <span className="grid size-14 place-items-center rounded-xl bg-white/[0.08] text-cyan-200">
                  <FileUp className="size-7" aria-hidden="true" />
                </span>
                <span className="mt-5 text-base font-semibold text-white">
                  {file?.name ?? (isDragging ? "Drop your PDF here" : "Drop a PDF here or browse")}
                </span>
                <span className="mt-2 max-w-md text-sm leading-6 text-slate-400">
                  PDF only, up to 25 MB. Text-based documents work best for summaries and retrieval.
                </span>
                <input
                  accept="application/pdf,.pdf"
                  className="sr-only"
                  disabled={uploadDocument.isPending}
                  id="pdf-upload"
                  onChange={(event) => {
                    selectFile(event.target.files?.[0] ?? null);
                    event.target.value = "";
                  }}
                  type="file"
                />
              </label>

              {file ? (
                <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{file.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatBytes(file.size)}</p>
                  </div>
                  <Button
                    disabled={uploadDocument.isPending}
                    onClick={() => {
                      setFile(null);
                      setUploadProgress(0);
                    }}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <X aria-hidden="true" />
                    <span className="sr-only">Remove selected file</span>
                  </Button>
                </div>
              ) : null}

              {localError ? <Alert className="mt-5">{localError}</Alert> : null}
              {uploadDocument.isError ? (
                <Alert className="mt-5">{getApiErrorMessage(uploadDocument.error)}</Alert>
              ) : null}

              {uploadDocument.isPending || uploadProgress > 0 ? (
                <div className="mt-5">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>
                      {uploadProgress >= 100 ? "Processing document" : "Uploading document"}
                    </span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.08]">
                    <div
                      className="h-full rounded-full bg-cyan-300 transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              ) : null}

              <div className="mt-6 flex justify-end">
                <Button disabled={!file || uploadDocument.isPending} type="submit">
                  <Upload aria-hidden="true" />
                  {uploadDocument.isPending ? "Uploading..." : "Upload PDF"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
        </PageTransition>
      </main>
    </DashboardShell>
  );
}
