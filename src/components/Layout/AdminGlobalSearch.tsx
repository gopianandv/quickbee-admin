import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

function looksLikeUuid(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

export default function AdminGlobalSearch() {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const trimmed = useMemo(() => q.trim(), [q]);

  function go() {
    setErr(null);
    const id = trimmed;

    if (!id) return;

    // ✅ If user pastes a full URL, take the last segment
    const last = id.includes("/") ? id.split("/").filter(Boolean).slice(-1)[0] : id;

    // If it’s not even UUID-ish, still allow routing (some ids may be non-uuid later)
    const value = last;

    // ✅ Smart guesses based on prefixes you use in routes
    // You can extend this easily later.
    // Priority: explicit known route patterns
    if (value.startsWith("usr_")) return nav(`/admin/users/${value}`);
    if (value.startsWith("task_")) return nav(`/admin/tasks/${value}`);

    // ✅ UUID style (most of your IDs)
    if (looksLikeUuid(value)) {
      // V1: we can’t know entity type from UUID alone.
      // So we take the safest approach: go to a "router" page later.
      // For now, we’ll try common finance entities in a sensible order by “most likely”.
      // You can reorder if your ops pattern differs.

      // In practice, cashout ids and wallet txn ids will be pasted often:
      // - cashout list gives cashout id
      // - ledger gives walletTxn id
      // - platform fee ledger gives fee id
      // - payment intent gives paymentIntent id
      //
      // We'll route to a small chooser using query param, OR just try one.
      //
      // ✅ Fast V1: go to the Global Search page (we'll add later)
      // For now: go to ledger detail (most common for reconciliation)
      return nav(`/admin/finance/ledger/${value}`);
    }

    setErr("Paste a valid ID (UUID) or supported prefixed ID.");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 520 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px",
            borderRadius: 14,
            background: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.18)",
          }}
        >
          <span style={{ opacity: 0.9 }}>🔎</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search everywhere by ID (userId / taskId / cashoutId / walletTxnId / …)"
            onKeyDown={(e) => e.key === "Enter" && go()}
            style={{
              width: "100%",
              border: "none",
              outline: "none",
              background: "transparent",
              color: "white",
              fontSize: 13,
            }}
          />
          {q ? (
            <button
              onClick={() => {
                setQ("");
                setErr(null);
              }}
              style={{
                border: "none",
                background: "transparent",
                color: "rgba(255,255,255,0.8)",
                cursor: "pointer",
                fontSize: 14,
              }}
              title="Clear"
            >
              ✕
            </button>
          ) : null}
        </div>

        <button
          onClick={go}
          style={{
            border: "none",
            background: "rgba(255,255,255,0.14)",
            color: "white",
            padding: "10px 14px",
            borderRadius: 12,
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Go
        </button>
      </div>

      {err ? (
        <div style={{ color: "#FFD4D4", fontSize: 12, opacity: 0.95 }}>
          {err}
        </div>
      ) : null}
    </div>
  );
}
