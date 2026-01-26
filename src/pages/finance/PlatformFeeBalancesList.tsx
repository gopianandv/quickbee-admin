import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { adminListPlatformFeeBalances, adminExportPlatformFeeBalances } from "@/api/adminPlatformFeeLedgerApi";
import type { PlatformFeeBalanceItem } from "@/api/adminPlatformFeeLedgerApi";

function formatINR(paise: number) {
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  return `${sign}₹${(abs / 100).toFixed(2)}`;
}

function toPaise(val: string) {
  const n = Number(val);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

export default function PlatformFeeBalancesList() {
  const [sp, setSp] = useSearchParams();

  const page = Math.max(1, Number(sp.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize") ?? "20")));

  // URL is source of truth for "applied" filters
  const appliedQ = sp.get("q") ?? "";
  const appliedMinOutstanding = sp.get("minOutstanding") ?? ""; // rupees input
  const appliedOnlyDue = (sp.get("onlyDue") ?? "") === "1";

  // Local state for inputs (draft values)
  const [q, setQ] = useState(appliedQ);
  const [minOutstanding, setMinOutstanding] = useState(appliedMinOutstanding);
  const [onlyDue, setOnlyDue] = useState(appliedOnlyDue);

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<PlatformFeeBalanceItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [degraded, setDegraded] = useState<{ on: boolean; reason?: string }>({ on: false });

  const [exporting, setExporting] = useState(false);
  const [exportErr, setExportErr] = useState<string | null>(null);


  // keep inputs in sync when URL changes (back/forward, link clicks, etc.)
  useEffect(() => {
    setQ(appliedQ);
    setMinOutstanding(appliedMinOutstanding);
    setOnlyDue(appliedOnlyDue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedQ, appliedMinOutstanding, appliedOnlyDue]);

  const hasFilters = useMemo(() => {
    return Boolean(appliedQ.trim() || appliedMinOutstanding.trim() || appliedOnlyDue);
  }, [appliedQ, appliedMinOutstanding, appliedOnlyDue]);

  async function loadFromUrl() {
    setLoading(true);
    try {
      const minPaiseFromInput = toPaise(appliedMinOutstanding);
      const minOutstandingPaise = appliedOnlyDue
        ? Math.max(1, minPaiseFromInput || 1) // at least 1 paise
        : minPaiseFromInput;

      const data = await adminListPlatformFeeBalances({
        page,
        pageSize,
        q: appliedQ.trim() || undefined,
        minOutstandingPaise,
      });

      setRows(data.data);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setDegraded({ on: Boolean(data.degraded), reason: data.degradedReason });
    } finally {
      setLoading(false);
    }
  }

  // Reload whenever URL / paging changes
  useEffect(() => {
    loadFromUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, sp.toString()]);

  function apply() {
    setSp((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", "1");
      next.set("pageSize", String(pageSize));

      const qTrim = q.trim();
      const minTrim = minOutstanding.trim();

      if (qTrim) next.set("q", qTrim);
      else next.delete("q");

      if (minTrim) next.set("minOutstanding", minTrim);
      else next.delete("minOutstanding");

      if (onlyDue) next.set("onlyDue", "1");
      else next.delete("onlyDue");

      // ensure tab stays on balances (if your parent page uses this)
      next.set("tab", "balances");

      return next;
    });
  }

  function clear() {
    setQ("");
    setMinOutstanding("");
    setOnlyDue(false);
    setSp(new URLSearchParams({ page: "1", pageSize: String(pageSize), tab: "balances" }));
  }

  function go(p: number) {
    setSp((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", String(p));
      next.set("pageSize", String(pageSize));
      next.set("tab", "balances");
      return next;
    });
  }

  return (
    <div style={{ padding: 16, fontFamily: "system-ui" }}>
      {degraded.on ? (
        <div
          style={{
            marginTop: 0,
            marginBottom: 12,
            padding: 12,
            border: "1px solid #ffeeba",
            background: "#fff3cd",
            borderRadius: 10,
          }}
        >
          Platform fee balances are temporarily unavailable (fail-open). {degraded.reason ?? ""}
        </div>
      ) : null}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <h2 style={{ margin: 0 }}>Platform Fee Balances</h2>
          <div style={{ opacity: 0.7, marginTop: 4 }}>
            Outstanding platform fees per helper (due - paid). Use “Open ledger” to audit.
          </div>
        </div>
        <div style={{ opacity: 0.7 }}>
          Total: <b>{total}</b>
        </div>

      </div>

      {/* Filters */}
      <div
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: "1fr 220px 260px 140px",
          gap: 12,
          alignItems: "end",
        }}
      >
        <div>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Search user (email/name)</div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. dev.helper@example.com"
            style={{ width: "100%", padding: 8 }}
          />
        </div>

        <div>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Min outstanding (₹)</div>
          <input
            value={minOutstanding}
            onChange={(e) => setMinOutstanding(e.target.value)}
            placeholder="e.g. 50"
            style={{ width: "100%", padding: 8 }}
          />
        </div>



        {exportErr && (
          <div style={{ marginTop: 8, color: "crimson", fontSize: 13 }}>
            {exportErr}
          </div>
        )}


        <div>
          <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13 }}>
            <input
              type="checkbox"
              checked={onlyDue}
              onChange={(e) => {
                const checked = e.target.checked;
                setOnlyDue(checked);

                // auto-apply onlyDue instantly
                setSp((prev) => {
                  const next = new URLSearchParams(prev);
                  next.set("page", "1");
                  next.set("pageSize", String(pageSize));
                  next.set("tab", "balances");

                  // keep current draft values in URL so results match what user sees
                  const qTrim = q.trim();
                  const minTrim = minOutstanding.trim();

                  if (qTrim) next.set("q", qTrim);
                  else next.delete("q");

                  if (minTrim) next.set("minOutstanding", minTrim);
                  else next.delete("minOutstanding");

                  if (checked) next.set("onlyDue", "1");
                  else next.delete("onlyDue");

                  return next;
                });
              }}
            />
            Show only due (outstanding &gt; 0)
          </label>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            disabled={exporting}
            onClick={async () => {
              try {
                setExportErr(null);
                setExporting(true);

                const minPaiseFromInput = toPaise(appliedMinOutstanding);
                const minOutstandingPaise = appliedOnlyDue
                  ? Math.max(1, minPaiseFromInput || 1)
                  : minPaiseFromInput;

                const blob = await adminExportPlatformFeeBalances({
                  q: appliedQ.trim() || undefined,
                  minOutstandingPaise,
                });

                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "platform-fee-balances.xlsx";
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
              } catch (e: any) {
                setExportErr(e?.message || "Export failed");
              } finally {
                setExporting(false);
              }
            }}
            style={{
              padding: "9px 12px",
              minWidth: 180,
              fontWeight: 700,
              opacity: exporting ? 0.7 : 1,
            }}
          >
            {exporting ? "Exporting…" : "Export to Excel"}
          </button>
          <button onClick={apply} style={{ padding: "9px 12px", minWidth: 120 }}>
            Apply
          </button>
        </div>



      </div>

      {/* Hint OUTSIDE the grid so it doesn't break layout */}
      {onlyDue ? (
        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
          Showing only helpers with outstanding platform fees.
        </div>
      ) : null}

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
            gridTemplateColumns: "360px 160px 160px 180px 1fr",
            padding: "10px 12px",
            background: "#fafafa",
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          <div>User</div>
          <div>Due</div>
          <div>Paid</div>
          <div>Outstanding</div>
          <div>Actions</div>
        </div>

        {loading ? (
          <div style={{ padding: 12 }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 12, opacity: 0.7 }}>No results.</div>
        ) : (
          rows.map((r) => (
            <div
              key={r.userId}
              style={{
                display: "grid",
                gridTemplateColumns: "360px 160px 160px 180px 1fr",
                padding: "10px 12px",
                borderTop: "1px solid #eee",
                alignItems: "center",
                fontSize: 13,
              }}
            >
              <div>
                <Link to={`/admin/users/${r.userId}`}>{r.email}</Link>
                {r.name ? <div style={{ fontSize: 12, opacity: 0.7 }}>{r.name}</div> : null}
                {r.isDisabled ? <div style={{ fontSize: 12, opacity: 0.7 }}>(disabled)</div> : null}
                {r.lastActivityAt ? (
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    Last activity: {new Date(r.lastActivityAt).toLocaleString()}
                  </div>
                ) : null}
              </div>

              <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                {formatINR(r.totalDuePaise)}
              </div>

              <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                {formatINR(r.totalPaidPaise)}
              </div>

              <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontWeight: 800 }}>
                {formatINR(r.outstandingPaise)}
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link to={`/admin/finance/platform-fees?tab=ledger&userId=${r.userId}`}>Open ledger</Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ opacity: 0.7 }}>
          Page <b>{page}</b> / {totalPages} • Total <b>{total}</b>
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
