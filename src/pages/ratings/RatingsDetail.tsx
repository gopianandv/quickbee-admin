import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getHelperReviews } from "@/api/adminRatings";

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

function RatingPill({ v }: { v: number }) {
  if (v >= 4.5) return <span style={pillStyle("#ECFDF5", "#065F46", "#A7F3D0")}>{v}</span>;
  if (v >= 3.5) return <span style={pillStyle("#FEF3C7", "#92400E", "#FCD34D")}>{v}</span>;
  return <span style={pillStyle("#FEE2E2", "#991B1B", "#FCA5A5")}>{v}</span>;
}

export default function RatingsDetail() {
  const { helperId } = useParams<{ helperId: string }>();

  const [items, setItems] = useState<any[]>([]);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [totalPages, setTotalPages] = useState(0);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load(p = page) {
    if (!helperId) return;
    setLoading(true);
    setErr(null);
    try {
      const data = await getHelperReviews(helperId, { page: p, pageSize });
      setItems(data.items || []);
      setAvgRating(data.avgRating ?? null);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 0);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [helperId, page]);

  return (
    <div style={{ maxWidth: 1200, margin: "30px auto", fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Helper ratings</h2>

          <div style={{ color: "#6B7280", marginTop: 6 }}>
            Helper ID:{" "}
            <b style={{ color: "#111827" }}>{helperId}</b>
            {helperId ? (
              <>
                {" "}
                ·{" "}
                <Link to={`/admin/users/${helperId}`} style={{ fontWeight: 900 }}>
                  Open user profile →
                </Link>
              </>
            ) : null}
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={pillStyle("#F3F4F6", "#111827", "#E5E7EB")}>Total reviews: {total}</div>
            {avgRating != null ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ color: "#6B7280", fontWeight: 800 }}>Avg:</span>
                <RatingPill v={avgRating} />
              </div>
            ) : (
              <div style={{ color: "#6B7280", fontWeight: 800 }}>Avg: —</div>
            )}
          </div>
        </div>

        <button
          onClick={() => load(page)}
          disabled={loading}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E7EB", background: "#fff", cursor: "pointer" }}
        >
          Refresh
        </button>
      </div>

      {err && <div style={{ color: "crimson", marginTop: 12 }}>{err}</div>}
      {loading ? <div style={{ marginTop: 12 }}>Loading…</div> : null}

      <div style={{ marginTop: 14, border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "180px 120px 1fr 220px",
            padding: 12,
            background: "#F9FAFB",
            fontWeight: 900,
            color: "#111827",
            borderBottom: "1px solid #E5E7EB",
          }}
        >
          <div>Date</div>
          <div>Rating</div>
          <div>Comment</div>
          <div>Reviewer / Task</div>
        </div>

        {items.map((r) => (
          <div
            key={r.id}
            style={{
              display: "grid",
              gridTemplateColumns: "180px 120px 1fr 220px",
              padding: 12,
              borderBottom: "1px solid #F3F4F6",
              alignItems: "start",
            }}
          >
            <div style={{ color: "#111827", fontWeight: 700 }}>
              {r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}
            </div>

            <div>{typeof r.rating === "number" ? <RatingPill v={r.rating} /> : "—"}</div>

            <div style={{ color: "#111827", fontWeight: 600, whiteSpace: "pre-wrap" }}>
              {r.comment || <span style={{ color: "#6B7280" }}>—</span>}
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.reviewer?.id ? (
                  <Link to={`/admin/users/${r.reviewer.id}`} style={{ fontWeight: 900 }}>
                    {r.reviewer?.name || "—"}
                  </Link>
                ) : (
                  (r.reviewer?.name || "—")
                )}
              </div>
              <div style={{ color: "#6B7280", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.reviewer?.email || ""}
              </div>

              {r.task?.id ? (
                <div style={{ marginTop: 6, fontSize: 12 }}>
                  Task:{" "}
                  <Link to={`/admin/tasks/${r.task.id}`} style={{ fontWeight: 900 }}>
                    {r.task.title || r.task.id}
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        ))}

        {!loading && items.length === 0 ? (
          <div style={{ padding: 16, color: "#6B7280" }}>No reviews found.</div>
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
