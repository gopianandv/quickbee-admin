import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

/* ── Types ─────────────────────────────────────────────────────────── */

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  title: string;
  message?: string;
  /** Duration in ms. 0 = sticky (never auto-dismisses). Default: 4000 (success/info/warning), 6000 (error) */
  duration?: number;
}

interface ToastContextValue {
  toasts: ToastItem[];
  addToast: (opts: Omit<ToastItem, "id">) => string;
  removeToast: (id: string) => void;
}

/* ── Context ────────────────────────────────────────────────────────── */

const ToastContext = createContext<ToastContextValue | null>(null);

/* ── Provider ───────────────────────────────────────────────────────── */

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (opts: Omit<ToastItem, "id">) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const duration = opts.duration ?? (opts.variant === "error" ? 6000 : 4000);

      setToasts((prev) => {
        // Keep max 5 toasts — drop the oldest if over
        const next = [...prev, { ...opts, id }];
        return next.slice(-5);
      });

      if (duration > 0) {
        const timer = setTimeout(() => removeToast(id), duration);
        timers.current.set(id, timer);
      }

      return id;
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

/* ── Hook ───────────────────────────────────────────────────────────── */

function useToastContext() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

/** Drop-in toast hook with convenient sugar methods. */
export function useToast() {
  const { addToast, removeToast, toasts } = useToastContext();

  return {
    toasts,
    toast: addToast,
    dismiss: removeToast,

    success: (title: string, message?: string) =>
      addToast({ variant: "success", title, message }),

    error: (title: string, message?: string) =>
      addToast({ variant: "error", title, message }),

    warning: (title: string, message?: string) =>
      addToast({ variant: "warning", title, message }),

    info: (title: string, message?: string) =>
      addToast({ variant: "info", title, message }),
  };
}

/* Re-export context for ToastContainer */
export { ToastContext };
