// src/pages/dashboard/OperatorDashboard.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getOperatorMetrics, type OperatorMetrics } from "@/api/operatorDashboard";

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14, background: "white" }}>
      <div style={{ fontWeight: 900, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: "1px solid #f0f0f0" }}>
      <div style={{ color: "#555" }}>{label}</div>
      <div style={{ fontWeight: 800 }}>{value}</div>
    </div>
  );
}

export default function OperatorDashboardPage() {
  const [data, setData] = useState<OperatorMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const d = await getOperatorMetrics();
      setData(d);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Failed to load operator dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ maxWidth: 1100, margin: "30px auto", fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Operator Dashboard</h2>
        <button onClick={load} disabled={loading} style={{ padding: "8px 12px" }}>
          Refresh
        </button>
      </div>

      {err && <div style={{ color: "crimson", marginBottom: 12 }}>{err}</div>}
      {loading && !data ? <div>Loading…</div> : null}
      {!data ? null : (
        <>
          <div style={{ color: "#666", marginBottom: 16 }}>
            Generated: {new Date(data.generatedAt).toLocaleString()}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Card title="KYC">
              <MetricRow label="Pending" value={data.kyc.pending} />
              <MetricRow label="New (24h)" value={data.kyc.new24h} />
              <div style={{ marginTop: 10 }}>
                <Link to="/admin/kyc">Go to KYC list →</Link>
              </div>
            </Card>

            <Card title="Escrow">
              <MetricRow label="HOLD escrows" value={data.escrow.holdCount} />
              <div style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
                (Manual refunds only if needed)
              </div>
            </Card>

            <Card title="Tasks Snapshot">
              <MetricRow label="New" value={data.tasks.new} />
              <MetricRow label="Accepted" value={data.tasks.accepted} />
              <MetricRow label="In Progress" value={data.tasks.inProgress} />
              <MetricRow label="Pending Confirm" value={data.tasks.pendingConfirm} />
              <MetricRow label="New (24h)" value={data.tasks.new24h} />
              <div style={{ marginTop: 10 }}>
                <Link to="/admin/tasks">Go to Tasks list →</Link>
              </div>
            </Card>

            <Card title="Attention Needed">
              <MetricRow label="Pending Confirm stale (2+ days)" value={data.attention.pendingConfirmStaleCount} />
              <MetricRow label="In Progress stale (7+ days)" value={data.attention.inProgressStaleCount} />

              {data.attention.stalePendingConfirmList?.length ? (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>Stale Pending Confirm (Top 10)</div>
                  {data.attention.stalePendingConfirmList.map((t) => (
                    <div key={t.id} style={{ padding: "6px 0", borderTop: "1px solid #f0f0f0" }}>
                      <Link to={`/admin/tasks/${t.id}`}>{t.title}</Link>
                      <div style={{ fontSize: 12, color: "#666" }}>
                        Updated: {new Date(t.updatedAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {data.attention.staleInProgressList?.length ? (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>Stale In Progress (Top 10)</div>
                  {data.attention.staleInProgressList.map((t) => (
                    <div key={t.id} style={{ padding: "6px 0", borderTop: "1px solid #f0f0f0" }}>
                      <Link to={`/admin/tasks/${t.id}`}>{t.title}</Link>
                      <div style={{ fontSize: 12, color: "#666" }}>
                        Updated: {new Date(t.updatedAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </Card>
          </div>

          <div style={{ marginTop: 14 }}>
            <Card title="Activity (24h)">
              <MetricRow label="New users" value={data.activity.newUsers24h} />
              <MetricRow label="New offers" value={data.activity.newOffers24h} />
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
