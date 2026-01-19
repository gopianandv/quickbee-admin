import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import StatusBadge from "@/components/ui/StatusBadge";
import { adminListCashouts } from "@/api/adminFinance";
import { hasPerm } from "@/auth/permissions";

function moneyRs(paise?: number | null) {
  const n = Number(paise ?? 0);
  return (n / 100).toFixed(2);
}

export default function CashoutsList() {
  const nav = useNavigate();
  const canFinance = hasPerm("FINANCE", "ADMIN");

  const [status, setStatus] = useState<string>("");
  const [methodType, setMethodType] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  const [page, setPage] = useState(1);
  const pageSize = 30;

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load(p = page) {
    setLoading(true);
    setErr(null);
    try {
      const data = await adminListCashouts({
        page: p,
        pageSize,
        status: status || undefined,
        methodType: methodType || undefined,
        search: search.trim() || undefined,
      });

      setItems(data.items || []);
      setTotal(data.total || 0);
      setHasMore(!!data.hasMore);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Failed to load cashouts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, methodType, page]);

  function onSearch() {
    if (page !== 1) setPage(1);
    else load(1);
  }

  if (!canFinance) {
    return (
      <div style={{ maxWidth: 1100, margin: "30px auto", fontFamily: "system-ui" }}>
        <h2>Cashouts</h2>
        <div style={{ color: "crimson" }}>You don’t have FINANCE permission.</div>
        <div style={{ marginTop: 10 }}>
          <Link to="/admin/dashboard">Back to dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: "30px auto", fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h2 style={{ margin: 0 }}>Cashouts</h2>
        <button onClick={() => load(page)} disabled={loading} style={{ padding: "8px 12px" }}>
          Refresh
        </button>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12 }}>
        <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }} style={{ padding: 8 }}>
          <option value="">All statuses</option>
          <option value="REQUESTED">Requested</option>
          <option value="PROCESSING">Processing</option>
          <option value="PAID">Paid</option>
          <option value="FAILED">Failed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        <select value={methodType} onChange={(e) => { setPage(1); setMethodType(e.target.value); }} style={{ padding: 8 }}>
          <option value="">All methods</option>
          <option value="UPI">UPI</option>
          <option value="BANK">Bank</option>
        </select>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search user (name/email)…"
          style={{ flex: 1, padding: 8 }}
          onKeyDown={(e) => e.key === "Enter" && onSearch()}
        />

        <button onClick={onSearch} disabled={loading} style={{ padding: "8px 12px" }}>
          Search
        </button>
      </div>

      {err ? <div style={{ color: "crimson", marginTop: 10 }}>{err}</div> : null}
      {loading ? <div style={{ marginTop: 10 }}>Loading…</div> : null}

      <div style={{ marginTop: 12, border: "1px solid #ddd", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
        <div style={{ display: "grid", gridTemplateColumns: "210px 1.2fr 150px 140px 180px 140px", padding: 10, background: "#f5f5f5", fontWeight: 800 }}>
          <div>Created</div>
          <div>User</div>
          <div>Amount</div>
          <div>Method</div>
          <div>Status</div>
          <div></div>
        </div>

        {items.map((c) => (
          <div
            key={c.id}
            style={{ display: "grid", gridTemplateColumns: "210px 1.2fr 150px 140px 180px 140px", padding: 10, borderTop: "1px solid #eee", alignItems: "center", cursor: "pointer" }}
            onClick={() => nav(`/admin/finance/cashouts/${c.id}`)}
          >
            <div>{new Date(c.createdAt).toLocaleString()}</div>

            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              <div style={{ fontWeight: 800 }}>{c.user?.email || c.userId}</div>
              {c.user?.name ? <div style={{ fontSize: 12, color: "#666" }}>{c.user.name}</div> : null}
            </div>

            <div style={{ fontWeight: 800 }}>₹ {moneyRs(c.amountPaise)}</div>

            <div>
              <StatusBadge status={String(c.methodType || "-").toUpperCase()} label={String(c.methodType || "-").toUpperCase()} />
            </div>

            <div><StatusBadge status={String(c.status || "-").toUpperCase()} /></div>

            <div style={{ textAlign: "right" }}>
              <Link to={`/admin/finance/cashouts/${c.id}`} onClick={(e) => e.stopPropagation()}>
                View →
              </Link>
            </div>
          </div>
        ))}

        {!loading && items.length === 0 ? <div style={{ padding: 12, color: "#666" }}>No cashouts found.</div> : null}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
        <div style={{ color: "#666" }}>Showing {items.length} of {total}</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
          <div style={{ fontWeight: 800 }}>Page {page}</div>
          <button disabled={!hasMore || loading} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      </div>
    </div>
  );
}
