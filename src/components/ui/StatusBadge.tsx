// src/components/ui/StatusBadge.tsx
import React from "react";

type BadgeStyle = { bg: string; color: string; border: string };
type Size = "normal" | "compact";

function normalize(raw: unknown) {
  return String(raw ?? "")
    .trim()
    .replace(/\s+/g, "_")
    .toUpperCase();
}

const META: Record<string, BadgeStyle> = {
  PENDING: { bg: "#FFF7E6", color: "#8A5A00", border: "#FFD7A3" },
  APPROVED: { bg: "#E9FBEE", color: "#1B6B2A", border: "#BDECC9" },
  REJECTED: { bg: "#FFECEC", color: "#A31212", border: "#FFC2C2" },
  NOT_STARTED: { bg: "#F2F2F2", color: "#555", border: "#D9D9D9" },

  NEW: { bg: "#EAF2FF", color: "#0B3A8A", border: "#BFD6FF" },
  ACCEPTED: { bg: "#E8F8FF", color: "#0B5B7A", border: "#BCEBFF" },
  IN_PROGRESS: { bg: "#F0EDFF", color: "#3D2C8D", border: "#D7D0FF" },
  PENDING_CONSUMER_CONFIRM: { bg: "#FFF7E6", color: "#8A5A00", border: "#FFD7A3" },
  COMPLETED: { bg: "#E9FBEE", color: "#1B6B2A", border: "#BDECC9" },
  CANCELLED: { bg: "#FFECEC", color: "#A31212", border: "#FFC2C2" },
  EXPIRED: { bg: "#F2F2F2", color: "#555", border: "#D9D9D9" },

  OPEN: { bg: "#EAF2FF", color: "#0B3A8A", border: "#BFD6FF" },

  HOLD: { bg: "#FFF7E6", color: "#8A5A00", border: "#FFD7A3" },
  RELEASED: { bg: "#E9FBEE", color: "#1B6B2A", border: "#BDECC9" },
  REFUNDED: { bg: "#EAF2FF", color: "#0B3A8A", border: "#BFD6FF" },

  POSTED: { bg: "#E9FBEE", color: "#1B6B2A", border: "#BDECC9" },
  REVERSED: { bg: "#FFECEC", color: "#A31212", border: "#FFC2C2" },

  REQUESTED: { bg: "#FFF7E6", color: "#8A5A00", border: "#FFD7A3" },
  PROCESSING: { bg: "#E8F8FF", color: "#0B5B7A", border: "#BCEBFF" },
  PAID: { bg: "#E9FBEE", color: "#1B6B2A", border: "#BDECC9" },
  FAILED: { bg: "#FFECEC", color: "#A31212", border: "#FFC2C2" },
};

const FALLBACK: BadgeStyle = { bg: "#F2F2F2", color: "#555", border: "#D9D9D9" };

function prettyLabel(norm: string) {
  return norm
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function StatusBadge({
  status,
  label,
  size = "normal",
}: {
  status: string | null | undefined;
  label?: string;
  size?: Size;
}) {
  const key = normalize(status);
  const m = META[key] || FALLBACK;

  const compact = size === "compact";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: compact ? "3px 8px" : "4px 10px",
        borderRadius: 999,
        fontSize: compact ? 11 : 12,
        fontWeight: 700,
        background: m.bg,
        color: m.color,
        border: `1px solid ${m.border}`,
        lineHeight: compact ? "14px" : "16px",
        whiteSpace: "nowrap",
      }}
      title={key || ""}
    >
      {label ?? (key ? prettyLabel(key) : "-")}
    </span>
  );
}
