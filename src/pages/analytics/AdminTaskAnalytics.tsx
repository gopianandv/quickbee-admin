import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminGetTaskAnalytics, type TaskAnalyticsResponse } from "@/api/adminAnalytics";

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "#059669", CANCELLED: "#DC2626", NEW: "#6B7280",
  ACCEPTED: "#2563EB", IN_PROGRESS: "#D97706", PENDING_CONSUMER_CONFIRM: "#7C3AED", EXPIRED: "#9CA3AF",
};

export default function AdminTaskAnalytics() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [data, setData] = useState<TaskAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true); setErr(null);
    try {
      const d = await adminGetTaskAnalytics({ fromDate: fromDate || undefined, toDate: toDate || undefined });
      setData(d);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Failed to load");
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line

  const maxCategoryCount = Math.max(...(data?.byCategory.map((c) => c.count) ?? [1]), 1);

  return (
    <div style={{ maxWidth: 1100, margin: "30px auto", fontFamily: "system-ui" }}>
      <div style={{ marginBottom: 12 }}><Link to="/admin/dashboard">← Dashboard</Link></div>
      <h2 style={{ margin: "0 0 4px" }}>Task Analytics</h2>
      <div style={{ color: "#6B7280", marginBottom: 20 }}>Platform-wide task breakdown and trends.</div>

      {/* Date filter */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ fontSize: 13, color: "#6B7280" }}>From:</label>
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
          style={{ padding: 8, borderRadius: 8, border: "1px solid #E5E7EB" }} />
        <label style={{ fontSize: 13, color: "#6B7280" }}>To:</label>
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
          style={{ padding: 8, borderRadius: 8, border: "1px solid #E5E7EB" }} />
        <button onClick={load} disabled={loading}
          style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #111827", background: "#111827", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
          {loading ? "Loading…" : "Apply"}
        </button>
        {(fromDate || toDate) && (
          <button onClick={() => { setFromDate(""); setToDate(""); }}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E7EB", background: "#fff", cursor: "pointer", fontSize: 12 }}>
            Clear
          </button>
        )}
      </div>

      {err && <div style={{ color: "crimson", marginBottom: 12 }}>{err}</div>}
      {loading && <div style={{ color: "#6B7280" }}>Loading…</div>}

      {data && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

          {/* Summary KPIs */}
          <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 16, gridColumn: "1 / -1" }}>
            <div style={{ fontWeight: 800, marginBottom: 14 }}>Summary</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
              {[
                { label: "Total Tasks", value: data.summary.total, color: "#111827" },
                { label: "Completed", value: data.summary.completed, color: "#059669" },
                { label: "Cancelled", value: data.summary.cancelled, color: "#DC2626" },
                { label: "Completion Rate", value: `${data.summary.completionRate}%`, color: "#059669" },
                { label: "Cancellation Rate", value: `${data.summary.cancellationRate}%`, color: "#DC2626" },
              ].map((kpi) => (
                <div key={kpi.label} style={{ textAlign: "center", padding: 12, background: "#F9FAFB", borderRadius: 8 }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: kpi.color }}>{kpi.value}</div>
                  <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>{kpi.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* By Status */}
          <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 16 }}>
            <div style={{ fontWeight: 800, marginBottom: 12 }}>By Status</div>
            {data.byStatus.map((s) => (
              <div key={s.status} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #F3F4F6" }}>
                <span style={{ fontWeight: 700, color: STATUS_COLORS[s.status] ?? "#374151" }}>{s.status}</span>
                <span style={{ fontWeight: 800 }}>{s.count}</span>
              </div>
            ))}
          </div>

          {/* By Payment Mode */}
          <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 16 }}>
            <div style={{ fontWeight: 800, marginBottom: 12 }}>By Payment Mode</div>
            {data.byPaymentMode.map((m) => (
              <div key={m.mode} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #F3F4F6" }}>
                <span style={{ fontWeight: 700 }}>{m.mode}</span>
                <span style={{ fontWeight: 800 }}>{m.count}</span>
              </div>
            ))}
          </div>

          {/* By Category */}
          <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 16, gridColumn: "1 / -1" }}>
            <div style={{ fontWeight: 800, marginBottom: 12 }}>Top Categories</div>
            {data.byCategory.map((c) => (
              <div key={c.categoryId ?? c.categoryName} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{c.categoryName}</span>
                  <span style={{ fontWeight: 800, fontSize: 13 }}>{c.count}</span>
                </div>
                <div style={{ height: 6, background: "#E5E7EB", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${(c.count / maxCategoryCount) * 100}%`, height: "100%", background: "#2563EB", borderRadius: 3 }} />
                </div>
              </div>
            ))}
            {data.byCategory.length === 0 && <div style={{ color: "#6B7280" }}>No category data.</div>}
          </div>

          {/* Recent 7 days */}
          {data.recentDaily.length > 0 && (
            <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 16, gridColumn: "1 / -1" }}>
              <div style={{ fontWeight: 800, marginBottom: 12 }}>Last 7 Days</div>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 80 }}>
                {(() => {
                  const maxVal = Math.max(...data.recentDaily.map((d) => d.count), 1);
                  return data.recentDaily.map((d) => (
                    <div key={d.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <div style={{ fontSize: 11, fontWeight: 700 }}>{d.count}</div>
                      <div style={{ width: "100%", background: "#2563EB", borderRadius: "3px 3px 0 0", height: `${(d.count / maxVal) * 60}px`, minHeight: 2 }} />
                      <div style={{ fontSize: 10, color: "#6B7280" }}>{new Date(d.day).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
