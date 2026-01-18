// src/pages/dashboard/Dashboard.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDashboardMetrics, type DashboardMetrics } from "@/api/dashboard";
import { hasPerm } from "@/auth/permissions";

function formatINR(paise: number) {
  const rs = (paise || 0) / 100;
  return rs.toLocaleString("en-IN", { style: "currency", currency: "INR" });
}

function Card({ title, children }: { title: string; children: any }) {
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14, background: "#fff" }}>
      <div style={{ fontWeight: 700, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "6px 0" }}>
      <div style={{ color: "#555" }}>{label}</div>
      <div style={{ fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function StaffLanding() {
  const canKyc = hasPerm("KYC_REVIEW", "ADMIN");
  const canSupport = hasPerm("SUPPORT", "ADMIN");
  const canFinance = hasPerm("FINANCE", "ADMIN");

  return (
    <div style={{ maxWidth: 1100, margin: "30px auto", fontFamily: "system-ui" }}>
      <h2 style={{ margin: 0 }}>Dashboard</h2>
      <div style={{ color: "#666", marginTop: 6 }}>
        You’re signed in as a staff user. This dashboard is limited to what your permissions allow.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, marginTop: 14 }}>
        <Card title="Your access">
          <div style={{ display: "grid", gap: 8 }}>
            {canKyc ? <div>✅ KYC Review</div> : <div style={{ color: "#777" }}>— KYC Review</div>}
            {canSupport ? <div>✅ Support (Issues + Ratings)</div> : <div style={{ color: "#777" }}>— Support</div>}
            {canFinance ? <div>✅ Finance</div> : <div style={{ color: "#777" }}>— Finance</div>}
            {!canKyc && !canSupport && !canFinance ? (
              <div style={{ color: "crimson", marginTop: 8 }}>
                You have no staff permissions. Ask an admin to grant one of: ADMIN / KYC_REVIEW / SUPPORT / FINANCE.
              </div>
            ) : null}
          </div>
        </Card>

        <Card title="Quick links">
          <div style={{ display: "grid", gap: 10 }}>
            {canKyc ? <Link to="/admin/kyc">Go to KYC Submissions →</Link> : null}
            {canSupport ? <Link to="/admin/issues">Go to Issues →</Link> : null}
            {canSupport ? <Link to="/admin/ratings">Go to Ratings →</Link> : null}
            {canFinance ? <div style={{ color: "#777" }}>Finance screens: coming next</div> : null}
          </div>

          <div style={{ marginTop: 12, fontSize: 13, color: "#666" }}>
            Note: Full business metrics dashboard is visible only to ADMIN.
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const isAdmin = hasPerm("ADMIN");

  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const d = await getDashboardMetrics();
      setData(d);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // ✅ Non-admin staff see landing (no API call => no 403 noise)
  if (!isAdmin) return <StaffLanding />;

  return (
    <div style={{ maxWidth: 1100, margin: "30px auto", fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h2 style={{ margin: 0 }}>Dashboard</h2>
        <button onClick={load} disabled={loading} style={{ padding: "8px 12px" }}>
          Refresh
        </button>
      </div>

      <div style={{ color: "#666", marginTop: 6 }}>
        {data?.generatedAt ? `Generated: ${new Date(data.generatedAt).toLocaleString()}` : null}
      </div>

      {err ? <div style={{ color: "crimson", marginTop: 10 }}>{err}</div> : null}
      {loading && !data ? <div style={{ marginTop: 10 }}>Loading…</div> : null}

      {data ? (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 12,
              marginTop: 14,
            }}
          >
            <Card title="Users">
              <Row label="Total" value={data.users.total} />
              <Row label="Helpers" value={data.users.helpers} />
              <Row label="Consumers" value={data.users.consumers} />
              <Row label="New (7d)" value={data.users.new7d} />
            </Card>

            <Card title="KYC">
              <Row label="Pending" value={data.kyc.pending} />
              <Row label="Approved" value={data.kyc.approved} />
              <Row label="Rejected" value={data.kyc.rejected} />
              <Row label="New (7d)" value={data.kyc.new7d} />
            </Card>

            <Card title="Tasks">
              <Row label="Total" value={data.tasks.total} />
              <Row label="Open" value={data.tasks.open} />
              <Row label="In Progress" value={data.tasks.inProgress} />
              <Row label="Completed" value={data.tasks.completed} />
              <Row label="Cancelled/Expired" value={data.tasks.cancelled} />
              <Row label="New (7d)" value={data.tasks.new7d} />
            </Card>

            <Card title="Money">
              <Row label="Wallet Credits" value={formatINR(data.money.walletCreditsPaise)} />
              <Row label="Wallet Debits" value={formatINR(data.money.walletDebitsPaise)} />
              <div style={{ height: 8 }} />
              <Row label="Platform Fee Due" value={formatINR(data.money.platformFeeDuePaise)} />
              <Row label="Platform Fee Paid" value={formatINR(data.money.platformFeePaidPaise)} />
              <Row label="Outstanding" value={formatINR(data.money.platformFeeOutstandingPaise)} />
            </Card>
          </div>

          <div style={{ marginTop: 14, color: "#666", fontSize: 13 }}>
            Note: Metrics are read-only snapshots for admin visibility. Actions stay in KYC review + task moderation screens.
          </div>
        </>
      ) : null}
    </div>
  );
}
