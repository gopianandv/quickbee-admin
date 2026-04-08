import { useContext } from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react";
import { ToastContext } from "@/lib/toast";
import type { ToastItem, ToastVariant } from "@/lib/toast";

/* ── Variant config ─────────────────────────────────────────────────── */

const VARIANT_STYLES: Record<
  ToastVariant,
  { wrapper: string; icon: string; title: string; message: string }
> = {
  success: {
    wrapper: "border-green-200 bg-white shadow-lg",
    icon:    "text-green-500",
    title:   "text-gray-900",
    message: "text-gray-500",
  },
  error: {
    wrapper: "border-red-200 bg-white shadow-lg",
    icon:    "text-red-500",
    title:   "text-gray-900",
    message: "text-gray-500",
  },
  warning: {
    wrapper: "border-amber-200 bg-white shadow-lg",
    icon:    "text-amber-500",
    title:   "text-gray-900",
    message: "text-gray-500",
  },
  info: {
    wrapper: "border-blue-200 bg-white shadow-lg",
    icon:    "text-blue-500",
    title:   "text-gray-900",
    message: "text-gray-500",
  },
};

const ACCENT_BAR: Record<ToastVariant, string> = {
  success: "bg-green-500",
  error:   "bg-red-500",
  warning: "bg-amber-500",
  info:    "bg-blue-500",
};

function ToastIcon({ variant }: { variant: ToastVariant }) {
  const cls = `h-5 w-5 shrink-0 ${VARIANT_STYLES[variant].icon}`;
  if (variant === "success") return <CheckCircle  className={cls} />;
  if (variant === "error")   return <XCircle      className={cls} />;
  if (variant === "warning") return <AlertTriangle className={cls} />;
  return                            <Info          className={cls} />;
}

/* ── Single toast ───────────────────────────────────────────────────── */

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: () => void;
}) {
  const v = VARIANT_STYLES[toast.variant];

  return (
    <div
      className={`relative w-80 rounded-xl border overflow-hidden animate-in slide-in-from-right-5 fade-in duration-200 ${v.wrapper}`}
      role="alert"
    >
      {/* Left accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${ACCENT_BAR[toast.variant]}`} />

      <div className="flex items-start gap-3 px-4 py-3 pl-5">
        <ToastIcon variant={toast.variant} />

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold leading-snug ${v.title}`}>
            {toast.title}
          </p>
          {toast.message && (
            <p className={`mt-0.5 text-xs leading-snug ${v.message}`}>
              {toast.message}
            </p>
          )}
        </div>

        <button
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="shrink-0 -mr-1 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ── Container (renders via portal) ────────────────────────────────── */

export default function ToastContainer() {
  const ctx = useContext(ToastContext);
  if (!ctx) return null;

  const { toasts, removeToast } = ctx;
  if (toasts.length === 0) return null;

  return createPortal(
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 items-end"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={() => removeToast(t.id)} />
      ))}
    </div>,
    document.body
  );
}
