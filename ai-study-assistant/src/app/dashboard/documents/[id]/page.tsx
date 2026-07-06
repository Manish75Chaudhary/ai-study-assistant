"use client";

import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Download,
  FileText,
  Loader2,
  MessageSquareText,
  Send,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageTransition } from "@/components/layout/page-transition";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import {
  useChatWithDocument,
  useDocument,
  useDocumentHistory,
  useSummarizeDocument,
} from "@/hooks/use-documents";
import { getApiErrorMessage } from "@/lib/api-client";

const SUMMARY_SECTIONS = [
  { title: "Executive Summary", aliases: ["executive summary"] },
  { title: "Key Concepts", aliases: ["key concepts"] },
  { title: "Definitions", aliases: ["definitions", "important definitions"] },
  { title: "Important Formulas", aliases: ["important formulas", "formulas"] },
  {
    title: "Dates",
    aliases: ["dates", "important dates", "important dates/numbers", "important dates and numbers"],
  },
  { title: "Flashcards", aliases: ["flashcards", "5 flashcards"] },
  { title: "Quiz", aliases: ["quiz", "quiz questions", "10 quiz questions with answers"] },
  { title: "Takeaways", aliases: ["takeaways", "main takeaways"] },
];

function normalizeHeading(value: string) {
  return value
    .toLowerCase()
    .replace(/^#+\s*/, "")
    .replace(/\*\*/g, "")
    .replace(/^\d+[\).]\s*/, "")
    .replace(/:$/, "")
    .trim();
}

function parseSummarySections(summary: string | null) {
  const parsed = new Map<string, string>();
  if (!summary) {
    return parsed;
  }

  const lines = summary.split(/\r?\n/);
  let activeTitle: string | null = null;
  let activeContent: string[] = [];

  function flushSection() {
    if (activeTitle) {
      parsed.set(activeTitle, activeContent.join("\n").trim());
    }
    activeContent = [];
  }

  for (const line of lines) {
    const normalizedLine = normalizeHeading(line);
    const matchedSection = SUMMARY_SECTIONS.find((section) =>
      section.aliases.includes(normalizedLine),
    );

    if (matchedSection) {
      flushSection();
      activeTitle = matchedSection.title;
      continue;
    }

    if (activeTitle) {
      activeContent.push(line);
    }
  }

  flushSection();
  return parsed;
}

function MarkdownText({ content }: { content: string }) {
  return (
    <div className="space-y-2 text-sm leading-7 text-slate-200">
      {content.split(/\r?\n/).map((line, index) => {
        const trimmedLine = line.trim();
        const key = `${index}-${trimmedLine}`;

        if (!trimmedLine) {
          return <div className="h-2" key={key} />;
        }

        if (/^#{1,3}\s/.test(trimmedLine)) {
          return (
            <p className="font-semibold text-white" key={key}>
              {trimmedLine.replace(/^#{1,3}\s/, "")}
            </p>
          );
        }

        if (/^[-*]\s/.test(trimmedLine)) {
          return (
            <p className="flex gap-2" key={key}>
              <span className="text-cyan-200">-</span>
              <span>{trimmedLine.replace(/^[-*]\s/, "")}</span>
            </p>
          );
        }

        return <p key={key}>{trimmedLine}</p>;
      })}
    </div>
  );
}

function AnimatedMarkdownText({ content }: { content: string }) {
  const [visibleLength, setVisibleLength] = useState(0);

  useEffect(() => {
    setVisibleLength(0);
    const interval = window.setInterval(() => {
      setVisibleLength((currentLength) => {
        if (currentLength >= content.length) {
          window.clearInterval(interval);
          return currentLength;
        }

        return Math.min(currentLength + 8, content.length);
      });
    }, 16);

    return () => window.clearInterval(interval);
  }, [content]);

  return <MarkdownText content={content.slice(0, visibleLength)} />;
}

export default function DocumentPage() {
  const { toast } = useToast();
  const params = useParams<{ id: string }>();
  const documentId = Number(params.id);
  const document = useDocument(documentId);
  const history = useDocumentHistory(documentId);
  const summarize = useSummarizeDocument(documentId);
  const chat = useChatWithDocument(documentId);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const [question, setQuestion] = useState("");
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [lastAnswer, setLastAnswer] = useState<{
    question: string;
    answer: string;
    citations: string[];
  } | null>(null);

  const summary = summarize.data?.summary ?? document.data?.summary ?? null;
  const summarySections = useMemo(() => parseSummarySections(summary), [summary]);
  const hasExtractedText = (document.data?.text_length ?? 0) > 0;
  const isIndexed = document.data?.number_of_chunks === null || Number(document.data?.number_of_chunks) > 0;
  const canAskQuestion = question.trim().length > 0 && !chat.isPending;
  const chatMessages = useMemo(() => {
    const savedMessages = (history.data ?? [])
      .slice()
      .reverse()
      .flatMap((item) => [
        {
          id: `question-${item.id}`,
          role: "user" as const,
          content: item.question,
          createdAt: item.created_at,
          citations: [] as string[],
          isLive: false,
        },
        {
          id: `answer-${item.id}`,
          role: "assistant" as const,
          content: item.answer,
          createdAt: item.created_at,
          citations: [] as string[],
          isLive: false,
        },
      ]);

    const liveAnswerIsSaved =
      !!lastAnswer &&
      (history.data ?? []).some(
        (item) => item.question === lastAnswer.question && item.answer === lastAnswer.answer,
      );

    return [
      ...savedMessages,
      ...(pendingQuestion
        ? [
            {
              id: "pending-question",
              role: "user" as const,
              content: pendingQuestion,
              createdAt: new Date().toISOString(),
              citations: [] as string[],
              isLive: false,
            },
          ]
        : []),
      ...(lastAnswer && !liveAnswerIsSaved
        ? [
            {
              id: "live-answer",
              role: "assistant" as const,
              content: lastAnswer.answer,
              createdAt: new Date().toISOString(),
              citations: lastAnswer.citations,
              isLive: true,
            },
          ]
        : []),
    ];
  }, [history.data, lastAnswer, pendingQuestion]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chatMessages.length, chat.isPending]);

  const metadata = useMemo(() => {
    if (!document.data) {
      return [];
    }

    return [
      { label: "Uploaded", value: new Date(document.data.upload_date).toLocaleString() },
      {
        label: "Extracted text",
        value:
          document.data.text_length > 0
            ? `${document.data.text_length.toLocaleString()} chars`
            : "No text found",
      },
      {
        label: "Retrieval index",
        value:
          document.data.number_of_chunks === null
            ? "Ready"
            : `${document.data.number_of_chunks.toLocaleString()} chunks`,
      },
      {
        label: "Summary",
        value: document.data.summary ? "Available" : "Not generated",
      },
    ];
  }, [document.data]);

  function handleQuestionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      return;
    }

    setPendingQuestion(trimmedQuestion);
    chat.mutate(trimmedQuestion, {
      onSuccess: (response) => {
        setLastAnswer({
          question: trimmedQuestion,
          answer: response.answer,
          citations: response.citations,
        });
        setPendingQuestion(null);
        setQuestion("");
      },
      onError: (error) => {
        setPendingQuestion(null);
        toast({
          title: "Chat failed",
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
          <Button asChild size="sm" variant="ghost">
            <Link href="/dashboard/documents">
              <ArrowLeft aria-hidden="true" />
              Documents
            </Link>
          </Button>

          {document.isError ? (
            <Alert className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>{getApiErrorMessage(document.error)}</span>
              <Button onClick={() => document.refetch()} size="sm" type="button" variant="secondary">
                Retry
              </Button>
            </Alert>
          ) : null}

          <div className="mt-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div className="min-w-0">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-200">
                Study workspace
              </p>
              {document.isLoading ? (
                <Skeleton className="mt-3 h-10 w-80 max-w-full" />
              ) : (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <h2 className="min-w-0 truncate text-3xl font-semibold tracking-tight text-white">
                    {document.data?.title ?? "Document"}
                  </h2>
                  {hasExtractedText ? (
                    <Badge className="border-emerald-300/20 bg-emerald-300/10 text-emerald-100">
                      <CheckCircle2 className="mr-1 size-3" aria-hidden="true" />
                      Text extracted
                    </Badge>
                  ) : (
                    <Badge className="border-rose-300/20 bg-rose-300/10 text-rose-100">
                      Text unavailable
                    </Badge>
                  )}
                  {isIndexed ? <Badge>Indexed</Badge> : null}
                </div>
              )}
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Generate a concise summary, ask grounded questions, and review saved answers.
              </p>
            </div>
            <Button
              disabled={summarize.isPending || document.isLoading}
              onClick={() =>
                summarize.mutate(undefined, {
                  onSuccess: () => {
                    toast({
                      title: "Summary generated",
                      description: "The latest study notes are ready.",
                      variant: "success",
                    });
                  },
                  onError: (error) => {
                    toast({
                      title: "Summary failed",
                      description: getApiErrorMessage(error),
                      variant: "error",
                    });
                  },
                })
              }
              type="button"
            >
              {summarize.isPending ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles aria-hidden="true" />
              )}
              {summarize.isPending ? "Summarizing..." : summary ? "Regenerate summary" : "Generate summary"}
            </Button>
          </div>

          {summarize.isError ? (
            <Alert className="mt-6">{getApiErrorMessage(summarize.error)}</Alert>
          ) : null}
          {chat.isError ? <Alert className="mt-6">{getApiErrorMessage(chat.error)}</Alert> : null}

          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {document.isLoading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton className="h-24 w-full" key={index} />
                ))
              : metadata.map((item) => (
                  <Card className="p-5" key={item.label}>
                    <p className="text-sm text-slate-500">{item.label}</p>
                    <p className="mt-2 text-base font-semibold text-white">{item.value}</p>
                  </Card>
                ))}
          </section>

          <section className="mt-6 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <Card className="p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-white/[0.07] text-cyan-200">
                    <FileText className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight text-white">
                      Summary
                    </h3>
                    <p className="text-sm text-slate-400">Saved to this document after generation.</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    disabled={!summary || summarize.isPending}
                    onClick={async () => {
                      if (!summary) {
                        return;
                      }

                      await navigator.clipboard.writeText(summary);
                      toast({
                        title: "Summary copied",
                        description: "Markdown summary copied to clipboard.",
                        variant: "success",
                      });
                    }}
                    size="icon"
                    type="button"
                    variant="secondary"
                  >
                    <Copy aria-hidden="true" />
                    <span className="sr-only">Copy summary</span>
                  </Button>
                  <Button
                    disabled={!summary || summarize.isPending}
                    onClick={() => {
                      if (!summary) {
                        return;
                      }

                      const blob = new Blob([summary], { type: "text/markdown;charset=utf-8" });
                      const url = URL.createObjectURL(blob);
                      const link = window.document.createElement("a");
                      link.href = url;
                      link.download = `${document.data?.title ?? "summary"}.md`;
                      link.click();
                      URL.revokeObjectURL(url);
                    }}
                    size="icon"
                    type="button"
                    variant="secondary"
                  >
                    <Download aria-hidden="true" />
                    <span className="sr-only">Download summary as Markdown</span>
                  </Button>
                </div>
              </div>
              <div className="mt-5 min-h-72 rounded-xl border border-white/10 bg-slate-950/45 p-4">
                {document.isLoading || summarize.isPending ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-11/12" />
                    <Skeleton className="h-4 w-10/12" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>
                ) : summary ? (
                  <div className="space-y-3">
                    {SUMMARY_SECTIONS.map((section) => (
                      <section
                        className="rounded-xl border border-white/10 bg-white/[0.035] p-4"
                        key={section.title}
                      >
                        <h4 className="text-sm font-semibold text-white">{section.title}</h4>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-300">
                          {summarySections.get(section.title) || "Not present in the source."}
                        </p>
                      </section>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-60 flex-col items-center justify-center text-center">
                    <Sparkles className="size-9 text-slate-600" aria-hidden="true" />
                    <p className="mt-3 text-sm font-medium text-slate-300">No summary yet</p>
                    <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
                      Generate one when you are ready to extract the main ideas.
                    </p>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-white/[0.07] text-cyan-200">
                  <MessageSquareText className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-white">
                    Ask this document
                  </h3>
                  <p className="text-sm text-slate-400">Answers use retrieved page context.</p>
                </div>
              </div>

              <form className="mt-5" onSubmit={handleQuestionSubmit}>
                <textarea
                  className="min-h-28 w-full resize-none rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/15"
                  disabled={chat.isPending}
                  onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Ask about definitions, formulas, sections, or key arguments..."
                  value={question}
                />
                <div className="mt-3 flex justify-end">
                  <Button disabled={!canAskQuestion} type="submit">
                    <Send aria-hidden="true" />
                    {chat.isPending ? "Thinking..." : "Ask"}
                  </Button>
                </div>
              </form>

              <div className="mt-5 max-h-[34rem] min-h-80 overflow-y-auto rounded-xl border border-white/10 bg-slate-950/45 p-4">
                {history.isLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-16 w-3/4" />
                    <Skeleton className="ml-auto h-20 w-4/5" />
                    <Skeleton className="h-16 w-2/3" />
                  </div>
                ) : chatMessages.length > 0 ? (
                  <div className="space-y-5">
                    {chatMessages.map((message) => (
                      <div
                        className={
                          message.role === "user"
                            ? "ml-auto max-w-[85%] rounded-xl bg-cyan-300 px-4 py-3 text-slate-950"
                            : "mr-auto max-w-[90%] rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-slate-200"
                        }
                        key={message.id}
                      >
                        <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] opacity-70">
                          {message.role === "user" ? "You" : "StudyLens"}
                        </p>
                        {message.role === "assistant" && message.isLive ? (
                          <AnimatedMarkdownText content={message.content} />
                        ) : message.role === "assistant" ? (
                          <MarkdownText content={message.content} />
                        ) : (
                          <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                        )}
                        {message.role === "assistant" && message.citations.length > 0 ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {message.citations.map((citation) => (
                              <Badge key={citation}>{citation}</Badge>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                    {chat.isPending ? (
                      <div className="mr-auto max-w-[90%] rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-slate-300">
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="size-4 animate-spin text-cyan-200" aria-hidden="true" />
                          Thinking through the document...
                        </span>
                      </div>
                    ) : null}
                    <div ref={chatEndRef} />
                  </div>
                ) : (
                  <div className="flex h-72 flex-col items-center justify-center text-center">
                    <MessageSquareText className="size-9 text-slate-600" aria-hidden="true" />
                    <p className="mt-3 text-sm font-medium text-slate-300">
                      Ask a question to start
                    </p>
                    <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
                      Press Enter to send. Use Shift+Enter for a new line.
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </section>

          <Card className="mt-6 p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-semibold tracking-tight text-white">History</h3>
              {!history.isLoading && !history.isError ? (
                <Badge>{(history.data ?? []).length} saved chats</Badge>
              ) : null}
            </div>
            <div className="mt-5 space-y-3">
              {history.isLoading
                ? Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton className="h-24 w-full" key={index} />
                  ))
                : null}
              {history.isError ? (
                <Alert className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span>{getApiErrorMessage(history.error)}</span>
                  <Button onClick={() => history.refetch()} size="sm" type="button" variant="secondary">
                    Retry
                  </Button>
                </Alert>
              ) : null}
              {!history.isLoading && !history.isError && (history.data ?? []).length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.035] p-8 text-center text-sm text-slate-500">
                  Saved answers will appear here after you chat with the document.
                </div>
              ) : null}
              {(history.data ?? []).map((item) => (
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4" key={item.id}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-medium text-white">{item.question}</p>
                    <span className="text-xs text-slate-500">
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-400">{item.answer}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
        </PageTransition>
      </main>
    </DashboardShell>
  );
}
