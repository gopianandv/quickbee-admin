import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { createRatingRiskIssue, getHelperRatings, type AdminHelperRatingRow, type RatingRiskIssuePayload } from "@/api/adminRatings";

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
  if (v >= 4.5) return <span style={pillStyle("#ECFDF5", "#065F46", "#A7F3D0")}>{v.toFixed(2)}</span>;
  if (v >= 3.5) return <span style={pillStyle("#FEF3C7", "#92400E", "#FCD34D")}>{v.toFixed(2)}</span>;
  return <span style={pillStyle("#FEE2E2", "#991B1B", "#FCA5A5")}>{v.toFixed(2)}</span>;
}

type RatingState = "HEALTHY" | "WATCHLIST" | "AT_RISK" | "NO_DATA";

function getRatingState(avg: number | null, count: number) {
  if (count <= 0) return { state: "NO_DATA" as RatingState, label: "No data" };
  if (avg != null && avg < 3.5) return { state: "AT_RISK" as RatingState, label: "At risk" };
  if (avg != null && avg < 4.2) return { state: "WATCHLIST" as RatingState, label: "Watchlist" };
  return { state: "HEALTHY" as RatingState, label: "Healthy" };
}

function StatePill({ state, label }: { state: RatingState; label: string }) {
  if (state === "AT_RISK") return <span style={pillStyle("#FEE2E2", "#991B1B", "#FCA5A5")}>{label}</span>;
  if (state === "WATCHLIST") return <span style={pillStyle("#FEF3C7", "#92400E", "#FCD34D")}>{label}</span>;
  if (state === "HEALTHY") return <span style={pillStyle("#ECFDF5", "#065F46", "#A7F3D0")}>{label}</span>;
  return <span style={pillStyle("#F3F4F6", "#111827", "#E5E7EB")}>{label}</span>;
}

/** small modal wrapper */
function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: any;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 999,
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={{ width: 560, maxWidth: "100%", borderRadius: 14, background: "#fff", border: "1px solid #E5E7EB", overflow: "hidden" }}>
        <div style={{ padding: 14, background: "#F9FAFB", borderBottom: "1px solid #E5E7EB", display: "flex", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 900 }}>{title}</div>
          <button
            onClick={onClose}
            style={{ border: "1px solid #E5E7EB", background: "#fff", borderRadius: 10, padding: "6px 10px", cursor: "pointer", fontWeight: 900 }}
          >
            Close
          </button>
        </div>
        <div style={{ padding: 14 }}>{children}</div>
      </div>
    </div>
  );
}

export default function RatingsList() {
  const nav = useNavigate();
  const location = useLocation();

  function getFilterFromQuery() {
    const qs = new URLSearchParams(location.search);
    return (qs.get("filter") || "").toLowerCase();
  }

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [onlyAtRisk, setOnlyAtRisk] = useState(false);
  const pageSize = 20;

  const [items, setItems] = useState<AdminHelperRatingRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // modal state
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [issueHelper, setIssueHelper] = useState<AdminHelperRatingRow | null>(null);
  const [saving, setSaving] = useState(false);

  const [severity, setSeverity] = useState<RatingRiskIssuePayload["severity"]>("MEDIUM");
  const [reason, setReason] = useState<RatingRiskIssuePayload["reason"]>("LOW_RATING_WATCHLIST");
  const [note, setNote] = useState("");

  const helperMeta = useMemo(() => {
    if (!issueHelper) return null;
    const meta = getRatingState(issueHelper.avgRating, issueHelper.reviewCount);
    return meta;
  }, [issueHelper]);

  function openIssueModal(it: AdminHelperRatingRow) {
    setIssueHelper(it);

    // sensible defaults
    const meta = getRatingState(it.avgRating, it.reviewCount);
    setSeverity(meta.state === "AT_RISK" ? "HIGH" : "MEDIUM");
    setReason("LOW_RATING_WATCHLIST");

    const avg = it.avgRating == null ? "—" : it.avgRating.toFixed(2);
    setNote(
      `Ratings safety review\n\nHelper: ${it.name} (${it.email})\nAvg rating: ${avg}\nReview count: ${it.reviewCount}\nLast review: ${it.lastReviewAt ? new Date(it.lastReviewAt).toLocaleString() : "—"}\n\nAction: Please review recent feedback and decide follow-up (warning/monitor).`
    );

    setIssueModalOpen(true);
  }

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

  useEffect(() => {
    const f = getFilterFromQuery();
    if (f === "at_risk") setOnlyAtRisk(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  function onSearch() {
    if (page !== 1) setPage(1);
    else load(1);
  }

  async function submitCreateIssue() {
    if (!issueHelper) return;
    const body = (note || "").trim();
    if (body.length < 10) {
      alert("Please add a short note (min 10 chars).");
      return;
    }

    setSaving(true);
    try {
      const out = await createRatingRiskIssue(issueHelper.helperId, {
        severity,
        reason,
        note: body,
      });

      alert(out.created ? `Issue created: ${out.issueId}` : `Issue already exists: ${out.issueId}`);
      setIssueModalOpen(false);
      setIssueHelper(null);

      nav(`/admin/issues/${out.issueId}`);
    } catch (e: any) {
      alert(e?.response?.data?.error || e?.message || "Failed to create issue");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 1200, margin: "30px auto", fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Ratings</h2>
          <div style={{ color: "#6B7280", marginTop: 6 }}>Helper feedback summary (avg rating + review count).</div>
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

      <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
        <div
          onClick={() => {
            setOnlyAtRisk((v) => {
              const next = !v;
              const qs = new URLSearchParams(location.search);

              if (next) qs.set("filter", "at_risk");
              else qs.delete("filter");

              nav({ pathname: "/admin/ratings", search: qs.toString() ? `?${qs.toString()}` : "" });
              return next;
            });
          }}
          style={{
            padding: "8px 12px",
            borderRadius: 999,
            border: `1px solid ${onlyAtRisk ? "#111827" : "#E5E7EB"}`,
            background: onlyAtRisk ? "#111827" : "#fff",
            color: onlyAtRisk ? "#fff" : "#111827",
            fontWeight: 900,
            cursor: "pointer",
            userSelect: "none",
            fontSize: 12,
          }}
        >
          Only At-Risk
        </div>
      </div>

      {err && <div style={{ color: "crimson", marginTop: 12 }}>{err}</div>}
      {loading ? <div style={{ marginTop: 12 }}>Loading…</div> : null}

      <div style={{ marginTop: 14, border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 160px 140px 160px 200px 260px",
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
          <div>State</div>
          <div>Last review</div>
          <div>Actions</div>
        </div>

        {items
          .filter((it) => {
            if (!onlyAtRisk) return true;
            const meta = getRatingState(it.avgRating, it.reviewCount);
            return meta.state === "AT_RISK";
          })
          .map((it) => {
            const meta = getRatingState(it.avgRating, it.reviewCount);
            const showCreate = meta.state === "AT_RISK" || meta.state === "WATCHLIST";

            return (
              <div
                key={it.helperId}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.4fr 160px 140px 160px 200px 260px",
                  padding: 12,
                  borderBottom: "1px solid #F3F4F6",
                  alignItems: "center",
                  cursor: "pointer",
                }}
                onClick={() => nav(`/admin/ratings/${it.helperId}`)}
                title="Open helper ratings"
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.name}</div>
                  <div style={{ color: "#6B7280", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.email}</div>
                </div>

                <div><RatingPill v={it.avgRating} /></div>

                <div style={{ fontWeight: 800 }}>{it.reviewCount}</div>

                <div><StatePill state={meta.state} label={meta.label} /></div>

                <div style={{ color: "#6B7280", fontWeight: 700 }}>
                  {it.lastReviewAt ? new Date(it.lastReviewAt).toLocaleString() : "—"}
                </div>

                <div style={{ textAlign: "right", display: "flex", gap: 10, justifyContent: "flex-end", alignItems: "center" }}>
                  <Link
                    to={`/admin/users/${it.helperId}`}
                    onClick={(e) => e.stopPropagation()}
                    style={{ fontWeight: 900, textDecoration: "none" }}
                    title="Open user profile"
                  >
                    View User
                  </Link>

                  {showCreate ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openIssueModal(it);
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
                      title="Create a safety issue from ratings"
                    >
                      Create Safety Issue
                    </button>
                  ) : (
                    <span style={{ fontWeight: 900, color: "#111827" }}>View</span>
                  )}
                </div>
              </div>
            );
          })}

        {!loading && items.length === 0 ? <div style={{ padding: 16, color: "#6B7280" }}>No helpers found.</div> : null}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
        <div style={{ color: "#6B7280" }}>Page {page} / {Math.max(1, totalPages)}</div>

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

      <Modal
        open={issueModalOpen}
        title="Create Ratings Safety Issue"
        onClose={() => {
          if (saving) return;
          setIssueModalOpen(false);
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 900, color: "#6B7280" }}>Helper</div>
            <div style={{ marginTop: 6, fontWeight: 900, color: "#111827" }}>{issueHelper?.name || "—"}</div>
            <div style={{ marginTop: 4, color: "#6B7280", fontWeight: 700 }}>{issueHelper?.email || ""}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: "#6B7280" }}>Rating state</div>
            <div style={{ marginTop: 6 }}>
              {helperMeta ? <StatePill state={helperMeta.state} label={helperMeta.label} /> : null}
            </div>
            <div style={{ marginTop: 8 }}>
              <span style={{ color: "#6B7280", fontWeight: 900, fontSize: 12 }}>Avg:</span>{" "}
              <RatingPill v={issueHelper?.avgRating ?? null} />
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 900, color: "#6B7280", marginBottom: 6 }}>Severity</div>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as any)}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #E5E7EB", background: "#fff", fontWeight: 800 }}
              disabled={saving}
            >
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
            </select>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 900, color: "#6B7280", marginBottom: 6 }}>Reason</div>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as any)}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #E5E7EB", background: "#fff", fontWeight: 800 }}
              disabled={saving}
            >
              <option value="LOW_RATING_WATCHLIST">LOW_RATING_WATCHLIST</option>
              <option value="MISBEHAVIOUR">MISBEHAVIOUR</option>
              <option value="OTHER">OTHER</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: "#6B7280", marginBottom: 6 }}>Note</div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={7}
            style={{ width: "100%", padding: 10, borderRadius: 12, border: "1px solid #E5E7EB", resize: "vertical", fontFamily: "system-ui" }}
            disabled={saving}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
          <button
            onClick={() => setIssueModalOpen(false)}
            disabled={saving}
            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #E5E7EB", background: "#fff", cursor: "pointer", fontWeight: 900 }}
          >
            Cancel
          </button>
          <button
            onClick={submitCreateIssue}
            disabled={saving || (note || "").trim().length < 10}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #111827",
              background: "#111827",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 900,
              opacity: saving ? 0.8 : 1,
            }}
          >
            {saving ? "Creating…" : "Create Issue"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
