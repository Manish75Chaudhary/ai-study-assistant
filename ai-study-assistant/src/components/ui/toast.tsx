"use client";

import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info";

type Toast = {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
};

type ToastInput = Omit<Toast, "id">;

type ToastContextValue = {
  toast: (input: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const icons = {
  success: CheckCircle2,
  error: CircleAlert,
  info: Info,
};

const styles = {
  success: "border-emerald-300/20 bg-emerald-500/10 text-emerald-50",
  error: "border-rose-300/20 bg-rose-500/10 text-rose-50",
  info: "border-cyan-300/20 bg-cyan-500/10 text-cyan-50",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((currentToasts) => currentToasts.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = crypto.randomUUID();
      setToasts((currentToasts) => [...currentToasts, { ...input, id }]);
      window.setTimeout(() => dismiss(id), 4500);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="fixed right-4 top-4 z-50 flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3"
      >
        {toasts.map((item) => {
          const Icon = icons[item.variant];

          return (
            <div
              className={cn(
                "flex items-start gap-3 rounded-xl border p-4 shadow-2xl shadow-black/30 backdrop-blur-xl",
                styles[item.variant],
              )}
              key={item.id}
            >
              <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{item.title}</p>
                {item.description ? (
                  <p className="mt-1 text-sm leading-5 opacity-80">{item.description}</p>
                ) : null}
              </div>
              <Button
                className="size-7 shrink-0 rounded-lg"
                onClick={() => dismiss(item.id)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <X aria-hidden="true" />
                <span className="sr-only">Dismiss notification</span>
              </Button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}
