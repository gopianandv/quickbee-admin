import { type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold leading-none",
  {
    variants: {
      variant: {
        // Generic
        default:  "bg-gray-100  text-gray-700",
        success:  "bg-green-100 text-green-700",
        warning:  "bg-amber-100 text-amber-700",
        danger:   "bg-red-100   text-red-600",
        info:     "bg-blue-100  text-blue-700",
        purple:   "bg-purple-100 text-purple-700",
        brand:    "bg-brand/15  text-amber-700",

        // Task statuses
        open:        "bg-blue-100  text-blue-700",
        pending:     "bg-amber-100 text-amber-700",
        in_progress: "bg-purple-100 text-purple-700",
        completed:   "bg-green-100 text-green-700",
        cancelled:   "bg-red-100   text-red-600",

        // KYC
        approved:  "bg-green-100 text-green-700",
        rejected:  "bg-red-100   text-red-600",

        // Outline style
        outline: "border border-gray-200 text-gray-600 bg-transparent",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

/** Map a raw status string → Badge variant */
export function statusVariant(
  status: string
): VariantProps<typeof badgeVariants>["variant"] {
  const s = status?.toUpperCase();
  if (s === "OPEN")        return "open";
  if (s === "PENDING")     return "pending";
  if (s === "IN_PROGRESS" || s === "ACCEPTED" || s === "STARTED") return "in_progress";
  if (s === "COMPLETED")   return "completed";
  if (s === "CANCELLED")   return "cancelled";
  if (s === "APPROVED")    return "approved";
  if (s === "REJECTED")    return "rejected";
  return "default";
}
