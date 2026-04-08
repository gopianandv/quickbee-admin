import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users, ClipboardList, ShieldCheck, DollarSign,
  RefreshCw, CheckCircle, XCircle, Clock,
} from "lucide-react";
import { getDashboardMetrics, type DashboardMetrics } from "@/api/dashboard";
import { hasPerm } from "@/auth/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { CardWithTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageSpinner } from "@/components/ui/Spinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";

function formatINR(paise: number) {
  return ((paise || 0) / 100).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
}

function MetricRow({ label, value, muted }: { label: string; value: string | number; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm font-semibold ${muted ? "text-gray-400" : "text-gray-900"}`}>{value}</span>
    </div>
  );
}

/* ── Staff view (non-admin) ────────────────────────────────────── */
function StaffLanding() {
  const canKyc     = hasPerm("KYC_REVIEW", "ADMIN");
  const canSupport = hasPerm("SUPPORT",    "ADMIN");
  const canFinance = hasPerm("FINANCE",    "ADMIN");

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="You're signed in as a staff user — access is limited to your permissions."
      />
      <div className="grid grid-cols-2 gap-4 max-w-2xl">
        <CardWithTitle title="Your access">
          <div className="space-y-2 text-sm">
            {canKyc     ? <p className="flex gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />KYC Review</p>
                        : <p className="flex gap-2 text-gray-400"><XCircle className="h-4 w-4 mt-0.5" />KYC Review</p>}
            {canSupport ? <p className="flex gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />Support (Issues + Ratings)</p>
                        : <p className="flex gap-2 text-gray-400"><XCircle className="h-4 w-4 mt-0.5" />Support</p>}
            {canFinance ? <p className="flex gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />Finance</p>
                        : <p className="flex gap-2 text-gray-400"><XCircle className="h-4 w-4 mt-0.5" />Finance</p>}
            {!canKyc && !canSupport && !canFinance && (
              <p className="mt-2 text-red-500 text-xs">
                No staff permissions. Ask an admin to grant: ADMIN / KYC_REVIEW / SUPPORT / FINANCE.
              </p>
            )}
          </div>
        </CardWithTitle>

        <CardWithTitle title="Quick links">
          <div className="space-y-2">
            {canKyc     && <Link to="/admin/kyc"               className="block text-sm text-blue-600 hover:underline">KYC Submissions →</Link>}
            {canSupport && <Link to="/admin/issues"            className="block text-sm text-blue-600 hover:underline">Issues →</Link>}
            {canSupport && <Link to="/admin/ratings"           className="block text-sm text-blue-600 hover:underline">Ratings →</Link>}
            {canFinance && <Link to="/admin/finance/cashouts"  className="block text-sm text-blue-600 hover:underline">Cashouts →</Link>}
          </div>
        </CardWithTitle>
      </div>
    </div>
  );
}

/* ── Main dashboard ────────────────────────────────────────────── */
export default function DashboardPage() {
  const isAdmin = hasPerm("ADMIN");

  const [data, setData]       = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      setData(await getDashboardMetrics());
    } catch (e: unknown) {
      setErr(
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        (e as { message?: string })?.message ??
        "Failed to load dashboard"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (isAdmin) load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isAdmin) return <StaffLanding />;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={data?.generatedAt ? `Last updated ${new Date(data.generatedAt).toLocaleString()}` : "Business metrics overview"}
        actions={
          <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      <ErrorMessage message={err} className="mb-4" />
      {loading && !data && <PageSpinner />}

      {data && (
        <div className="space-y-4">
          {/* KPI row */}
          <div className="grid grid-cols-4 gap-4">
            <StatCard
              label="Total Users"
              value={data.users.total.toLocaleString()}
              icon={Users}
              accent="blue"
            />
            <StatCard
              label="Active Tasks"
              value={(data.tasks.open + data.tasks.inProgress).toLocaleString()}
              icon={ClipboardList}
              accent="purple"
            />
            <StatCard
              label="KYC Pending"
              value={data.kyc.pending.toLocaleString()}
              icon={ShieldCheck}
              accent="brand"
            />
            <StatCard
              label="Fee Outstanding"
              value={formatINR(data.money.platformFeeOutstandingPaise)}
              icon={DollarSign}
              accent="green"
            />
          </div>

          {/* Detail cards */}
          <div className="grid grid-cols-3 gap-4">
            <CardWithTitle title="Users">
              <MetricRow label="Total"    value={data.users.total} />
              <MetricRow label="Helpers"  value={data.users.helpers} />
              <MetricRow label="Consumers" value={data.users.consumers} />
              <MetricRow label="New (7 days)" value={data.users.new7d} />
            </CardWithTitle>

            <CardWithTitle title="Tasks">
              <MetricRow label="Total"    value={data.tasks.total} />
              <MetricRow label="Open"     value={data.tasks.open} />
              <MetricRow label="In Progress" value={data.tasks.inProgress} />
              <MetricRow label="Completed" value={data.tasks.completed} />
              <MetricRow label="Cancelled / Expired" value={data.tasks.cancelled} muted />
              <MetricRow label="New (7 days)" value={data.tasks.new7d} />
            </CardWithTitle>

            <CardWithTitle title="KYC">
              <MetricRow label="Pending"  value={data.kyc.pending} />
              <MetricRow label="Approved" value={data.kyc.approved} />
              <MetricRow label="Rejected" value={data.kyc.rejected} muted />
              <MetricRow label="New (7 days)" value={data.kyc.new7d} />
            </CardWithTitle>
          </div>

          {/* Finance card */}
          <CardWithTitle title="Finance">
            <div className="grid grid-cols-2 gap-x-12 gap-y-0">
              <div>
                <MetricRow label="Wallet Credits"  value={formatINR(data.money.walletCreditsPaise)} />
                <MetricRow label="Wallet Debits"   value={formatINR(data.money.walletDebitsPaise)} />
              </div>
              <div>
                <MetricRow label="Platform Fee Due"  value={formatINR(data.money.platformFeeDuePaise)} />
                <MetricRow label="Platform Fee Paid" value={formatINR(data.money.platformFeePaidPaise)} />
                <MetricRow label="Outstanding"       value={formatINR(data.money.platformFeeOutstandingPaise)} />
              </div>
            </div>
          </CardWithTitle>

          <p className="text-xs text-gray-400">
            <Clock className="inline h-3 w-3 mr-1 -mt-px" />
            Metrics are read-only snapshots. Actions live in KYC review and task moderation screens.
          </p>
        </div>
      )}
    </div>
  );
}
