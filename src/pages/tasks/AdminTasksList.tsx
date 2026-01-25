import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { adminListTasks, type TaskListItem } from "@/api/adminTasks";
import StatusBadge from "@/components/ui/StatusBadge";

type StatusOption = { label: string; value: string };

function moneyRs(paise?: number | null) {
  const n = Number(paise ?? 0);
  return (n / 100).toFixed(2);
}

export default function AdminTasksList() {
  const pageSize = 20;
  const [sp, setSp] = useSearchParams();

  // ✅ URL is source of truth (applied filters)
  const appliedSkillId = sp.get("skillId") ?? "";
  const appliedOpen = sp.get("open") === "1";
  const appliedStatus = sp.get("status") ?? "";
  const appliedSearch = sp.get("search") ?? "";
  const page = Math.max(1, Number(sp.get("page") ?? "1"));

  // ✅ local draft inputs (what user is typing)
  const [status, setStatus] = useState<string>(appliedStatus);
  const [search, setSearch] = useState(appliedSearch);

  // data
  const [items, setItems] = useState<TaskListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // keep local inputs synced when URL changes (back/forward or drilldown clicks)
  useEffect(() => {
    setStatus(appliedStatus);
    setSearch(appliedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedStatus, appliedSearch]);

  // ✅ Canonical statuses
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

  async function loadFromUrl() {
    setLoading(true);
    setErr(null);
    try {
      const data = await adminListTasks({
        status: appliedStatus || undefined,
        search: appliedSearch.trim() || undefined,
        page,
        pageSize,

        // ✅ optional drill-down filters
        // NOTE: these must be supported by your api wrapper + backend
        skillId: appliedSkillId || undefined,
        open: appliedOpen ? "1" : undefined,
      } as any);

      setItems(data.items || []);
      setTotal(data.total || 0);
      setHasMore(!!data.hasMore);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }

  // reload whenever URL changes (filters/paging/drilldown)
  useEffect(() => {
    loadFromUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp.toString()]);

  function applyFiltersToUrl(nextPage = 1) {
    setSp((prev) => {
      const next = new URLSearchParams(prev);

      next.set("page", String(nextPage));

      const sTrim = search.trim();
      if (sTrim) next.set("search", sTrim);
      else next.delete("search");

      if (status) next.set("status", status);
      else next.delete("status");

      // ✅ preserve drilldown params if currently present
      if (appliedSkillId) next.set("skillId", appliedSkillId);
      else next.delete("skillId");

      if (appliedOpen) next.set("open", "1");
      else next.delete("open");

      return next;
    });
  }

  function clearFilters() {
    setStatus("");
    setSearch("");
    setSp((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", "1");
      next.delete("status");
      next.delete("search");

      // keep drill-down or remove? (I prefer remove on clear)
      next.delete("skillId");
      next.delete("open");

      return next;
    });
  }

  function goToPage(p: number) {
    setSp((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", String(Math.max(1, p)));
      return next;
    });
  }

  const isDrilldown = Boolean(appliedSkillId || appliedOpen);

  return (
    <div style={{ maxWidth: 1200, margin: "30px auto", fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h2 style={{ margin: 0 }}>Tasks</h2>

        {isDrilldown ? (
          <div style={{ fontSize: 12, opacity: 0.75 }}>
            Drill-down:
            {appliedSkillId ? <span> skillId={appliedSkillId}</span> : null}
            {appliedOpen ? <span> • open=1</span> : null}
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12, marginBottom: 12 }}>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            // apply immediately + reset to page 1
            setSp((prev) => {
              const next = new URLSearchParams(prev);
              next.set("page", "1");
              if (e.target.value) next.set("status", e.target.value);
              else next.delete("status");
              return next;
            });
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
            if (e.key === "Enter") applyFiltersToUrl(1);
          }}
        />

        <button onClick={() => applyFiltersToUrl(1)} style={{ padding: "8px 12px" }} disabled={loading}>
          Search
        </button>

        <button onClick={clearFilters} style={{ padding: "8px 12px" }} disabled={loading}>
          Clear
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
          const payment = String((t as any).paymentMode || "-").toUpperCase(); // APP | CASH | -
          const escrowStatus = (t as any).escrow?.status ? String((t as any).escrow.status) : null;
          const escrowAmount = (t as any).escrow?.amountPaise ?? null;

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
              <div style={{ fontSize: 13 }}>{new Date((t as any).createdAt).toLocaleString()}</div>

              <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(t as any).title}</div>

              <div>
                <StatusBadge status={(t as any).status} />
              </div>

              <div>
                <StatusBadge status={payment} label={payment} />
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {escrowStatus ? <StatusBadge status={escrowStatus} /> : <span style={{ color: "#777" }}>-</span>}
                {escrowAmount != null ? (
                  <span style={{ fontSize: 13, color: "#333" }}>₹ {moneyRs(escrowAmount)}</span>
                ) : null}
              </div>

              <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {(t as any).postedBy?.email || "-"}
              </div>

              <div>
                <Link to={`/admin/tasks/${t.id}`}>View</Link>
              </div>
            </div>
          );
        })}

        {!loading && items.length === 0 ? <div style={{ padding: 12, color: "#555" }}>No tasks found.</div> : null}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
        <div>Total: {total}</div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button disabled={page <= 1 || loading} onClick={() => goToPage(page - 1)}>
            Prev
          </button>
          <div>Page {page}</div>
          <button disabled={!hasMore || loading} onClick={() => goToPage(page + 1)}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
