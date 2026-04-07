import { type HTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/* ── Wrapper: handles overflow + rounded border ─────────────────── */
function TableRoot({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-sm",
        className
      )}
      {...props}
    />
  );
}

/* ── <table> ────────────────────────────────────────────────────── */
function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <table
      className={cn("w-full border-collapse text-sm", className)}
      {...props}
    />
  );
}

/* ── <thead> ────────────────────────────────────────────────────── */
function TableHead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn("sticky top-0 z-10 bg-gray-50 text-left", className)}
      {...props}
    />
  );
}

/* ── <tbody> ────────────────────────────────────────────────────── */
function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      className={cn("divide-y divide-gray-100", className)}
      {...props}
    />
  );
}

/* ── <tr> ───────────────────────────────────────────────────────── */
function TableRow({
  className,
  clickable,
  ...props
}: HTMLAttributes<HTMLTableRowElement> & { clickable?: boolean }) {
  return (
    <tr
      className={cn(
        "transition-colors",
        clickable && "cursor-pointer hover:bg-amber-50/60",
        !clickable && "hover:bg-gray-50/70",
        className
      )}
      {...props}
    />
  );
}

/* ── <th> ───────────────────────────────────────────────────────── */
function Th({
  className,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "border-b border-gray-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500",
        className
      )}
      {...props}
    />
  );
}

/* ── <td> ───────────────────────────────────────────────────────── */
function Td({
  className,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn("px-4 py-3 text-gray-700 align-middle", className)}
      {...props}
    />
  );
}

/* ── Empty state row ────────────────────────────────────────────── */
function TableEmpty({ colSpan, message = "No results" }: { colSpan: number; message?: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-16 text-center text-sm text-gray-400">
        {message}
      </td>
    </tr>
  );
}

/* ── Loading skeleton rows ──────────────────────────────────────── */
function TableSkeleton({ colSpan, rows = 5 }: { colSpan: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          {Array.from({ length: colSpan }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 rounded bg-gray-100" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export { TableRoot, Table, TableHead, TableBody, TableRow, Th, Td, TableEmpty, TableSkeleton };
