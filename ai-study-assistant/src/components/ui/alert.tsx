import type * as React from "react";

import { cn } from "@/lib/utils";

export function Alert({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100",
        className,
      )}
      {...props}
    />
  );
}
