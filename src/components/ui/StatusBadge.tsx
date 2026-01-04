import type { KycStatus } from "@/api/kyc";

export default function StatusBadge({ status }: { status: KycStatus }) {
  const meta: Record<KycStatus, { bg: string; color: string; border: string }> = {
    PENDING: { bg: "#FFF7E6", color: "#8A5A00", border: "#FFD7A3" },
    APPROVED: { bg: "#E9FBEE", color: "#1B6B2A", border: "#BDECC9" },
    REJECTED: { bg: "#FFECEC", color: "#A31212", border: "#FFC2C2" },
    NOT_STARTED: { bg: "#F2F2F2", color: "#555", border: "#D9D9D9" },
  };

  const m = meta[status];

  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        background: m.bg,
        color: m.color,
        border: `1px solid ${m.border}`,
      }}
    >
      {status}
    </span>
  );
}
