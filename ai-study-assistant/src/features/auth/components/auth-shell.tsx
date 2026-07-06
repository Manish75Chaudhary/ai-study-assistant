import type { ReactNode } from "react";

import { Brand } from "@/components/layout/brand";

export function AuthShell({
  children,
  eyebrow,
  title,
  description,
}: {
  children: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.22),transparent_30%),radial-gradient(circle_at_80%_10%,rgba(168,85,247,0.16),transparent_28%),linear-gradient(135deg,rgba(15,23,42,0),rgba(2,6,23,0.9))]" />
      <div className="relative mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 items-center gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_460px] lg:px-8">
        <section className="hidden lg:block">
          <Brand />
          <p className="mt-20 text-sm font-medium uppercase tracking-[0.24em] text-cyan-200">
            {eyebrow}
          </p>
          <h1 className="mt-5 max-w-2xl text-5xl font-semibold leading-tight tracking-tight">
            {title}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
            {description}
          </p>
          <div className="mt-12 grid max-w-xl grid-cols-3 gap-3">
            {["JWT Auth", "RAG Chat", "Gemini AI"].map((item) => (
              <div
                className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-sm text-slate-300 backdrop-blur-xl"
                key={item}
              >
                {item}
              </div>
            ))}
          </div>
        </section>
        <section className="mx-auto w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <Brand />
          </div>
          {children}
        </section>
      </div>
    </main>
  );
}
