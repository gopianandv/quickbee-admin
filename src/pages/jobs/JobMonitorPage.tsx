// src/pages/jobs/JobMonitorPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { RefreshCw, AlertTriangle, CheckCircle, Loader2, Activity } from "lucide-react";
import { listAdminJobs, type AdminJobHeartbeat } from "@/api/adminJobs";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import {
  TableRoot, Table, TableHead, TableBody,
  TableRow, Th, Td, TableEmpty, TableSkeleton,
} from "@/components/ui/Table";

function StatusPill({ status }: { status: string }) {
  const s = (status || "").toUpperCase();
  if (s === "SUCCESS") return <Badge variant="success"><CheckCircle className="h-3 w-3 inline mr-0.5" />SUCCESS</Badge>;
  if (s === "FAILED")  return <Badge variant="danger"><AlertTriangle className="h-3 w-3 inline mr-0.5" />FAILED</Badge>;
  if (s === "RUNNING") return <Badge variant="warning"><Loader2 className="h-3 w-3 inline mr-0.5 animate-spin" />RUNNING</Badge>;
  return <Badge variant="default">{s || "—"}</Badge>;
}

function fmtMs(ms?: number | null) {
  if (!ms && ms !== 0) return "—";
  if (ms < 1000) return `${ms} ms`;
  const sec = ms / 1000;
  if (sec < 60) return `${sec.toFixed(1)} s`;
  const min = sec / 60;
  return `${min.toFixed(1)} min`;
}

function getReason(j: AdminJobHeartbeat) {
  const meta: any = (j as any).meta;
  return meta?.reason || meta?.error || null;
}

function reasonLabel(j: AdminJobHeartbeat) {
  const s = String(j.status || "").toUpperCase();
  const r = getReason(j);
  if (r) return String(r);
  if (s === "FAILED") return j.error || "Failed (no reason provided)";
  return "—";
}

function prettyReason(r?: string | null) {
  const v = String(r ?? "").trim();
  if (!v) return null;
  if (v === "missing_system_admin_user_id") return "Missing SYSTEM_ADMIN_USER_ID (env misconfig)";
  return v;
}

export default function JobMonitorPage() {
  const [items,   setItems]   = useState<AdminJobHeartbeat[]>([]);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState<string | null>(null);

  async function load() {
    setLoading(true); setErr(null);
    try {
      const data = await listAdminJobs();
      setItems(data);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const sorted = useMemo(() => {
    const rank = (s: string) => {
      const v = (s || "").toUpperCase();
      if (v === "FAILED")  return 0;
      if (v === "RUNNING") return 1;
      if (v === "SUCCESS") return 2;
      return 3;
    };
    return [...items].sort((a, b) => {
      const ra = rank(a.status);
      const rb = rank(b.status);
      if (ra !== rb) return ra - rb;
      return a.jobName.localeCompare(b.jobName);
    });
  }, [items]);

  const failedCount  = sorted.filter((j) => j.status?.toUpperCase() === "FAILED").length;
  const runningCount = sorted.filter((j) => j.status?.toUpperCase() === "RUNNING").length;

  return (
    <div>
      <PageHeader
        title="Job Monitor"
        subtitle={
          <span>
            Background job health via <code className="font-mono text-xs bg-gray-100 rounded px-1 py-0.5">AdminJobHeartbeat</code>
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            {failedCount > 0 && (
              <Badge variant="danger" className="text-sm px-3 py-1">
                <AlertTriangle className="h-3.5 w-3.5 inline mr-1" />{failedCount} failed
              </Badge>
            )}
            {runningCount > 0 && (
              <Badge variant="warning" className="text-sm px-3 py-1">
                <Activity className="h-3.5 w-3.5 inline mr-1" />{runningCount} running
              </Badge>
            )}
            <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Refreshing…" : "Refresh"}
            </Button>
          </div>
        }
      />

      <ErrorMessage message={err} className="mb-4" />

      <TableRoot>
        <Table>
          <TableHead>
            <tr>
              <Th>Job</Th>
              <Th>Status</Th>
              <Th>Last Run</Th>
              <Th>Duration</Th>
              <Th>Reason / Error</Th>
              <Th>Meta</Th>
            </tr>
          </TableHead>
          <TableBody>
            {loading && items.length === 0
              ? <TableSkeleton colSpan={6} />
              : sorted.length === 0
              ? <TableEmpty colSpan={6} message="No jobs tracked yet. Once a job posts a heartbeat, it will appear here." />
              : sorted.map((j) => {
                  const status     = String(j.status || "").toUpperCase();
                  const rawReason  = reasonLabel(j);
                  const niceReason = prettyReason(rawReason);
                  const showBanner = status === "FAILED" && Boolean(niceReason || j.error);

                  return (
                    <React.Fragment key={j.jobName}>
                      <TableRow>
                        <Td className="font-bold text-gray-800">{j.jobName}</Td>
                        <Td><StatusPill status={j.status} /></Td>
                        <Td className="text-xs text-gray-500 whitespace-nowrap">
                          {j.lastRunAt ? new Date(j.lastRunAt).toLocaleString() : "—"}
                        </Td>
                        <Td className="text-sm font-mono text-gray-700">{fmtMs(j.durationMs)}</Td>
                        <Td>
                          <span className={`text-sm ${status === "FAILED" ? "text-red-600 font-semibold" : "text-gray-500"}`}>
                            {niceReason || rawReason || "—"}
                          </span>
                          {j.error && j.error !== rawReason && (
                            <div className="text-xs text-red-500 mt-0.5 font-mono">{j.error}</div>
                          )}
                        </Td>
                        <Td>
                          {j.meta ? (
                            <details className="text-sm">
                              <summary className="cursor-pointer text-blue-600 hover:underline">View</summary>
                              <pre className="mt-2 rounded-lg bg-gray-50 border border-gray-200 p-2 text-xs overflow-x-auto">
                                {JSON.stringify(j.meta, null, 2)}
                              </pre>
                            </details>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </Td>
                      </TableRow>

                      {showBanner && (
                        <tr>
                          <td colSpan={6} className="px-4 pb-3">
                            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold">{j.jobName} failed: </span>
                                {niceReason || j.error || "Unknown failure"}
                                {rawReason && rawReason !== niceReason && (
                                  <span className="text-red-500 ml-1">({rawReason})</span>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
            }
          </TableBody>
        </Table>
      </TableRoot>

      <p className="mt-3 text-xs text-gray-400">
        Tip: "FAILED" jobs should have an <code className="font-mono bg-gray-100 rounded px-1">error</code> string populated from your heartbeat writer. Sorted: Failed → Running → Success.
      </p>
    </div>
  );
}
