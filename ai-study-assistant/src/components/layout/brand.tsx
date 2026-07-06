import { BrainCircuit } from "lucide-react";
import Link from "next/link";

import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function Brand({ className }: { className?: string }) {
  return (
    <Link className={cn("flex items-center gap-3", className)} href="/">
      <span className="grid size-10 place-items-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200 shadow-lg shadow-cyan-950/30">
        <BrainCircuit className="size-5" aria-hidden="true" />
      </span>
      <span className="text-base font-semibold tracking-tight text-white">
        {APP_NAME}
      </span>
    </Link>
  );
}
