import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearAdminToken } from "@/auth/tokenStore";
import { adminSearchById } from "@/api/adminSearchApi";

export default function TopBar() {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSearch() {
    const id = q.trim();
    if (!id) return;

    setBusy(true);
    setErr(null);
    try {
      const hit = await adminSearchById(id);
      nav(hit.route);
      setQ("");
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || "Not found";
      setErr(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        height: 72,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        background: "#263238",
        color: "#fff",
        borderBottom: "4px solid #F3AB25",
        fontFamily: "system-ui",
        gap: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 220 }}>
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
          <div style={{ fontSize: 22, fontWeight: 800 }}>thenee</div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>Admin Portal</div>
        </div>
      </div>

      {/* ✅ Global Search */}
      <div style={{ flex: 1, maxWidth: 720 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by ID (userId / taskId / cashoutId / walletTxnId / paymentIntentId / platformFeeId)"
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 10,
              border: err ? "2px solid #ff6b6b" : "1px solid rgba(255,255,255,0.25)",
              outline: "none",
              background: "rgba(255,255,255,0.08)",
              color: "white",
            }}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
            disabled={busy}
          />

          <button
            onClick={onSearch}
            disabled={busy || !q.trim()}
            style={{
              border: "none",
              background: busy ? "rgba(243,171,37,0.7)" : "#F3AB25",
              color: "#11181C",
              padding: "10px 14px",
              borderRadius: 10,
              fontWeight: 800,
              cursor: busy ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {busy ? "Searching..." : "Go"}
          </button>
        </div>

        {err ? (
          <div style={{ marginTop: 6, fontSize: 12, color: "#ffd1d1" }}>
            {err}. Tip: paste the exact UUID from the URL of that entity.
          </div>
        ) : null}
      </div>

      <button
        onClick={() => {
          clearAdminToken();
          nav("/login");
        }}
        style={{
          border: "none",
          background: "#F3AB25",
          color: "#11181C",
          padding: "10px 14px",
          borderRadius: 10,
          fontWeight: 800,
        }}
      >
        Logout
      </button>
    </div>
  );
}
