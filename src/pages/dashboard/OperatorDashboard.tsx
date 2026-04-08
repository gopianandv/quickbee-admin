// src/pages/dashboard/OperatorDashboard.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  RefreshCw, AlertTriangle, CheckCircle, Clock, Activity,
  ShieldCheck, Layers, Play, ExternalLink, ScrollText,
} from "lucide-react";
import { getOperatorMetrics, type OperatorMetrics } from "@/api/operatorDashboard";
import {
  runRatingsWatchlistNow,
  runTaskConfirmReminderNow,
  runReviewReminderPosterNow,
} from "@/api/adminJobs";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { ErrorMessage } from "@/components/ui/ErrorMessage";

/* ── helpers ─────────────────────────────────────────────────────── */
function pretty(s?: string | null) {
  const v = String(s ?? "").trim();
  if (!v) return "—";
  return v.toLowerCase().split("_").filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function entityLink(entityType?: string | null, entityId?: string | null) {
  if (!entityType || !entityId) return null;
  const t = entityType.toUpperCase();
  if (t === "TASK") return `/admin/tasks/${entityId}`;
  if (t === "USER") return `/admin/users/${entityId}`;
  if (t === "KYC_SUBMISSION" || t === "KYCSUBMISSION") return `/admin/kyc/${entityId}`;
  return null;
}

function MetricRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex justify-between items-center py-2 border-t border-gray-100 first:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="font-bold text-gray-900">{value}</span>
    </div>
  );
}

function JobResult({ msg }: { msg: string | null }) {
  if (!msg) return null;
  const ok = msg.startsWith("✅");
  return (
    <div className={`mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-sm font-medium ${ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
      {ok ? <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />}
      <span>{msg}</span>
    </div>
  );
}

/* ── main component ──────────────────────────────────────────────── */
export default function OperatorDashboardPage() {
  const [data,    setData]    = useState<OperatorMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState<string | null>(null);

  const [watchRunning,     setWatchRunning]     = useState(false);
  const [watchMsg,         setWatchMsg]         = useState<string | null>(null);
  const [watchResult,      setWatchResult]      = useState<any | null>(null);
  const [remRunning,       setRemRunning]       = useState(false);
  const [remMsg,           setRemMsg]           = useState<string | null>(null);
  const [reviewRemRunning, setReviewRemRunning] = useState(false);
  const [reviewRemMsg,     setReviewRemMsg]     = useState<string | null>(null);

  async function load() {
    setLoading(true); setErr(null);
    try {
      const d = await getOperatorMetrics();
      setData(d);
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? (e as { message?: string })?.message ?? "Failed to load operator dashboard");
    } finally { setLoading(false); }
  }

  async function runWatchlist() {
    setWatchRunning(true); setWatchMsg(null); setWatchResult(null);
    try {
      const res = await runRatingsWatchlistNow();
      setWatchResult(res);
      setWatchMsg(`✅ Watchlist ran. Candidates: ${res?.candidates ?? 0} · Created: ${res?.createdCount ?? 0} · Skipped: ${res?.skippedCount ?? 0}`);
      await load();
    } catch (e: unknown) {
      setWatchMsg((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? (e as { message?: string })?.message ?? "Failed to run watchlist");
    } finally { setWatchRunning(false); }
  }

  async function runConfirmReminder() {
    setRemRunning(true); setRemMsg(null);
    try {
      const res = await runTaskConfirmReminderNow();
      setRemMsg(`✅ Reminder job ran. Scanned: ${res?.scanned ?? 0} · Notified: ${res?.notified ?? 0} · Skipped (cooldown): ${res?.skippedCooldown ?? 0}`);
      await load();
    } catch (e: unknown) {
      setRemMsg((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? (e as { message?: string })?.message ?? "Failed to run reminder job");
    } finally { setRemRunning(false); }
  }

  async function runReviewReminderPoster() {
    setReviewRemRunning(true); setReviewRemMsg(null);
    try {
      const res = await runReviewReminderPosterNow();
      setReviewRemMsg(`✅ Review reminder ran. Scanned: ${res?.scanned ?? 0} · Notified: ${res?.notified ?? 0} · Skipped (already reviewed): ${res?.skippedAlreadyReviewed ?? 0}`);
      await load();
    } catch (e: unknown) {
      setReviewRemMsg((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? (e as { message?: string })?.message ?? "Failed to run review reminder");
    } finally { setReviewRemRunning(false); }
  }

  useEffect(() => { load(); }, []);

  const anyJobRunning = watchRunning || remRunning || reviewRemRunning;

  return (
    <div>
      <PageHeader
        title="Operator Dashboard"
        subtitle="Platform health, background jobs, and quick actions."
        actions={
          <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        }
      />

      {data && (
        <p className="text-xs text-gray-400 mb-4">
          Generated: {new Date(data.generatedAt).toLocaleString()}
        </p>
      )}

      <ErrorMessage message={err} className="mb-4" />

      {/* Jobs alert banner */}
      {data?.jobs?.failedCount ? (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-red-700">⚠ Action required: {data.jobs.failedCount} background job(s) failed.</p>
            <Link to="/admin/jobs" className="mt-1 inline-flex items-center gap-1 text-sm text-red-600 hover:underline font-medium">
              View Job Monitor <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      ) : data?.jobs?.lateCount ? (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <Clock className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-amber-700">⏱ {data.jobs.lateCount} job(s) are running late.</p>
            <Link to="/admin/jobs" className="mt-1 inline-flex items-center gap-1 text-sm text-amber-600 hover:underline font-medium">
              View Job Monitor <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      ) : null}

      {/* Jobs quick summary */}
      {data?.jobs && (
        <Card className="mb-4">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <div className="flex items-center gap-2 font-semibold text-gray-800">
              <Activity className="h-4 w-4 text-gray-400" /> Jobs Monitor
            </div>
            <Link to="/admin/jobs">
              <Button variant="ghost" size="sm">Open →</Button>
            </Link>
          </div>
          <div className="flex gap-6 px-4 pb-4 flex-wrap">
            <div className="text-sm"><span className="text-gray-500">Tracked:</span> <span className="font-bold text-gray-800">{data.jobs.items?.length ?? 0}</span></div>
            <div className="text-sm"><span className="text-gray-500">Failed:</span> <span className={`font-bold ${data.jobs.failedCount > 0 ? "text-red-600" : "text-gray-800"}`}>{data.jobs.failedCount}</span></div>
            <div className="text-sm"><span className="text-gray-500">Late:</span> <span className={`font-bold ${data.jobs.lateCount > 0 ? "text-amber-600" : "text-gray-800"}`}>{data.jobs.lateCount}</span></div>
            <div className="text-sm"><span className="text-gray-500">Not started:</span> <span className="font-bold text-gray-800">{data.jobs.notStartedCount}</span></div>
          </div>
        </Card>
      )}

      {/* Admin Tools — job triggers */}
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Play className="h-4 w-4 text-brand" /> Admin Tools
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="md" onClick={runWatchlist} disabled={watchRunning || anyJobRunning || loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${watchRunning ? "animate-spin" : ""}`} />
              {watchRunning ? "Running…" : "Run Ratings Watchlist Now"}
            </Button>
            <Button variant="secondary" size="md" onClick={runConfirmReminder} disabled={remRunning || anyJobRunning || loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${remRunning ? "animate-spin" : ""}`} />
              {remRunning ? "Running…" : "Run Pending Confirm Reminder"}
            </Button>
            <Button variant="secondary" size="md" onClick={runReviewReminderPoster} disabled={reviewRemRunning || anyJobRunning || loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${reviewRemRunning ? "animate-spin" : ""}`} />
              {reviewRemRunning ? "Running…" : "Run Review Reminder (Poster)"}
            </Button>
            <Link to="/admin/jobs"><Button variant="ghost" size="md">Job Monitor →</Button></Link>
            <Link to="/admin/issues"><Button variant="ghost" size="md">Issues →</Button></Link>
          </div>

          <JobResult msg={watchMsg} />
          <JobResult msg={remMsg} />
          <JobResult msg={reviewRemMsg} />

          {watchResult?.results?.length > 0 && (
            <div className="mt-2 rounded-lg border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Created / Checked (latest run)
              </div>
              <div className="divide-y divide-gray-100">
                {watchResult.results.slice(0, 10).map((r: any, idx: number) => (
                  <div key={idx} className="px-3 py-2 text-sm text-gray-700">
                    Helper: <span className="font-semibold">{r.helperId}</span>
                    {" · "}avg: <span className="font-semibold">{r.avgRating?.toFixed?.(2) ?? r.avgRating}</span>
                    {" · "}reviews: <span className="font-semibold">{r.reviewCount}</span>
                    {r.created && <Badge variant="success" className="ml-2 text-[10px]">created</Badge>}
                    {!r.created && (r.skipped || r.reason === "existing_open_issue") && <Badge variant="default" className="ml-2 text-[10px]">skipped</Badge>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {data && (
        <>
          {/* 2-col grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* KYC */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-blue-500" /> KYC
                </div>
              </CardHeader>
              <CardContent>
                <MetricRow label="Pending" value={data.kyc.pending} />
                <MetricRow label="New (24h)" value={data.kyc.new24h} />
                <div className="mt-3">
                  <Link to="/admin/kyc"><Button variant="ghost" size="sm">Go to KYC list →</Button></Link>
                </div>
              </CardContent>
            </Card>

            {/* Escrow */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-purple-500" /> Escrow
                </div>
              </CardHeader>
              <CardContent>
                <MetricRow label="HOLD escrows" value={data.escrow.holdCount} />
                <p className="mt-2 text-xs text-gray-400">(Manual refunds only if needed)</p>
              </CardContent>
            </Card>

            {/* Ratings Safety */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" /> Ratings Safety
                </div>
              </CardHeader>
              <CardContent>
                <MetricRow label="Helpers at risk" value={data.ratings?.atRiskHelpersCount ?? 0} />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link to="/admin/issues?status=OPEN&category=RATINGS_SAFETY&reason=LOW_RATING_WATCHLIST">
                    <Button variant="ghost" size="sm">Open at-risk →</Button>
                  </Link>
                  <Link to="/admin/issues?status=IN_REVIEW&category=RATINGS_SAFETY&reason=LOW_RATING_WATCHLIST">
                    <Button variant="ghost" size="sm">In review →</Button>
                  </Link>
                  <Link to="/admin/issues?category=RATINGS_SAFETY&reason=LOW_RATING_WATCHLIST">
                    <Button variant="ghost" size="sm">All watchlist →</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Tasks Snapshot */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-green-500" /> Tasks Snapshot
                </div>
              </CardHeader>
              <CardContent>
                <MetricRow label="New" value={data.tasks.new} />
                <MetricRow label="Accepted" value={data.tasks.accepted} />
                <MetricRow label="In Progress" value={data.tasks.inProgress} />
                <MetricRow label="Pending Confirm" value={data.tasks.pendingConfirm} />
                <MetricRow label="New (24h)" value={data.tasks.new24h} />
                <div className="mt-3">
                  <Link to="/admin/tasks"><Button variant="ghost" size="sm">Go to Tasks list →</Button></Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Attention needed — full width */}
          <Card className="mb-4">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" /> Attention Needed
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-amber-50 border border-amber-100 px-4 py-3">
                  <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Pending Confirm stale (2+ days)</p>
                  <p className="text-2xl font-bold text-amber-700 mt-1">{data.attention.pendingConfirmStaleCount}</p>
                </div>
                <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3">
                  <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">In Progress stale (7+ days)</p>
                  <p className="text-2xl font-bold text-red-700 mt-1">{data.attention.inProgressStaleCount}</p>
                </div>
              </div>

              {(data.attention.stalePendingConfirmList?.length > 0 || data.attention.staleInProgressList?.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.attention.stalePendingConfirmList?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Stale Pending Confirm (Top 10)</p>
                      <div className="divide-y divide-gray-100 rounded-lg border border-gray-100 overflow-hidden">
                        {data.attention.stalePendingConfirmList.map((t) => (
                          <div key={t.id} className="px-3 py-2">
                            <Link to={`/admin/tasks/${t.id}`} className="text-sm font-semibold text-blue-600 hover:underline truncate block">{t.title}</Link>
                            <p className="text-xs text-gray-400 mt-0.5">Updated: {new Date(t.updatedAt).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {data.attention.staleInProgressList?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Stale In Progress (Top 10)</p>
                      <div className="divide-y divide-gray-100 rounded-lg border border-gray-100 overflow-hidden">
                        {data.attention.staleInProgressList.map((t) => (
                          <div key={t.id} className="px-3 py-2">
                            <Link to={`/admin/tasks/${t.id}`} className="text-sm font-semibold text-blue-600 hover:underline truncate block">{t.title}</Link>
                            <p className="text-xs text-gray-400 mt-0.5">Updated: {new Date(t.updatedAt).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity 24h */}
          <Card className="mb-4">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-indigo-500" /> Activity (24h)
              </div>
            </CardHeader>
            <CardContent>
              <MetricRow label="New users" value={data.activity.newUsers24h} />
              <MetricRow label="New offers" value={data.activity.newOffers24h} />
            </CardContent>
          </Card>

          {/* Recent Admin Actions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ScrollText className="h-4 w-4 text-gray-400" /> Recent Admin Actions (Latest 10)
                </div>
                <Link to="/admin/audit"><Button variant="ghost" size="sm">View full audit log →</Button></Link>
              </div>
            </CardHeader>
            <CardContent>
              {!data.recentAdminActions?.length ? (
                <p className="text-sm text-gray-400">No admin actions yet.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {data.recentAdminActions.map((a) => {
                    const link = entityLink(a.entityType, a.entityId ?? null);
                    const actorLabel = a.actor?.email || a.actor?.name || a.actorUserId || "—";
                    return (
                      <div key={a.id} className="flex justify-between gap-4 py-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 text-sm">{pretty(a.action)}</p>
                          <p className="text-xs text-gray-500 mt-0.5 truncate">
                            {a.entityType}{a.entityId ? ` · ${a.entityId}` : ""}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(a.createdAt).toLocaleString()} · {actorLabel}
                          </p>
                        </div>
                        <div className="shrink-0">
                          {link
                            ? <Link to={link}><Button variant="ghost" size="sm">Open →</Button></Link>
                            : <span className="text-gray-400">—</span>
                          }
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
