import { AlertTriangle } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function ErrorState({
  title = "Something went wrong",
  description = "The interface hit an unexpected error.",
  actionLabel = "Go home",
  actionHref = "/",
  onAction,
}: {
  title?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-6 text-white">
      <div className="max-w-md rounded-2xl border border-white/10 bg-white/[0.06] p-8 text-center shadow-2xl shadow-black/20 backdrop-blur-xl">
        <div className="mx-auto mb-5 grid size-12 place-items-center rounded-xl bg-rose-500/10 text-rose-200">
          <AlertTriangle className="size-6" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
        {onAction ? (
          <Button className="mt-6" onClick={onAction} type="button">
            {actionLabel}
          </Button>
        ) : (
          <Button asChild className="mt-6">
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        )}
      </div>
    </main>
  );
}
