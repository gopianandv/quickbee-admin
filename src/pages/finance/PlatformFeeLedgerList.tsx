import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import StatusBadge from "@/components/ui/StatusBadge";
import { adminListPlatformFees, adminExportPlatformFees } from "@/api/adminPlatformFeeLedgerApi";
import type { PlatformFeeRow } from "@/api/adminPlatformFeeLedgerApi";

function formatINR(paise: number) {
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  return `${sign}₹${(abs / 100).toFixed(2)}`;
}

export default function PlatformFeeLedgerList() {
  const [sp, setSp] = useSearchParams();

  const page = Math.max(1, Number(sp.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize") ?? "20")));

  const [kind, setKind] = useState(sp.get("kind") ?? "");
  const [via, setVia] = useState(sp.get("via") ?? "");
  const [search, setSearch] = useState(sp.get("search") ?? "");
  const [userId, setUserId] = useState(sp.get("userId") ?? "");

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<PlatformFeeRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  async function load() {
    setLoading(true);
    try {
      const data = await adminListPlatformFees({
        page,
        pageSize,
        userId: userId || undefined,
        kind: kind || undefined,
        via: via || undefined,
        search: search || undefined,
      });
      setRows(data.data);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // keep local state in sync if someone navigates using URL only
    setKind(sp.get("kind") ?? "");
    setVia(sp.get("via") ?? "");
    setSearch(sp.get("search") ?? "");
    setUserId(sp.get("userId") ?? "");

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, sp.toString()]);

  function apply() {
    setSp((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", "1");
      next.set("pageSize", String(pageSize));

      if (userId) next.set("userId", userId);
      else next.delete("userId");

      if (kind) next.set("kind", kind);
      else next.delete("kind");

      if (via) next.set("via", via);
      else next.delete("via");

      if (search) next.set("search", search);
      else next.delete("search");

      return next;
    });
  }

  function clear() {
    setKind("");
    setVia("");
    setSearch("");
    setUserId("");
    setSp(new URLSearchParams({ page: "1", pageSize: String(pageSize) }));
  }

  function go(p: number) {
    setSp((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", String(p));
      next.set("pageSize", String(pageSize));

      // preserve current filters while paging
      if (userId) next.set("userId", userId); else next.delete("userId");
      if (kind) next.set("kind", kind); else next.delete("kind");
      if (via) next.set("via", via); else next.delete("via");
      if (search) next.set("search", search); else next.delete("search");

      return next;
    });
  }

  const hasFilters = Boolean(userId || kind || via || search);

  return (
    <div style={{ padding: 16, fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <h2 style={{ margin: 0 }}>Platform Fee Ledger</h2>
          <div style={{ opacity: 0.7, marginTop: 4 }}>
            All platform fee rows (due, payments, adjustments) tied to tasks/users.
          </div>
        </div>
        <div style={{ opacity: 0.7 }}>
          Total: <b>{total}</b>
        </div>
      </div>

      {/* If userId filter is present, show a subtle banner */}
      {userId ? (
        <div
          style={{
            marginTop: 12,
            padding: 10,
            border: "1px solid #eee",
            background: "#fafafa",
            borderRadius: 8,
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            fontSize: 13,
          }}
        >
          <div>
            Filtering to userId:{" "}
            <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{userId}</span>
          </div>
          <button
            onClick={() => {
              setUserId("");
              setSp((prev) => {
                const next = new URLSearchParams(prev);
                next.delete("userId");
                next.set("page", "1");
                return next;
              });
            }}
          >
            Clear user filter
          </button>
        </div>
      ) : null}

      {/* Filters */}
      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "260px 220px 1fr 140px", gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Kind</div>
          <select value={kind} onChange={(e) => setKind(e.target.value)} style={{ width: "100%", padding: 8 }}>
            <option value="">All</option>
            <option value="DUE">DUE</option>
            <option value="PAYMENT">PAYMENT</option>
            <option value="ADJUSTMENT_CREDIT">ADJUSTMENT_CREDIT</option>
            <option value="ADJUSTMENT_DEBIT">ADJUSTMENT_DEBIT</option>
          </select>
        </div>

        <div>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Via</div>
          <select value={via} onChange={(e) => setVia(e.target.value)} style={{ width: "100%", padding: 8 }}>
            <option value="">All</option>
            <option value="APP">APP</option>
            <option value="CASH">CASH</option>
          </select>
        </div>

        <div>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Search user (email/name)</div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="e.g. dev.helper@example.com"
            style={{ width: "100%", padding: 8 }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "end" }}>
          <button onClick={apply} style={{ width: "100%", padding: "9px 12px" }}>
            Apply
          </button>

          <button
            onClick={async () => {
              const blob = await adminExportPlatformFees({
                userId: sp.get("userId") || undefined,
                from: sp.get("from") || undefined,
                to: sp.get("to") || undefined,
                kind: sp.get("kind") || undefined,
                via: sp.get("via") || undefined,
              });

              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "platform-fee-ledger.xlsx";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export to Excel
          </button>


        </div>
      </div>

      {/* subtle clear */}
      {hasFilters && (
        <div style={{ marginTop: 6, display: "flex", justifyContent: "flex-end", fontSize: 13 }}>
          <button
            onClick={clear}
            style={{
              background: "none",
              border: "none",
              color: "#555",
              cursor: "pointer",
              padding: 0,
              textDecoration: "underline",
            }}
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Table */}
      <div style={{ marginTop: 12, border: "1px solid #e5e5e5", borderRadius: 8, overflow: "hidden" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "180px 280px 160px 220px 140px 1fr",
            padding: "10px 12px",
            background: "#fafafa",
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          <div>Created</div>
          <div>User</div>
          <div>Amount</div>
          <div>Kind</div>
          <div>Via</div>
          <div>Links</div>
        </div>

        {loading ? (
          <div style={{ padding: 12 }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 12, opacity: 0.7 }}>No platform fee rows found.</div>
        ) : (
          rows.map((r) => (
            <div
              key={r.id}
              style={{
                display: "grid",
                gridTemplateColumns: "180px 280px 160px 220px 140px 1fr",
                padding: "10px 12px",
                borderTop: "1px solid #eee",
                alignItems: "center",
                fontSize: 13,
              }}
            >
              <div>
                {new Date(r.createdAt).toLocaleString()}
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  <Link to={`/admin/finance/platform-fees/${r.id}`}>View</Link>
                </div>
              </div>

              <div>
                <Link to={`/admin/users/${r.userId}`}>{r.user?.email ?? r.userId}</Link>
                {r.user?.name ? <div style={{ fontSize: 12, opacity: 0.7 }}>{r.user.name}</div> : null}
              </div>

              <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                {formatINR(r.amountPaise)}
              </div>

              <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{r.kind}</div>

              <div>
                <StatusBadge status={r.via ?? "—"} />
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {r.task?.id ? <Link to={`/admin/tasks/${r.task.id}`}>Task</Link> : null}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ opacity: 0.7 }}>
          Page <b>{page}</b> / {totalPages}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button disabled={page <= 1} onClick={() => go(1)}>
            First
          </button>
          <button disabled={page <= 1} onClick={() => go(page - 1)}>
            Prev
          </button>
          <button disabled={page >= totalPages} onClick={() => go(page + 1)}>
            Next
          </button>
          <button disabled={page >= totalPages} onClick={() => go(totalPages)}>
            Last
          </button>
        </div>
      </div>
    </div>
  );
}
