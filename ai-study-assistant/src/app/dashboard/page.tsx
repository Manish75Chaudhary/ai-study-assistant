"use client";

import { BarChart3, FileText, MessageSquareText, Sparkles, Upload } from "lucide-react";
import Link from "next/link";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageTransition } from "@/components/layout/page-transition";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useDashboard, useDashboardRecentChats } from "@/hooks/use-dashboard";
import { getApiErrorMessage } from "@/lib/api-client";
import { RecentChats } from "@/features/dashboard/components/recent-chats";
import { RecentDocuments } from "@/features/dashboard/components/recent-documents";
import { StatCard } from "@/features/dashboard/components/stat-card";

export default function DashboardPage() {
  const dashboard = useDashboard();
  const recentChats = useDashboardRecentChats();
  const data = dashboard.data;

  return (
    <DashboardShell>
      <main className="px-4 py-6 sm:px-6 lg:px-8">
        <PageTransition>
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-200">
                Overview
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                Study workspace
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Track your uploaded study material, summaries, and document-grounded chats from one workspace.
              </p>
            </div>
          </div>

          {dashboard.isError ? (
            <Alert className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>{getApiErrorMessage(dashboard.error)}</span>
              <Button onClick={() => dashboard.refetch()} size="sm" type="button" variant="secondary">
                Retry
              </Button>
            </Alert>
          ) : null}
          {recentChats.isError ? (
            <Alert className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>{getApiErrorMessage(recentChats.error)}</span>
              <Button onClick={() => recentChats.refetch()} size="sm" type="button" variant="secondary">
                Retry
              </Button>
            </Alert>
          ) : null}

          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              helper="Documents owned by the signed-in user."
              icon={FileText}
              isLoading={dashboard.isLoading}
              label="Documents"
              value={data?.total_documents ?? 0}
            />
            <StatCard
              helper="Questions answered and saved to history."
              icon={MessageSquareText}
              isLoading={dashboard.isLoading}
              label="Chats"
              value={data?.total_chats ?? 0}
            />
            <StatCard
              helper="Documents with generated summaries."
              icon={Sparkles}
              isLoading={dashboard.isLoading}
              label="Summaries"
              value={data?.total_summaries ?? 0}
            />
            <StatCard
              helper="Documents, summaries, and saved chats combined."
              icon={BarChart3}
              isLoading={dashboard.isLoading}
              label="Activity"
              value={
                (data?.total_documents ?? 0) +
                (data?.total_chats ?? 0) +
                (data?.total_summaries ?? 0)
              }
            />
          </section>

          <section className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <RecentDocuments
              documents={data?.latest_uploads ?? []}
              isLoading={dashboard.isLoading}
            />
            <Card className="p-6">
              <h2 className="text-lg font-semibold tracking-tight text-white">
                Quick actions
              </h2>
              <div className="mt-5 grid gap-3">
                <Link
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/[0.08]"
                  href="/dashboard/upload"
                >
                  <Upload className="size-4 text-cyan-200" aria-hidden="true" />
                  Upload a PDF
                </Link>
                <Link
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/[0.08]"
                  href="/dashboard/documents"
                >
                  <FileText className="size-4 text-cyan-200" aria-hidden="true" />
                  Open document library
                </Link>
              </div>
            </Card>
          </section>

          <section className="mt-6">
            <RecentChats
              chats={recentChats.data ?? []}
              isLoading={recentChats.isLoading}
            />
          </section>
        </div>
        </PageTransition>
      </main>
    </DashboardShell>
  );
}
