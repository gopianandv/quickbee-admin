import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import StatusBadge from "@/components/ui/StatusBadge";
import { adminListLedger, adminExportLedger } from "@/api/adminFinanceLedgerApi";
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

  const statusOptions = Array.from(new Set(rows.map(r => r.status))).sort();
  const typeOptions = Array.from(new Set(rows.map(r => r.type))).sort();
  const hasFilters = status || type || search;

  const [exporting, setExporting] = useState(false);
  const [exportErr, setExportErr] = useState<string | null>(null);



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
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          >
            <option value="">All</option>
            {/* fallback enums so the dropdown still works when list is empty */}
            {(["PENDING", "POSTED", "REVERSED"] as const)
              .filter((s) => statusOptions.includes(s) || statusOptions.length === 0)
              .map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            {/* show any extra statuses that exist in data */}
            {statusOptions
              .filter((s) => !["PENDING", "POSTED", "REVERSED"].includes(s))
              .map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
          </select>
        </div>

        {exportErr ? (
          <div style={{ marginTop: 10, color: "crimson", fontSize: 13 }}>
            {exportErr}
          </div>
        ) : null}


        <div>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Type</div>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          >
            <option value="">All</option>
            {/* fallback enums so dropdown works even when list is empty */}
            {(
              [
                "CREDIT_ESCROW_RELEASE",
                "CREDIT_TOPUP",
                "CREDIT_REFUND_TO_WALLET",
                "DEBIT_CASHOUT",
                "DEBIT_SPEND",
                "ADJUSTMENT_CREDIT",
                "ADJUSTMENT_DEBIT",
              ] as const
            )
              .filter((t) => typeOptions.includes(t) || typeOptions.length === 0)
              .map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            {/* show any extra types that exist in data */}
            {typeOptions
              .filter(
                (t) =>
                  ![
                    "CREDIT_ESCROW_RELEASE",
                    "CREDIT_TOPUP",
                    "CREDIT_REFUND_TO_WALLET",
                    "DEBIT_CASHOUT",
                    "DEBIT_SPEND",
                    "ADJUSTMENT_CREDIT",
                    "ADJUSTMENT_DEBIT",
                  ].includes(t)
              )
              .map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
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

        <div style={{ display: "flex", alignItems: "end", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={apply} style={{ padding: "9px 14px" }}>
            Apply
          </button>

          {hasFilters && (
            <button
              onClick={() => {
                setStatus("");
                setType("");
                setSearch("");
                setSp(new URLSearchParams({ page: "1", pageSize: String(pageSize) }));
              }}
              style={{
                padding: "9px 12px",
                background: "#f5f5f5",
                border: "1px solid #ddd",
                color: "#444",
              }}
            >
              Clear
            </button>
          )}

          <button
            disabled={exporting}
            onClick={async () => {
              try {
                setExportErr(null);
                setExporting(true);

                const blob = await adminExportLedger({
                  status: sp.get("status") || undefined,
                  type: sp.get("type") || undefined,
                  search: sp.get("search") || undefined,
                  from: sp.get("from") || undefined,
                  to: sp.get("to") || undefined,
                });

                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "wallet-ledger.xlsx";
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
              } catch (e: any) {
                setExportErr(e?.response?.data?.error || e?.message || "Export failed");
              } finally {
                setExporting(false);
              }
            }}
            style={{
              padding: "9px 12px",
              fontWeight: 800,
              border: "1px solid #111827",
              background: "#111827",
              color: "white",
              borderRadius: 8,
              opacity: exporting ? 0.7 : 1,
              cursor: exporting ? "not-allowed" : "pointer",
            }}
          >
            {exporting ? "Exporting…" : "Export"}
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
