import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import StatusBadge from "@/components/ui/StatusBadge";
import { getIssues, type IssueListItem, type IssueStatus, type IssueSeverity } from "@/api/adminIssues";

function pillStyle(bg: string, fg: string, border: string) {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 10px",
    borderRadius: 999,
    background: bg,
    color: fg,
    border: `1px solid ${border}`,
    fontSize: 12,
    fontWeight: 700 as const,
    whiteSpace: "nowrap" as const,
  };
}

function SeverityBadge({ severity }: { severity?: IssueSeverity | string | null }) {
  const s = String(severity || "MEDIUM").toUpperCase();
  if (s === "HIGH") return <span style={pillStyle("#FEE2E2", "#991B1B", "#FCA5A5")}>HIGH</span>;
  if (s === "LOW") return <span style={pillStyle("#E0F2FE", "#075985", "#7DD3FC")}>LOW</span>;
  return <span style={pillStyle("#FEF3C7", "#92400E", "#FCD34D")}>MED</span>;
}

function AssigneeCell({ item }: { item: IssueListItem }) {
  if (!item.assignedTo) return <span style={{ color: "#6B7280" }}>Unassigned</span>;
  return (
    <span title={item.assignedTo.email} style={{ fontWeight: 600 }}>
      {item.assignedTo.name}
    </span>
  );
}

export default function IssuesList() {
  const nav = useNavigate();

  const [status, setStatus] = useState<IssueStatus | "ALL">("OPEN");
  const [assignedTo, setAssignedTo] = useState<string>("ALL"); // "ALL" | "UNASSIGNED" | userId (later)
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [items, setItems] = useState<IssueListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load(p = page) {
    setLoading(true);
    setErr(null);
    try {
      const data = await getIssues({
        status: status === "ALL" ? undefined : status,
        assignedTo: assignedTo === "ALL" ? undefined : assignedTo,
        search: search.trim() || undefined,
        page: p,
        pageSize,
      });
      setItems(data.items || []);
      setTotal(data.total || 0);
      setHasMore(!!data.hasMore);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Failed to load issues");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, assignedTo, page]);

  function onSearchClick() {
    if (page !== 1) setPage(1);
    else load(1);
  }

  const stats = useMemo(() => {
    const open = items.filter((i) => i.status === "OPEN").length;
    const inReview = items.filter((i) => i.status === "IN_REVIEW").length;
    const resolved = items.filter((i) => i.status === "RESOLVED").length;
    const closed = items.filter((i) => i.status === "CLOSED").length;
    return { open, inReview, resolved, closed };
  }, [items]);

  return (
    <div style={{ maxWidth: 1200, margin: "30px auto", fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Issues</h2>
          <div style={{ color: "#6B7280", marginTop: 6 }}>
            Reports from users (task disputes + general app/support issues). Human reviewed.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={pillStyle("#F3F4F6", "#111827", "#E5E7EB")}>
            Total: {total}
          </div>
          <button
            onClick={() => load(page)}
            disabled={loading}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E7EB", background: "#fff", cursor: "pointer" }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 16 }}>
        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value as any);
          }}
          style={{ padding: 10, borderRadius: 10, border: "1px solid #E5E7EB", background: "#fff" }}
        >
          <option value="OPEN">Open</option>
          <option value="IN_REVIEW">In review</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
          <option value="ALL">All</option>
        </select>

        <select
          value={assignedTo}
          onChange={(e) => {
            setPage(1);
            setAssignedTo(e.target.value);
          }}
          style={{ padding: 10, borderRadius: 10, border: "1px solid #E5E7EB", background: "#fff" }}
          title="Assignment filter"
        >
          <option value="ALL">All assignees</option>
          <option value="UNASSIGNED">Unassigned</option>
          {/* Later: dropdown of admins/operators */}
        </select>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search issue id, task id, user name/email…"
          style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid #E5E7EB", background: "#fff" }}
        />

        <button
          onClick={onSearchClick}
          disabled={loading}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #111827",
            background: "#111827",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Search
        </button>
      </div>

      {/* Quick stats (page level) */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
        <div style={{ ...pillStyle("#ECFDF5", "#065F46", "#A7F3D0"), fontWeight: 800 }}>Open: {stats.open}</div>
        <div style={{ ...pillStyle("#EFF6FF", "#1E3A8A", "#BFDBFE"), fontWeight: 800 }}>In review: {stats.inReview}</div>
        <div style={{ ...pillStyle("#F5F3FF", "#5B21B6", "#DDD6FE"), fontWeight: 800 }}>Resolved: {stats.resolved}</div>
        <div style={{ ...pillStyle("#F3F4F6", "#111827", "#E5E7EB"), fontWeight: 800 }}>Closed: {stats.closed}</div>
      </div>

      {err && <div style={{ color: "crimson", marginTop: 12 }}>{err}</div>}
      {loading ? <div style={{ marginTop: 12 }}>Loading…</div> : null}

      {/* Table */}
      <div style={{ marginTop: 14, border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "180px 140px 120px 1.4fr 1fr 1fr 140px 80px",
            padding: 12,
            background: "#F9FAFB",
            fontWeight: 800,
            color: "#111827",
            borderBottom: "1px solid #E5E7EB",
          }}
        >
          <div>Created</div>
          <div>Status</div>
          <div>Severity</div>
          <div>Task / Category</div>
          <div>Reporter</div>
          <div>Reported user</div>
          <div>Assignee</div>
          <div></div>
        </div>

        {items.map((it) => {
          const isGeneral = !it.task?.id;
          return (
            <div
              key={it.id}
              style={{
                display: "grid",
                gridTemplateColumns: "180px 140px 120px 1.4fr 1fr 1fr 140px 80px",
                padding: 12,
                borderBottom: "1px solid #F3F4F6",
                alignItems: "center",
                cursor: "pointer",
              }}
              onClick={() => nav(`/admin/issues/${it.id}`)}
              title="Open issue"
            >
              <div style={{ color: "#111827", fontWeight: 600 }}>
                {new Date(it.createdAt).toLocaleString()}
              </div>

              <div>
                <StatusBadge status={it.status as any} />
              </div>

              <div>
                <SeverityBadge severity={it.severity} />
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {isGeneral ? "General report" : (it.task?.title || "Task")}
                </div>
                <div style={{ color: "#6B7280", fontSize: 12, marginTop: 4, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {it.category ? <span style={pillStyle("#F3F4F6", "#111827", "#E5E7EB")}>{it.category}</span> : null}
                  {!isGeneral && it.task?.id ? <span style={{ fontWeight: 700 }}>Task: {it.task.id.slice(0, 8)}…</span> : null}
                </div>
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {it.reporter?.name || "-"}
                </div>
                <div style={{ color: "#6B7280", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {it.reporter?.email || ""}
                </div>
              </div>

              <div style={{ minWidth: 0 }}>
                {it.reportedUser ? (
                  <>
                    <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {it.reportedUser.name}
                    </div>
                    <div style={{ color: "#6B7280", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {it.reportedUser.email}
                    </div>
                  </>
                ) : (
                  <span style={{ color: "#6B7280" }}>{isGeneral ? "—" : "Unknown"}</span>
                )}
              </div>

              <div>
                <AssigneeCell item={it} />
              </div>

              <div style={{ textAlign: "right" }}>
                <Link
                  to={`/admin/issues/${it.id}`}
                  onClick={(e) => e.stopPropagation()}
                  style={{ textDecoration: "none", fontWeight: 800 }}
                >
                  View
                </Link>
              </div>
            </div>
          );
        })}

        {!loading && items.length === 0 ? (
          <div style={{ padding: 16, color: "#6B7280" }}>No issues found.</div>
        ) : null}
      </div>

      {/* Pagination */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
        <div style={{ color: "#6B7280" }}>
          Showing {items.length} of {total}
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #E5E7EB", background: "#fff", cursor: "pointer" }}
          >
            Prev
          </button>

          <div style={{ fontWeight: 800 }}>Page {page}</div>

          <button
            disabled={!hasMore || loading}
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
