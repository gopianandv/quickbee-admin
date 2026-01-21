import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import StatusBadge from "@/components/ui/StatusBadge";
import { adminListLedger } from "@/api/adminFinanceLedgerApi";
import type { LedgerTxnRow } from "@/api/adminFinanceLedgerApi";


function formatINR(paise: number) {
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  return `${sign}₹${(abs / 100).toFixed(2)}`;
}

export default function LedgerList() {
  const [sp, setSp] = useSearchParams();

  const page = Math.max(1, Number(sp.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize") ?? "20")));

  const [status, setStatus] = useState(sp.get("status") ?? "");
  const [type, setType] = useState(sp.get("type") ?? "");
  const [search, setSearch] = useState(sp.get("search") ?? "");

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<LedgerTxnRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  async function load() {
    setLoading(true);
    try {
      const data = await adminListLedger({
        page,
        pageSize,
        status: status || undefined,
        type: type || undefined,
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
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, sp.toString()]);

  function apply() {
    setSp((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", "1");
      next.set("pageSize", String(pageSize));
      if (status) next.set("status", status);
      else next.delete("status");
      if (type) next.set("type", type);
      else next.delete("type");
      if (search) next.set("search", search);
      else next.delete("search");
      return next;
    });
  }

  function go(p: number) {
    setSp((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", String(p));
      next.set("pageSize", String(pageSize));
      return next;
    });
  }

  return (
    <div style={{ padding: 16, fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <h2 style={{ margin: 0 }}>Wallet Ledger</h2>
          <div style={{ opacity: 0.7, marginTop: 4 }}>
            All wallet movements (escrow credits, cashout debits, adjustments, etc.)
          </div>
        </div>
        <div style={{ opacity: 0.7 }}>
          Total: <b>{total}</b>
        </div>
      </div>

      {/* Filters */}
      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "220px 240px 1fr 140px", gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Status</div>
          <input
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            placeholder="e.g. POSTED"
            style={{ width: "100%", padding: 8 }}
          />
        </div>

        <div>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Type</div>
          <input
            value={type}
            onChange={(e) => setType(e.target.value)}
            placeholder="e.g. DEBIT_CASHOUT"
            style={{ width: "100%", padding: 8 }}
          />
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
        </div>
      </div>

      {/* Table */}
      <div style={{ marginTop: 16, border: "1px solid #e5e5e5", borderRadius: 8, overflow: "hidden" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "180px 280px 160px 260px 140px 1fr",
            padding: "10px 12px",
            background: "#fafafa",
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          <div>Created</div>
          <div>User</div>
          <div>Amount</div>
          <div>Type</div>
          <div>Status</div>
          <div>Links</div>
        </div>

        {loading ? (
          <div style={{ padding: 12 }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 12, opacity: 0.7 }}>No transactions found.</div>
        ) : (
          rows.map((r) => (
            <div
              key={r.id}
              style={{
                display: "grid",
                gridTemplateColumns: "180px 280px 160px 260px 140px 1fr",
                padding: "10px 12px",
                borderTop: "1px solid #eee",
                alignItems: "center",
                fontSize: 13,
              }}
            >
              <div>
                {new Date(r.createdAt).toLocaleString()}
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  <Link to={`/admin/finance/ledger/${r.id}`}>View</Link>
                </div>
              </div>

              <div>
                <Link to={`/admin/users/${r.userId}`}>{r.user?.email ?? r.userId}</Link>
                {r.user?.name ? <div style={{ fontSize: 12, opacity: 0.7 }}>{r.user.name}</div> : null}
              </div>

              <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                {formatINR(r.amountPaise)}
              </div>

              <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{r.type}</div>

              <div>
                <StatusBadge status={r.status} />
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {r.task?.id ? <Link to={`/admin/tasks/${r.task.id}`}>Task</Link> : null}
                {r.escrow?.id ? <Link to={`/admin/escrows/${r.escrow.id}`}>Escrow</Link> : null}
                {r.links?.cashoutId ? (
                  <Link to={`/admin/finance/cashouts/${r.links.cashoutId}`}>Cashout</Link>
                ) : null}
                {r.links?.paymentIntentId ? <span style={{ opacity: 0.7 }}>PaymentIntent (later)</span> : null}
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
          <button disabled={page <= 1} onClick={() => go(1)}>First</button>
          <button disabled={page <= 1} onClick={() => go(page - 1)}>Prev</button>
          <button disabled={page >= totalPages} onClick={() => go(page + 1)}>Next</button>
          <button disabled={page >= totalPages} onClick={() => go(totalPages)}>Last</button>
        </div>
      </div>
    </div>
  );
}
