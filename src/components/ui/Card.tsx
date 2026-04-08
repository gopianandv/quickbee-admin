import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ── Base card ─────────────────────────────────────────────────── */
function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 bg-white shadow-sm",
        className
      )}
      {...props}
    />
  );
}

/* ── Card header row (title prop OR children, + optional action) ── */
function CardHeader({
  title,
  action,
  className,
  children,
}: {
  title?: ReactNode;
  action?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between border-b border-gray-100 bg-gray-50/60 px-5 py-3",
        className
      )}
    >
      <div className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        {children ?? title}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}

/* ── Card content padded area ──────────────────────────────────── */
function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4", className)} {...props} />;
}

/* ── Convenience: Card with title built-in ─────────────────────── */
function CardWithTitle({
  title,
  action,
  children,
  className,
  contentClassName,
}: {
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader title={title} action={action} />
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}

export { Card, CardHeader, CardContent, CardWithTitle };
