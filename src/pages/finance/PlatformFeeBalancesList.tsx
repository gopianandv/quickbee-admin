import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { adminListPlatformFeeBalances } from "@/api/adminPlatformFeeLedgerApi";
import type { PlatformFeeBalanceItem } from "@/api/adminPlatformFeeLedgerApi";

function formatINR(paise: number) {
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  return `${sign}₹${(abs / 100).toFixed(2)}`;
}

export default function PlatformFeeBalancesList() {
  const [sp, setSp] = useSearchParams();

  const page = Math.max(1, Number(sp.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize") ?? "20")));

  const [q, setQ] = useState(sp.get("q") ?? "");
  const [minOutstanding, setMinOutstanding] = useState(sp.get("minOutstanding") ?? ""); // rupees input

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<PlatformFeeBalanceItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [degraded, setDegraded] = useState<{ on: boolean; reason?: string }>({ on: false });

  function toPaise(val: string) {
    const n = Number(val);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.round(n * 100);
  }

  async function load() {
    setLoading(true);
    try {
      const data = await adminListPlatformFeeBalances({
        page,
        pageSize,
        q: q.trim() || undefined,
        minOutstandingPaise: toPaise(minOutstanding),
      });
      setRows(data.data);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setDegraded({ on: Boolean(data.degraded), reason: data.degradedReason });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setQ(sp.get("q") ?? "");
    setMinOutstanding(sp.get("minOutstanding") ?? "");
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, sp.toString()]);

  function apply() {
    setSp((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", "1");
      next.set("pageSize", String(pageSize));

      if (q.trim()) next.set("q", q.trim());
      else next.delete("q");

      if (minOutstanding.trim()) next.set("minOutstanding", minOutstanding.trim());
      else next.delete("minOutstanding");

      // ensure tab stays on balances
      next.set("tab", "balances");

      return next;
    });
  }

  function clear() {
    setQ("");
    setMinOutstanding("");
    setSp(new URLSearchParams({ page: "1", pageSize: String(pageSize), tab: "balances" }));
  }

  function go(p: number) {
    setSp((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", String(p));
      next.set("pageSize", String(pageSize));
      next.set("tab", "balances");
      if (q.trim()) next.set("q", q.trim()); else next.delete("q");
      if (minOutstanding.trim()) next.set("minOutstanding", minOutstanding.trim()); else next.delete("minOutstanding");
      return next;
    });
  }

  const hasFilters = Boolean(q.trim() || minOutstanding.trim());

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

      {/* Filters */}
      <div style={{ marginTop: 0, display: "grid", gridTemplateColumns: "1fr 220px 140px", gap: 12 }}>
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

        <div style={{ display: "flex", alignItems: "end" }}>
          <button onClick={apply} style={{ width: "100%", padding: "9px 12px" }}>
            Apply
          </button>
        </div>
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
                <Link to={`/admin/finance/platform-fees?tab=ledger&userId=${r.userId}`}>
                  Open ledger
                </Link>
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
