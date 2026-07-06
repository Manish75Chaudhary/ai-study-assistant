"use client";

import { ErrorState } from "@/components/layout/error-state";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <ErrorState
      actionLabel="Reload"
      onAction={reset}
      description="The page could not finish rendering. Try reloading the app."
    />
  );
}
