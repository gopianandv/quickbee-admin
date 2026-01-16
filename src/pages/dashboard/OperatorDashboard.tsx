// src/pages/dashboard/OperatorDashboard.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getOperatorMetrics, type OperatorMetrics } from "@/api/operatorDashboard";
import { runRatingsWatchlistNow } from "@/api/adminJobs";


// ✅ add helper
function pretty(s?: string | null) {
  const v = String(s ?? "").trim();
  if (!v) return "-";
  return v
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ✅ add helper for deep links
function entityLink(entityType?: string | null, entityId?: string | null) {
  if (!entityType || !entityId) return null;
  const t = entityType.toUpperCase();

  if (t === "TASK") return `/admin/tasks/${entityId}`;
  if (t === "USER") return `/admin/users/${entityId}`;
  if (t === "KYC_SUBMISSION" || t === "KYCSUBMISSION") return `/admin/kyc/${entityId}`;

  return null;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
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

  const [watchRunning, setWatchRunning] = useState(false);
  const [watchMsg, setWatchMsg] = useState<string | null>(null);
  const [watchResult, setWatchResult] = useState<any | null>(null);

  async function runWatchlist() {
    setWatchRunning(true);
    setWatchMsg(null);
    setWatchResult(null);

    try {
      const res = await runRatingsWatchlistNow();
      setWatchResult(res);
      setWatchMsg(
        `✅ Watchlist ran. Candidates: ${res?.candidates ?? 0} · Created: ${res?.createdCount ?? 0} · Skipped: ${res?.skippedCount ?? 0}`
      );

      // refresh dashboard so admin sees new issues + new heartbeat if you record it
      await load();
    } catch (e: any) {
      setWatchMsg(e?.response?.data?.error || e?.message || "Failed to run watchlist");
    } finally {
      setWatchRunning(false);
    }
  }


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

          {data?.jobs?.failedCount ? (
            <div style={{ background: "#ffe6e6", border: "1px solid #ffb3b3", padding: 12, borderRadius: 10, marginBottom: 12 }}>
              <b>⚠ Action required:</b> {data.jobs.failedCount} background job(s) failed.
              <div style={{ marginTop: 6 }}>
                <Link to="/admin/jobs">View Job Monitor →</Link>
              </div>
            </div>
          ) : data?.jobs?.lateCount ? (
            <div style={{ background: "#fff7e6", border: "1px solid #ffe0a3", padding: 12, borderRadius: 10, marginBottom: 12 }}>
              <b>⏱ Some jobs are running late:</b> {data.jobs.lateCount} job(s) overdue.
              <div style={{ marginTop: 6 }}>
                <Link to="/admin/jobs">View Job Monitor →</Link>
              </div>
            </div>
          ) : null}

          {/* ✅ Jobs quick summary (always visible) */}
          {data?.jobs ? (
            <div style={{ marginBottom: 12, background: "#f7f7f7", border: "1px solid #e5e5e5", padding: 12, borderRadius: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <div style={{ fontWeight: 900 }}>Jobs Monitor</div>
                <Link to="/admin/jobs">Open →</Link>
              </div>

              <div style={{ marginTop: 8, display: "flex", gap: 18, flexWrap: "wrap", color: "#444" }}>
                <div><b>Tracked:</b> {data.jobs.items?.length ?? 0}</div>
                <div><b>Failed:</b> {data.jobs.failedCount}</div>
                <div><b>Late:</b> {data.jobs.lateCount}</div>
                <div><b>Not started:</b> {data.jobs.notStartedCount}</div>
              </div>
            </div>
          ) : null}

          {/* ✅ Manual job triggers */}
          <div style={{ marginBottom: 12 }}>
            <Card title="Admin Tools">
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  onClick={runWatchlist}
                  disabled={watchRunning || loading}
                  style={{ padding: "8px 12px" }}
                >
                  {watchRunning ? "Running…" : "Run Ratings Watchlist Now"}
                </button>

                <Link to="/admin/jobs">Job Monitor →</Link>
                <Link to="/admin/issues">Issues →</Link>
              </div>

              {watchMsg ? (
                <div style={{ marginTop: 10, color: watchMsg.startsWith("✅") ? "green" : "crimson" }}>
                  {watchMsg}
                </div>
              ) : null}

              {watchResult?.results?.length ? (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>Created / Checked (latest run)</div>
                  <div style={{ display: "grid", gap: 6 }}>
                    {watchResult.results.slice(0, 10).map((r: any, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          borderTop: "1px solid #f0f0f0",
                          paddingTop: 6,
                          fontSize: 13,
                          color: "#333",
                        }}
                      >
                        Helper: <b>{r.helperId}</b> · avg: <b>{r.avgRating?.toFixed?.(2) ?? r.avgRating}</b> · reviews:{" "}
                        <b>{r.reviewCount}</b>{" "}
                        {r.created ? <span style={{ color: "green" }}>· issue created</span> : null}
                        {!r.created && (r.skipped || r.reason === "existing_open_issue") ? (
                          <span style={{ color: "#666" }}>· skipped</span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </Card>
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

            <Card title="Ratings Safety">
              <MetricRow label="Helpers at risk" value={data.ratings?.atRiskHelpersCount ?? 0} />
              <div style={{ marginTop: 10 }}>
                <Link to="/admin/issues?category=RATINGS_WATCHLIST&status=OPEN">Open at-risk issues →</Link>
              </div>
              <div style={{ marginTop: 6 }}>
                <Link to="/admin/issues?category=RATINGS_WATCHLIST&status=IN_REVIEW">In review →</Link>
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

          {/* ✅ NEW CARD */}
          <div style={{ marginTop: 14 }}>
            <Card title="Recent Admin Actions (Latest 10)">
              {!data.recentAdminActions?.length ? (
                <div style={{ color: "#666" }}>No admin actions yet.</div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {data.recentAdminActions.map((a) => {
                    const link = entityLink(a.entityType, a.entityId ?? null);
                    const actorLabel = a.actor?.email || a.actor?.name || a.actorUserId || "-";

                    return (
                      <div
                        key={a.id}
                        style={{
                          borderTop: "1px solid #f0f0f0",
                          paddingTop: 8,
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 800 }}>{pretty(a.action)}</div>
                          <div style={{ fontSize: 12, color: "#666", wordBreak: "break-word" }}>
                            {a.entityType}
                            {a.entityId ? ` · ${a.entityId}` : ""}
                          </div>
                          <div style={{ fontSize: 12, color: "#666" }}>
                            {new Date(a.createdAt).toLocaleString()} · {actorLabel}
                          </div>
                        </div>

                        <div style={{ whiteSpace: "nowrap" }}>
                          {link ? <Link to={link}>Open</Link> : <span style={{ color: "#999" }}>—</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ marginTop: 10, fontSize: 12 }}>
                <Link to="/admin/audit-log">View full audit log →</Link>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
