import { type ReactNode } from "react";
import { type ElementType } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: ElementType;
  trend?: { value: number; label?: string };
  accent?: "brand" | "green" | "blue" | "red" | "purple";
  className?: string;
}

const accentMap = {
  brand:  { icon: "bg-brand/10  text-amber-600", border: "border-brand/20" },
  green:  { icon: "bg-green-100 text-green-600", border: "border-green-100" },
  blue:   { icon: "bg-blue-100  text-blue-600",  border: "border-blue-100"  },
  red:    { icon: "bg-red-100   text-red-500",   border: "border-red-100"   },
  purple: { icon: "bg-purple-100 text-purple-600", border: "border-purple-100" },
};

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  accent = "brand",
  className,
}: StatCardProps) {
  const colors = accentMap[accent];

  return (
    <div
      className={cn(
        "rounded-xl border bg-white p-5 shadow-sm flex items-start gap-4",
        colors.border,
        className
      )}
    >
      {Icon && (
        <div className={cn("rounded-lg p-2.5 shrink-0", colors.icon)}>
          <Icon className="h-5 w-5" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          {label}
        </p>
        <p className="mt-1 text-2xl font-bold text-gray-900 leading-none">
          {value}
        </p>
        {trend !== undefined && (
          <p
            className={cn(
              "mt-1.5 text-xs font-medium",
              trend.value >= 0 ? "text-green-600" : "text-red-500"
            )}
          >
            {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%
            {trend.label && (
              <span className="ml-1 font-normal text-gray-400">{trend.label}</span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
