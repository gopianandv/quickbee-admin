/**
 * Styled confirmation dialog — drop-in replacement for window.confirm().
 *
 * Usage:
 *   const confirm = useConfirm();
 *   const ok = await confirm({ title: "Delete tag?", message: "This cannot be undone.", variant: "danger" });
 *   if (!ok) return;
 */

import {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

/* ── Types ─────────────────────────────────────────────────────────── */

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" renders red confirm button; "default" renders primary */
  variant?: "default" | "danger";
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

/* ── Context ────────────────────────────────────────────────────────── */

const ConfirmContext = createContext<ConfirmFn | null>(null);

/* ── Provider ───────────────────────────────────────────────────────── */

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm: ConfirmFn = useCallback((opts) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...opts, resolve });
    });
  }, []);

  function handle(ok: boolean) {
    pending?.resolve(ok);
    setPending(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending &&
        createPortal(
          <ConfirmModal pending={pending} onClose={handle} />,
          document.body
        )}
    </ConfirmContext.Provider>
  );
}

/* ── Hook ───────────────────────────────────────────────────────────── */

export function useConfirm(): ConfirmFn {
  const fn = useContext(ConfirmContext);
  if (!fn) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return fn;
}

/* ── Modal ──────────────────────────────────────────────────────────── */

function ConfirmModal({
  pending,
  onClose,
}: {
  pending: PendingConfirm;
  onClose: (ok: boolean) => void;
}) {
  const isDanger = pending.variant === "danger";

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={() => onClose(false)}
    >
      {/* Panel — stop propagation so clicking inside doesn't close */}
      <div
        className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 px-5 pt-5 pb-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              isDanger ? "bg-red-100" : "bg-blue-50"
            }`}
          >
            {isDanger ? (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            ) : (
              <HelpCircle className="h-5 w-5 text-blue-600" />
            )}
          </div>

          <div className="flex-1 min-w-0 pt-1">
            <h3 className="font-semibold text-gray-900 text-base leading-tight">
              {pending.title}
            </h3>
            {pending.message && (
              <p className="mt-1 text-sm text-gray-500 leading-snug">
                {pending.message}
              </p>
            )}
          </div>

          <button
            onClick={() => onClose(false)}
            className="shrink-0 -mt-1 -mr-1 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 px-5 pb-5 pt-2">
          <Button variant="ghost" size="sm" onClick={() => onClose(false)}>
            {pending.cancelLabel ?? "Cancel"}
          </Button>
          <Button
            variant={isDanger ? "danger" : "primary"}
            size="sm"
            onClick={() => onClose(true)}
          >
            {pending.confirmLabel ?? (isDanger ? "Delete" : "Confirm")}
          </Button>
        </div>
      </div>
    </div>
  );
}
