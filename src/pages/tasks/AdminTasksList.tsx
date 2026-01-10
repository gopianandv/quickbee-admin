import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { adminListTasks, type TaskListItem } from "@/api/adminTasks";
import StatusBadge from "@/components/ui/StatusBadge";

type StatusOption = { label: string; value: string };

function moneyRs(paise?: number | null) {
  const n = Number(paise ?? 0);
  return (n / 100).toFixed(2);
}

export default function AdminTasksList() {
  const [status, setStatus] = useState<string>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [items, setItems] = useState<TaskListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // ✅ Canonical statuses (matches your DB reality)
  const STATUS_OPTIONS: StatusOption[] = useMemo(
    () => [
      { label: "All statuses", value: "" },
      { label: "New", value: "NEW" },
      { label: "Accepted", value: "ACCEPTED" },
      { label: "In Progress", value: "IN_PROGRESS" },
      { label: "Pending Consumer Confirm", value: "PENDING_CONSUMER_CONFIRM" },
      { label: "Completed", value: "COMPLETED" },
      { label: "Cancelled", value: "CANCELLED" },
      { label: "Expired", value: "EXPIRED" },
    ],
    []
  );

  async function load(p = page) {
    setLoading(true);
    setErr(null);
    try {
      const data = await adminListTasks({
        status: status || undefined,
        search: search.trim() || undefined,
        page: p,
        pageSize,
      });
      setItems(data.items || []);
      setTotal(data.total || 0);
      setHasMore(!!data.hasMore);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page]);

  function onSearchClick() {
    if (page !== 1) setPage(1);
    else load(1);
  }

  return (
    <div style={{ maxWidth: 1200, margin: "30px auto", fontFamily: "system-ui" }}>
      <h2>Tasks</h2>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
          style={{ padding: 8 }}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value || "ALL"} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title"
          style={{ flex: 1, padding: 8 }}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSearchClick();
          }}
        />

        <button onClick={onSearchClick} style={{ padding: "8px 12px" }} disabled={loading}>
          Search
        </button>
      </div>

      {err && <div style={{ color: "crimson", marginBottom: 10 }}>{err}</div>}
      {loading ? <div>Loading…</div> : null}

      <div style={{ border: "1px solid #ddd", borderRadius: 8, overflow: "hidden" }}>
        {/* Header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "210px 1.2fr 170px 110px 230px 200px 110px",
            padding: 10,
            background: "#f5f5f5",
            fontWeight: 700,
          }}
        >
          <div>Created</div>
          <div>Title</div>
          <div>Status</div>
          <div>Payment</div>
          <div>Escrow</div>
          <div>Poster</div>
          <div>Action</div>
        </div>

        {items.map((t) => {
          const payment = String(t.paymentMode || "-").toUpperCase(); // APP | CASH | -
          const escrowStatus = t.escrow?.status ? String(t.escrow.status) : null;
          const escrowAmount = t.escrow?.amountPaise ?? null;

          return (
            <div
              key={t.id}
              style={{
                display: "grid",
                gridTemplateColumns: "210px 1.2fr 170px 110px 230px 200px 110px",
                padding: 10,
                borderTop: "1px solid #eee",
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: 13 }}>{new Date(t.createdAt).toLocaleString()}</div>

              <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {t.title}
              </div>

              <div>
                <StatusBadge status={t.status} />
              </div>

              {/* Payment mode */}
              <div>
                <StatusBadge status={payment} label={payment} />
              </div>

              {/* Escrow summary */}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {escrowStatus ? <StatusBadge status={escrowStatus} /> : <span style={{ color: "#777" }}>-</span>}
                {escrowAmount != null ? (
                  <span style={{ fontSize: 13, color: "#333" }}>₹ {moneyRs(escrowAmount)}</span>
                ) : null}
              </div>

              <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {t.postedBy?.email || "-"}
              </div>

              <div>
                <Link to={`/admin/tasks/${t.id}`}>View</Link>
              </div>
            </div>
          );
        })}

        {!loading && items.length === 0 ? (
          <div style={{ padding: 12, color: "#555" }}>No tasks found.</div>
        ) : null}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
        <div>Total: {total}</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Prev
          </button>
          <div>Page {page}</div>
          <button disabled={!hasMore || loading} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
