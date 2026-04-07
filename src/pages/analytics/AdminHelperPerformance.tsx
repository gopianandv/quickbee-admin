import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminGetHelperPerformance, type HelperPerformanceItem } from "@/api/adminAnalytics";

function userLabel(u: any) {
  return u?.name || u?.email || u?.profile?.phoneNumber || "—";
}

function RatingStars({ rating }: { rating: number | null }) {
  if (rating === null) return <span style={{ color: "#9CA3AF" }}>No reviews</span>;
  const filled = Math.round(rating);
  return (
    <span>
      {"★".repeat(filled)}{"☆".repeat(5 - filled)}{" "}
      <b>{rating.toFixed(1)}</b>
    </span>
  );
}

function CompletionBar({ rate }: { rate: number | null }) {
  if (rate === null) return <span style={{ color: "#9CA3AF" }}>—</span>;
  const color = rate >= 80 ? "#059669" : rate >= 60 ? "#D97706" : "#DC2626";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 60, height: 6, background: "#E5E7EB", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${rate}%`, height: "100%", background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color }}>{rate}%</span>
    </div>
  );
}

export default function AdminHelperPerformance() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<HelperPerformanceItem[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load(p = page, q = search) {
    setLoading(true); setErr(null);
    try {
      const data = await adminGetHelperPerformance({ page: p, pageSize: 20, search: q.trim() || undefined });
      setItems(data.items || []);
      setTotal(data.total || 0);
      setHasMore(!!data.hasMore);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Failed to load");
    } finally { setLoading(false); }
  }

  useEffect(() => { load(page, search); }, [page]); // eslint-disable-line

  return (
    <div style={{ maxWidth: 1100, margin: "30px auto", fontFamily: "system-ui" }}>
      <div style={{ marginBottom: 12 }}><Link to="/admin/dashboard">← Dashboard</Link></div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, gap: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Helper Performance</h2>
          <div style={{ color: "#6B7280", marginTop: 4 }}>Completion rates, ratings and task stats for all helpers.</div>
        </div>
        <span style={{ padding: "4px 10px", borderRadius: 999, background: "#F3F4F6", fontWeight: 800, fontSize: 12 }}>
          Total: {total}
        </span>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (setPage(1), load(1, search))}
          placeholder="Search helper name, email, phone…"
          style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid #E5E7EB" }} />
        <button onClick={() => { setPage(1); load(1, search); }} disabled={loading}
          style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid #111827", background: "#111827", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
          Search
        </button>
      </div>

      {err && <div style={{ color: "crimson", marginBottom: 10 }}>{err}</div>}
      {loading && <div style={{ color: "#6B7280" }}>Loading…</div>}

      <div style={{ border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 80px 80px 80px 120px 140px", padding: "10px 14px", background: "#F9FAFB", fontWeight: 800, fontSize: 13, borderBottom: "1px solid #E5E7EB" }}>
          <div>Helper</div><div>Taken</div><div>Done</div><div>Cancel</div><div>Completion</div><div>Rating</div>
        </div>

        {items.map((h) => (
          <div key={h.id} style={{ display: "grid", gridTemplateColumns: "2fr 80px 80px 80px 120px 140px", padding: "10px 14px", borderBottom: "1px solid #F3F4F6", alignItems: "center" }}>
            <div>
              <Link to={`/admin/users/${h.id}`} style={{ fontWeight: 700 }}>{userLabel(h)}</Link>
              {h.email || h.profile?.phoneNumber ? (
                <div style={{ fontSize: 12, color: "#6B7280" }}>{h.email || h.profile?.phoneNumber}</div>
              ) : null}
            </div>
            <div style={{ fontWeight: 700 }}>{h.tasksTaken}</div>
            <div style={{ color: "#059669", fontWeight: 700 }}>{h.tasksCompleted}</div>
            <div style={{ color: h.tasksCancelled > 0 ? "#DC2626" : "#6B7280", fontWeight: 700 }}>{h.tasksCancelled}</div>
            <div><CompletionBar rate={h.completionRate} /></div>
            <div style={{ color: "#F59E0B" }}><RatingStars rating={h.avgRating} /></div>
          </div>
        ))}

        {!loading && items.length === 0 && <div style={{ padding: 20, color: "#6B7280" }}>No helpers found.</div>}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
        <div style={{ color: "#6B7280" }}>Showing {items.length} of {total}</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}
            style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #E5E7EB", background: "#fff", cursor: "pointer" }}>Prev</button>
          <span style={{ fontWeight: 800, alignSelf: "center" }}>Page {page}</span>
          <button disabled={!hasMore || loading} onClick={() => setPage((p) => p + 1)}
            style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #E5E7EB", background: "#fff", cursor: "pointer" }}>Next</button>
        </div>
      </div>
    </div>
  );
}
