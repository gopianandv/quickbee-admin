import { useState } from "react";

export default function CopyIdButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 900);
    } catch {
      // fallback
      window.prompt("Copy this:", value);
    }
  }

  return (
    <button
      onClick={copy}
      style={{
        border: "1px solid #e5e5e5",
        background: "#fff",
        padding: "6px 10px",
        borderRadius: 10,
        cursor: "pointer",
        fontWeight: 700,
        fontSize: 12,
      }}
      title={label ? `Copy ${label}` : "Copy"}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
