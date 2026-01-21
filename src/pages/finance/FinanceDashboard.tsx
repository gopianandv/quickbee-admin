import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  adminGetFinanceDashboardRecent,
  adminGetFinanceDashboardSummary,
} from "@/api/adminFinanceDashboard";
import type {
  FinanceDashboardRecent,
  FinanceDashboardSummary,
} from "@/api/adminFinanceDashboard";

function formatINR(paise: number) {
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  return `${sign}₹${(abs / 100).toFixed(2)}`;
}

function Tile({
  title,
  value,
  sub,
}: {
  title: string;
  value: any;
  sub?: string;
}) {
  return (
    <div style={{ border: "1px solid #e5e5e5", borderRadius: 10, padding: 12, background: "#fff" }}>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 6 }}>{value}</div>
      {sub ? <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>{sub}</div> : null}
    </div>
  );
}

export default function FinanceDashboard() {
  const [days, setDays] = useState(7);

  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<FinanceDashboardSummary | null>(null);
  const [recent, setRecent] = useState<FinanceDashboardRecent | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [s, r] = await Promise.all([
        adminGetFinanceDashboardSummary({ days }),
        adminGetFinanceDashboardRecent({ limit: 10 }),
      ]);
      setSummary(s);
      setRecent(r);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  return (
    <div style={{ padding: 16, fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <h2 style={{ margin: 0 }}>Finance Dashboard</h2>
          <div style={{ opacity: 0.7, marginTop: 4 }}>
            Operational overview for payouts, wallet ledger, platform fees, and payment intents.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Window</div>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} style={{ padding: 8 }}>
            <option value={1}>Last 24h</option>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
          </select>
          <button onClick={load} style={{ padding: "9px 12px" }}>
            Refresh
          </button>
        </div>
      </div>

      {loading && !summary ? <div style={{ padding: 12 }}>Loading…</div> : null}

      {summary ? (
        <>
          {/* Tiles */}
          <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
            <Tile
              title={`Cashouts (${days === 1 ? "24h" : `${days}d`})`}
              value={summary.cashouts.total}
              sub={`REQ ${summary.cashouts.requested} • PROC ${summary.cashouts.processing} • PAID ${summary.cashouts.paid} • FAIL ${summary.cashouts.failed}`}
            />
            <Tile
              title={`Cashouts Paid Amount (${days === 1 ? "24h" : `${days}d`})`}
              value={formatINR(summary.cashoutsPaidAmountPaise)}
            />
            <Tile
              title={`Wallet Volume (abs, POSTED) (${days === 1 ? "24h" : `${days}d`})`}
              value={formatINR(summary.walletVolumeAbsPaise)}
              sub="Sum of absolute posted wallet transactions"
            />
            <Tile
              title={`Platform Fees (${days === 1 ? "24h" : `${days}d`})`}
              value={formatINR(summary.platformFees.duePaise - summary.platformFees.paymentPaise)}
              sub={`Due ${formatINR(summary.platformFees.duePaise)} • Paid ${formatINR(summary.platformFees.paymentPaise)}`}
            />
            <Tile
              title={`Payment Intents (${days === 1 ? "24h" : `${days}d`})`}
              value={summary.paymentIntents.total}
              sub={`PEND ${summary.paymentIntents.pending} • SUCC ${summary.paymentIntents.succeeded} • FAIL ${summary.paymentIntents.failed}`}
            />
          </div>

          {/* Quick Links */}
          <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link to="/admin/finance/cashouts">Go to Cashouts</Link>
            <Link to="/admin/finance/ledger">Go to Wallet Ledger</Link>
            <Link to="/admin/finance/platform-fees">Go to Platform Fee Ledger</Link>
            <Link to="/admin/finance/payment-intents">Go to Payment Intents</Link>
          </div>

          {/* Recent tables */}
          <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {/* Recent Cashouts */}
            <div style={{ border: "1px solid #e5e5e5", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
              <div style={{ padding: "10px 12px", fontWeight: 800, background: "#fafafa" }}>
                Recent Cashouts
              </div>
              <div style={{ padding: 12, display: "grid", gap: 10 }}>
                {recent?.recent.cashouts?.length ? (
                  recent.recent.cashouts.map((c) => (
                    <div key={c.id} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>
                          <Link to={`/admin/finance/cashouts/${c.id}`}>{c.id.slice(0, 8)}…</Link>{" "}
                          <span style={{ opacity: 0.7 }}>{formatINR(c.amountPaise)}</span>
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.7 }}>
                          <Link to={`/admin/users/${c.userId}`}>{c.user?.email ?? c.userId}</Link> •{" "}
                          {new Date(c.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <StatusBadge status={c.status} />
                    </div>
                  ))
                ) : (
                  <div style={{ opacity: 0.7 }}>No recent cashouts.</div>
                )}
              </div>
            </div>

            {/* Recent Payment Intents */}
            <div style={{ border: "1px solid #e5e5e5", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
              <div style={{ padding: "10px 12px", fontWeight: 800, background: "#fafafa" }}>
                Recent Payment Intents
              </div>
              <div style={{ padding: 12, display: "grid", gap: 10 }}>
                {recent?.recent.paymentIntents?.length ? (
                  recent.recent.paymentIntents.map((p) => (
                    <div key={p.id} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>
                          <Link to={`/admin/finance/payment-intents/${p.id}`}>{p.id.slice(0, 8)}…</Link>{" "}
                          <span style={{ opacity: 0.7 }}>{formatINR(p.amountPaise)}</span>
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.7 }}>
                          <Link to={`/admin/users/${p.userId}`}>{p.user?.email ?? p.userId}</Link> •{" "}
                          {p.provider} • {new Date(p.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <StatusBadge status={p.status} />
                    </div>
                  ))
                ) : (
                  <div style={{ opacity: 0.7 }}>No payment intents.</div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Ledger */}
          <div style={{ marginTop: 12, border: "1px solid #e5e5e5", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
            <div style={{ padding: "10px 12px", fontWeight: 800, background: "#fafafa" }}>Recent Wallet Transactions</div>
            <div style={{ padding: 12, display: "grid", gap: 10 }}>
              {recent?.recent.ledger?.length ? (
                recent.recent.ledger.map((t) => (
                  <div key={t.id} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>
                        <Link to={`/admin/finance/ledger/${t.id}`}>{t.id.slice(0, 8)}…</Link>{" "}
                        <span style={{ opacity: 0.7, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                          {formatINR(t.amountPaise)}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>
                        <Link to={`/admin/users/${t.userId}`}>{t.user?.email ?? t.userId}</Link> •{" "}
                        <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{t.type}</span> •{" "}
                        {new Date(t.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <StatusBadge status={t.status} />
                  </div>
                ))
              ) : (
                <div style={{ opacity: 0.7 }}>No recent ledger rows.</div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
