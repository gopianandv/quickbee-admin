import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw, TrendingUp, DollarSign, Wallet, Receipt, ArrowUpRight } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  adminGetFinanceDashboardRecent,
  adminGetFinanceDashboardSummary,
} from "@/api/adminFinanceDashboard";
import type {
  FinanceDashboardRecent,
  FinanceDashboardSummary,
} from "@/api/adminFinanceDashboard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";

function formatINR(paise: number) {
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  return `${sign}₹${(abs / 100).toFixed(2)}`;
}

function getErrMsg(err: any) {
  const apiMsg = err?.response?.data?.error || err?.response?.data?.message;
  const status = err?.response?.status;
  if (status) return `HTTP ${status}: ${apiMsg ?? err.message ?? "Request failed"}`;
  return apiMsg ?? err?.message ?? "Request failed";
}

const selectCls =
  "rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30";

export default function FinanceDashboard() {
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<FinanceDashboardSummary | null>(null);
  const [recent, setRecent] = useState<FinanceDashboardRecent | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [s, r] = await Promise.all([
        adminGetFinanceDashboardSummary({ days }),
        adminGetFinanceDashboardRecent({ limit: 10 }),
      ]);
      setSummary(s);
      setRecent(r);
    } catch (e: any) {
      setError(getErrMsg(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const windowLabel = days === 1 ? "24h" : `${days}d`;

  return (
    <div>
      <PageHeader
        title="Finance Dashboard"
        subtitle="Operational overview for payouts, wallet ledger, platform fees, and payment intents."
        actions={
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">Window</label>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className={selectCls}
            >
              <option value={1}>Last 24h</option>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
            </select>
            <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Refreshing…" : "Refresh"}
            </Button>
          </div>
        }
      />

      {/* Error */}
      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="font-bold text-red-700">Dashboard failed to load</p>
          <p className="mt-1 font-mono text-xs text-red-600">{error}</p>
          <p className="mt-2 text-xs text-red-500">
            Check Network tab for <b>/admin/finance/dashboard</b> and <b>/admin/finance/dashboard/recent</b>.
          </p>
        </div>
      )}

      {/* Loading skeleton */}
      {!summary && loading && (
        <div className="flex items-center gap-2 text-sm text-gray-500 py-6">
          <RefreshCw className="h-4 w-4 animate-spin" /> Loading…
        </div>
      )}

      {!summary && !loading && !error && (
        <p className="py-6 text-sm text-gray-400">No data yet. Click <b>Refresh</b>.</p>
      )}

      {summary && (
        <div className="flex flex-col gap-4">
          {/* KPI tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm text-center">
              <p className="text-xs text-gray-500 mb-1">Cashouts ({windowLabel})</p>
              <p className="text-2xl font-bold text-gray-800">{summary.cashouts.total}</p>
              <p className="mt-1 text-[10px] text-gray-400">
                REQ {summary.cashouts.requested} · PROC {summary.cashouts.processing} · PAID {summary.cashouts.paid} · FAIL {summary.cashouts.failed}
              </p>
            </div>
            <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-4 shadow-sm text-center">
              <p className="text-xs text-green-600 mb-1">Paid Out ({windowLabel})</p>
              <p className="text-2xl font-bold text-green-700">{formatINR(summary.cashoutsPaidAmountPaise)}</p>
            </div>
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-4 shadow-sm text-center">
              <p className="text-xs text-blue-600 mb-1">Wallet Volume ({windowLabel})</p>
              <p className="text-2xl font-bold text-blue-700">{formatINR(summary.walletVolumeAbsPaise)}</p>
              <p className="mt-1 text-[10px] text-blue-400">abs posted txns</p>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-4 shadow-sm text-center">
              <p className="text-xs text-amber-600 mb-1">Platform Fee Due ({windowLabel})</p>
              <p className="text-2xl font-bold text-amber-700">
                {formatINR(summary.platformFees.outstandingPaise ?? Math.max((summary.platformFees.duePaise - summary.platformFees.paymentPaise), 0))}
              </p>
              <p className="mt-1 text-[10px] text-amber-500">
                Due {formatINR(summary.platformFees.duePaise)} · Paid {formatINR(summary.platformFees.paymentPaise)}
              </p>
            </div>
            <div className="rounded-xl border border-purple-100 bg-purple-50 px-4 py-4 shadow-sm text-center">
              <p className="text-xs text-purple-600 mb-1">Payment Intents ({windowLabel})</p>
              <p className="text-2xl font-bold text-purple-700">{summary.paymentIntents.total}</p>
              <p className="mt-1 text-[10px] text-purple-400">
                PEND {summary.paymentIntents.pending} · SUCC {summary.paymentIntents.succeeded} · FAIL {summary.paymentIntents.failed}
              </p>
            </div>
          </div>

          {/* Quick nav */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Cashouts", to: "/admin/finance/cashouts", icon: DollarSign },
              { label: "Wallet Ledger", to: "/admin/finance/ledger", icon: Wallet },
              { label: "Platform Fees", to: "/admin/finance/platform-fees", icon: Receipt },
              { label: "Payment Intents", to: "/admin/finance/payment-intents", icon: TrendingUp },
            ].map(({ label, to, icon: Icon }) => (
              <Link key={to} to={to}>
                <Button variant="secondary" size="sm">
                  <Icon className="h-3.5 w-3.5" /> {label} <ArrowUpRight className="h-3 w-3 opacity-50" />
                </Button>
              </Link>
            ))}
          </div>

          {/* Recent cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Recent Cashouts */}
            <Card>
              <CardHeader>
                <DollarSign className="h-4 w-4 text-gray-400" /> Recent Cashouts
              </CardHeader>
              <CardContent>
                {recent?.recent.cashouts?.length ? (
                  <div className="space-y-3">
                    {recent.recent.cashouts.map((c) => (
                      <div key={c.id} className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-sm font-semibold">
                            <Link to={`/admin/finance/cashouts/${c.id}`} className="text-blue-600 hover:underline">
                              {c.id.slice(0, 8)}…
                            </Link>
                            <span className="text-gray-500 font-normal">{formatINR(c.amountPaise)}</span>
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            <Link to={`/admin/users/${c.userId}`} className="hover:underline text-blue-500">
                              {c.user?.email ?? c.userId}
                            </Link>
                            {" · "}{new Date(c.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <StatusBadge status={c.status} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No recent cashouts.</p>
                )}
              </CardContent>
            </Card>

            {/* Recent Payment Intents */}
            <Card>
              <CardHeader>
                <TrendingUp className="h-4 w-4 text-gray-400" /> Recent Payment Intents
              </CardHeader>
              <CardContent>
                {recent?.recent.paymentIntents?.length ? (
                  <div className="space-y-3">
                    {recent.recent.paymentIntents.map((p) => (
                      <div key={p.id} className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-sm font-semibold">
                            <Link to={`/admin/finance/payment-intents/${p.id}`} className="text-blue-600 hover:underline">
                              {p.id.slice(0, 8)}…
                            </Link>
                            <span className="text-gray-500 font-normal">{formatINR(p.amountPaise)}</span>
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            <Link to={`/admin/users/${p.userId}`} className="hover:underline text-blue-500">
                              {p.user?.email ?? p.userId}
                            </Link>
                            {" · "}{p.provider}{" · "}{new Date(p.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <StatusBadge status={p.status} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No payment intents.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Wallet Transactions */}
          <Card>
            <CardHeader>
              <Wallet className="h-4 w-4 text-gray-400" /> Recent Wallet Transactions
            </CardHeader>
            <CardContent>
              {recent?.recent.ledger?.length ? (
                <div className="space-y-3">
                  {recent.recent.ledger.map((t) => (
                    <div key={t.id} className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <Link to={`/admin/finance/ledger/${t.id}`} className="text-blue-600 hover:underline">
                            {t.id.slice(0, 8)}…
                          </Link>
                          <span className="font-mono text-gray-500 font-normal">{formatINR(t.amountPaise)}</span>
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          <Link to={`/admin/users/${t.userId}`} className="hover:underline text-blue-500">
                            {t.user?.email ?? t.userId}
                          </Link>
                          {" · "}<span className="font-mono">{t.type}</span>
                          {" · "}{new Date(t.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <StatusBadge status={t.status} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No recent ledger rows.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
