import { Loader2 } from "lucide-react";

export function LoadingScreen({ label = "Loading" }: { label?: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-6 text-white">
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4 shadow-2xl shadow-black/20 backdrop-blur-xl">
        <Loader2 className="size-5 animate-spin text-cyan-200" aria-hidden="true" />
        <p className="text-sm text-slate-300">{label}</p>
      </div>
    </main>
  );
}
