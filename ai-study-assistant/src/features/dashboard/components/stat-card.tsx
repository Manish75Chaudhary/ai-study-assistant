import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function StatCard({
  icon: Icon,
  label,
  value,
  helper,
  isLoading,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  helper: string;
  isLoading?: boolean;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          {isLoading ? (
            <Skeleton className="mt-3 h-8 w-20" />
          ) : (
            <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
              {value}
            </p>
          )}
        </div>
        <div className="grid size-11 place-items-center rounded-xl bg-cyan-300/10 text-cyan-200">
          <Icon className="size-5" aria-hidden="true" />
        </div>
      </div>
      <p className="mt-5 text-xs leading-5 text-slate-500">{helper}</p>
    </Card>
  );
}
