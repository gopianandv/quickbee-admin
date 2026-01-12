import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getHelperRatings, type AdminHelperRatingRow } from "@/api/adminRatings";

function pillStyle(bg: string, fg: string, border: string) {
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: 999,
    background: bg,
    color: fg,
    border: `1px solid ${border}`,
    fontSize: 12,
    fontWeight: 800 as const,
    whiteSpace: "nowrap" as const,
  };
}

function RatingPill({ v }: { v: number | null }) {
  if (v == null) return <span style={pillStyle("#F3F4F6", "#111827", "#E5E7EB")}>—</span>;
  if (v >= 4.5) return <span style={pillStyle("#ECFDF5", "#065F46", "#A7F3D0")}>{v}</span>;
  if (v >= 3.5) return <span style={pillStyle("#FEF3C7", "#92400E", "#FCD34D")}>{v}</span>;
  return <span style={pillStyle("#FEE2E2", "#991B1B", "#FCA5A5")}>{v}</span>;
}

export default function RatingsList() {
  const nav = useNavigate();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [items, setItems] = useState<AdminHelperRatingRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load(p = page) {
    setLoading(true);
    setErr(null);
    try {
      const data = await getHelperRatings({
        page: p,
        pageSize,
        search: search.trim() || undefined,
      });
      setItems(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 0);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Failed to load ratings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function onSearch() {
    if (page !== 1) setPage(1);
    else load(1);
  }

  return (
    <div style={{ maxWidth: 1200, margin: "30px auto", fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Ratings</h2>
          <div style={{ color: "#6B7280", marginTop: 6 }}>
            Helper feedback summary (avg rating + review count).
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={pillStyle("#F3F4F6", "#111827", "#E5E7EB")}>Total helpers: {total}</div>
          <button
            onClick={() => load(page)}
            disabled={loading}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E7EB", background: "#fff", cursor: "pointer" }}
          >
            Refresh
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 16 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search helper name/email…"
          style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid #E5E7EB", background: "#fff" }}
        />
        <button
          onClick={onSearch}
          disabled={loading}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #111827",
            background: "#111827",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 800,
          }}
        >
          Search
        </button>
      </div>

      {err && <div style={{ color: "crimson", marginTop: 12 }}>{err}</div>}
      {loading ? <div style={{ marginTop: 12 }}>Loading…</div> : null}

      <div style={{ marginTop: 14, border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 160px 140px 200px 100px",
            padding: 12,
            background: "#F9FAFB",
            fontWeight: 900,
            color: "#111827",
            borderBottom: "1px solid #E5E7EB",
          }}
        >
          <div>Helper</div>
          <div>Avg rating</div>
          <div>Reviews</div>
          <div>Last review</div>
          <div></div>
        </div>

        {items.map((it) => (
          <div
            key={it.helperId}
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 160px 140px 200px 100px",
              padding: 12,
              borderBottom: "1px solid #F3F4F6",
              alignItems: "center",
              cursor: "pointer",
            }}
            onClick={() => nav(`/admin/ratings/${it.helperId}`)}
            title="Open helper ratings"
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {it.name}
              </div>
              <div style={{ color: "#6B7280", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {it.email}
              </div>
            </div>

            <div><RatingPill v={it.avgRating} /></div>

            <div style={{ fontWeight: 800 }}>{it.reviewCount}</div>

            <div style={{ color: "#6B7280", fontWeight: 700 }}>
              {it.lastReviewAt ? new Date(it.lastReviewAt).toLocaleString() : "—"}
            </div>

            <div style={{ textAlign: "right" }}>
              <button
                onClick={async (e) => {
                  e.stopPropagation(); // 🚨 important: prevents row navigation
                  try {
                    const out = await import("@/api/adminRatings").then(m =>
                      m.createRatingRiskIssue(it.helperId)
                    );

                    alert(
                      out.created
                        ? `Issue created: ${out.issueId}`
                        : `Issue already exists: ${out.issueId}`
                    );

                    // Optional: jump straight to issue
                    // nav(`/admin/issues/${out.issueId}`);
                  } catch (err: any) {
                    alert(
                      err?.response?.data?.error ||
                      err?.message ||
                      "Failed to create issue"
                    );
                  }
                }}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid #111827",
                  background: "#111827",
                  color: "#fff",
                  fontWeight: 800,
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                Create Issue
              </button>
            </div>

          </div>
        ))}

        {!loading && items.length === 0 ? (
          <div style={{ padding: 16, color: "#6B7280" }}>No helpers found.</div>
        ) : null}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
        <div style={{ color: "#6B7280" }}>
          Page {page} / {Math.max(1, totalPages)}
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #E5E7EB", background: "#fff", cursor: "pointer" }}
          >
            Prev
          </button>
          <button
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
            style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #E5E7EB", background: "#fff", cursor: "pointer" }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
