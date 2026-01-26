import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import StatusBadge from "@/components/ui/StatusBadge";
import { adminListPaymentIntents, adminExportPaymentIntents } from "@/api/adminPaymentIntentsApi";
import type { PaymentIntentRow } from "@/api/adminPaymentIntentsApi";

function formatINR(paise: number) {
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  return `${sign}₹${(abs / 100).toFixed(2)}`;
}

export default function PaymentIntentsList() {
  const [sp, setSp] = useSearchParams();

  const page = Math.max(1, Number(sp.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize") ?? "20")));

  const [status, setStatus] = useState(sp.get("status") ?? "");
  const [provider, setProvider] = useState(sp.get("provider") ?? "");
  const [search, setSearch] = useState(sp.get("search") ?? "");

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<PaymentIntentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [exporting, setExporting] = useState(false);
  const [exportErr, setExportErr] = useState<string | null>(null);


  async function load() {
    setLoading(true);
    try {
      const data = await adminListPaymentIntents({
        page,
        pageSize,
        status: status || undefined,
        provider: provider || undefined,
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

      if (provider) next.set("provider", provider);
      else next.delete("provider");

      if (search) next.set("search", search);
      else next.delete("search");

      return next;
    });
  }

  function clear() {
    setStatus("");
    setProvider("");
    setSearch("");
    setSp(new URLSearchParams({ page: "1", pageSize: String(pageSize) }));
  }

  function go(p: number) {
    setSp((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", String(p));
      next.set("pageSize", String(pageSize));
      return next;
    });
  }

  const hasFilters = Boolean(status || provider || search);

  return (
    <div style={{ padding: 16, fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <h2 style={{ margin: 0 }}>Payment Intents</h2>
          <div style={{ opacity: 0.7, marginTop: 4 }}>
            Incoming payments / topups. (Stripe later — read-only for MVP)
          </div>
        </div>
        <div style={{ opacity: 0.7 }}>
          Total: <b>{total}</b>
        </div>
      </div>

      {/* Filters */}
      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "220px 220px 1fr 140px", gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Status</div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: "100%", padding: 8 }}>
            <option value="">All</option>
            <option value="REQUIRES_ACTION">REQUIRES_ACTION</option>
            <option value="PENDING">PENDING</option>
            <option value="SUCCEEDED">SUCCEEDED</option>
            <option value="FAILED">FAILED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>

        <div>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Provider</div>
          <select value={provider} onChange={(e) => setProvider(e.target.value)} style={{ width: "100%", padding: 8 }}>
            <option value="">All</option>
            <option value="FAKE">FAKE</option>
            <option value="STRIPE">STRIPE</option>
            <option value="RAZORPAY">RAZORPAY</option>
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

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", alignItems: "end" }}>
          <button onClick={apply} style={{ padding: "9px 12px", minWidth: 110 }}>
            Apply
          </button>

          <button
            disabled={exporting}
            onClick={async () => {
              try {
                setExportErr(null);
                setExporting(true);

                const blob = await adminExportPaymentIntents({
                  status: sp.get("status") || undefined,
                  provider: sp.get("provider") || undefined,
                  search: sp.get("search") || undefined,
                  from: sp.get("from") || undefined,
                  to: sp.get("to") || undefined,
                });

                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "payment-intents.xlsx";
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
              minWidth: 150,
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
        {exportErr ? (
          <div style={{ marginTop: 10, color: "crimson", fontSize: 13 }}>
            {exportErr}
          </div>
        ) : null}


      </div>

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
            gridTemplateColumns: "180px 280px 160px 140px 200px 1fr",
            padding: "10px 12px",
            background: "#fafafa",
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          <div>Created</div>
          <div>User</div>
          <div>Amount</div>
          <div>Provider</div>
          <div>Status</div>
          <div>Links</div>
        </div>

        {loading ? (
          <div style={{ padding: 12 }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 12, opacity: 0.7 }}>No payment intents found.</div>
        ) : (
          rows.map((r) => (
            <div
              key={r.id}
              style={{
                display: "grid",
                gridTemplateColumns: "180px 280px 160px 140px 200px 1fr",
                padding: "10px 12px",
                borderTop: "1px solid #eee",
                alignItems: "center",
                fontSize: 13,
              }}
            >
              <div>
                {new Date(r.createdAt).toLocaleString()}
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  <Link to={`/admin/finance/payment-intents/${r.id}`}>View</Link>
                </div>
              </div>

              <div>
                <Link to={`/admin/users/${r.userId}`}>{r.user?.email ?? r.userId}</Link>
                {r.user?.name ? <div style={{ fontSize: 12, opacity: 0.7 }}>{r.user.name}</div> : null}
              </div>

              <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                {formatINR(r.amountPaise)}
              </div>

              <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{r.provider}</div>

              <div>
                <StatusBadge status={r.status} />
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {r.postedWalletTxnId ? (
                  <Link to={`/admin/finance/ledger/${r.postedWalletTxnId}`}>Posted Txn</Link>
                ) : (
                  <span style={{ opacity: 0.7 }}>Not posted</span>
                )}
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
