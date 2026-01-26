import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminSearchEverywhere } from "@/api/adminSearchApi";

export default function AdminGlobalSearch() {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function go() {
    const v = q.trim();
    if (!v) return;

    setLoading(true);
    setErr(null);
    try {
      const r = await adminSearchEverywhere(v);
      if (r.best?.url) nav(r.best.url);
      else setErr("No match found");
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Search failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by ID (user/task/cashout/txn/paymentIntent/fee row)…"
        style={{ width: 420, padding: 8 }}
        onKeyDown={(e) => e.key === "Enter" && go()}
      />
      <button onClick={go} disabled={loading} style={{ padding: "8px 12px" }}>
        {loading ? "..." : "Go"}
      </button>
      {err ? <span style={{ color: "crimson", fontSize: 12 }}>{err}</span> : null}
    </div>
  );
}
