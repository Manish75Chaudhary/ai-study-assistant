"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  CheckCircle2,
  FileText,
  Layers3,
  LockKeyhole,
  MessageSquareText,
  Network,
  Sparkles,
  Upload,
  Zap,
} from "lucide-react";
import Link from "next/link";

import { SiteNavbar } from "@/components/layout/site-navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Upload,
    title: "Document intelligence",
    description: "Upload PDFs, extract text, and prepare every page for AI workflows.",
  },
  {
    icon: Sparkles,
    title: "Gemini summaries",
    description: "Generate structured revision-ready summaries from long documents.",
  },
  {
    icon: MessageSquareText,
    title: "RAG grounded chat",
    description: "Ask questions and receive answers anchored to retrieved document chunks.",
  },
  {
    icon: LockKeyhole,
    title: "Private workspaces",
    description: "JWT authentication keeps each user’s documents and history separated.",
  },
];

const technology = [
  "Next.js 15",
  "FastAPI",
  "PostgreSQL",
  "ChromaDB",
  "Gemini",
  "TanStack Query",
];

const steps = [
  "Register and enter your secure workspace.",
  "Upload documents when Phase 2 enables document workflows.",
  "Summarize, ask questions, and review history in later phases.",
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(34,211,238,0.18),transparent_28%),radial-gradient(circle_at_86%_18%,rgba(236,72,153,0.13),transparent_24%),radial-gradient(circle_at_50%_100%,rgba(59,130,246,0.12),transparent_32%)]" />
      <SiteNavbar />

      <section className="relative mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-7xl grid-cols-1 items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <Badge>
            <Zap className="mr-1 size-3" aria-hidden="true" />
            AI-native study workspace
          </Badge>
          <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            StudyLens AI
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
            A premium workspace for turning dense PDFs into searchable summaries,
            grounded answers, and organized study memory.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/register">
                Start your workspace
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
          <div className="mt-10 grid max-w-xl grid-cols-3 gap-4">
            {[
              ["JWT", "secure auth"],
              ["RAG", "grounded chat"],
              ["AI", "Gemini powered"],
            ].map(([value, label]) => (
              <div
                className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 backdrop-blur-xl"
                key={value}
              >
                <p className="text-2xl font-semibold text-white">{value}</p>
                <p className="mt-1 text-xs text-slate-400">{label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="relative"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.15, ease: "easeOut" }}
        >
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 shadow-2xl shadow-cyan-950/20 backdrop-blur-2xl">
            <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Knowledge graph</p>
                  <h2 className="mt-1 text-xl font-semibold">Document workspace</h2>
                </div>
                <div className="grid size-11 place-items-center rounded-xl bg-cyan-300/10 text-cyan-200">
                  <BrainCircuit className="size-5" aria-hidden="true" />
                </div>
              </div>
              <div className="mt-8 grid gap-4">
                {[
                  { icon: FileText, label: "Research methods.pdf", value: "Indexed" },
                  { icon: Bot, label: "Summary generated", value: "8 sections" },
                  { icon: Network, label: "RAG chunks", value: "42 sources" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.05] p-4"
                      key={item.label}
                    >
                      <div className="flex items-center gap-3">
                        <span className="grid size-10 place-items-center rounded-xl bg-white/[0.07] text-cyan-100">
                          <Icon className="size-5" aria-hidden="true" />
                        </span>
                        <span className="text-sm text-slate-200">{item.label}</span>
                      </div>
                      <span className="text-xs text-slate-400">{item.value}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-5 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.07] p-4">
                <p className="text-sm text-cyan-100">
                  “What are the main arguments from chapter two?”
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Retrieved from pages 4, 6, and 9 with citations attached.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="relative mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8" id="features">
        <div className="max-w-2xl">
          <Badge>Core capabilities</Badge>
          <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
            Designed for serious document study.
          </h2>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <motion.article
                className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-xl shadow-black/10 backdrop-blur-xl"
                initial={{ opacity: 0, y: 18 }}
                key={feature.title}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
              >
                <Icon className="size-6 text-cyan-200" aria-hidden="true" />
                <h3 className="mt-5 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  {feature.description}
                </p>
              </motion.article>
            );
          })}
        </div>
      </section>

      <section className="relative border-y border-white/10 bg-white/[0.03] py-20" id="technology">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <div>
            <Badge>Technology</Badge>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
              Built on a production-grade AI stack.
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {technology.map((item) => (
              <div
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/50 p-4"
                key={item}
              >
                <CheckCircle2 className="size-5 text-emerald-300" aria-hidden="true" />
                <span className="text-sm text-slate-200">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8" id="workflow">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <Badge>How it works</Badge>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
              A focused workflow, phase by phase.
            </h2>
          </div>
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div
                className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.055] p-5"
                key={step}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-cyan-300/10 text-sm font-semibold text-cyan-100">
                  {index + 1}
                </span>
                <p className="pt-1 text-slate-300">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-white/10 bg-white/[0.07] p-8 text-center shadow-2xl shadow-black/20 backdrop-blur-2xl sm:p-12">
          <Layers3 className="mx-auto size-10 text-cyan-200" aria-hidden="true" />
          <h2 className="mx-auto mt-5 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Start with a secure workspace foundation.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-300">
            Phase 1 is ready for authentication, navigation, and dashboard structure.
          </p>
          <Button asChild className="mt-8" size="lg">
            <Link href="/register">
              Create account
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
