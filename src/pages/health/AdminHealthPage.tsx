import { useEffect, useState } from "react";
import { RefreshCw, Database, Cloud, Info, CheckCircle, XCircle, Minus } from "lucide-react";
import { getAdminHealth, type AdminHealthResponse } from "@/api/adminHealth";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";

function StatusPill({ ok }: { ok: boolean | null }) {
  if (ok === true)  return <Badge variant="success"><CheckCircle className="h-3 w-3 inline mr-0.5" />OK</Badge>;
  if (ok === false) return <Badge variant="danger"><XCircle className="h-3 w-3 inline mr-0.5" />Error</Badge>;
  return <Badge variant="default"><Minus className="h-3 w-3 inline mr-0.5" />N/A</Badge>;
}

export default function AdminHealthPage() {
  const [data,    setData]    = useState<AdminHealthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState<string | null>(null);

  async function load() {
    setLoading(true); setErr(null);
    try {
      const d = await getAdminHealth();
      setData(d);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Failed to load health");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div>
      <PageHeader
        title="System Health"
        subtitle="Live connectivity checks for database, storage, and build metadata."
        actions={
          <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Checking…" : "Refresh"}
          </Button>
        }
      />

      {data?.time && (
        <p className="mb-4 text-xs text-gray-400">
          Generated: {new Date(data.time).toLocaleString()}
        </p>
      )}

      {err && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>
      )}

      {!data && loading && (
        <div className="flex items-center gap-2 py-6 text-gray-500 text-sm">
          <RefreshCw className="h-4 w-4 animate-spin" /> Checking health…
        </div>
      )}

      {data && (
        <div className="space-y-4">
          {/* Overall status */}
          <div className={`rounded-xl border px-5 py-4 flex items-center gap-3 ${data.ok ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
            {data.ok
              ? <CheckCircle className="h-6 w-6 text-green-600 shrink-0" />
              : <XCircle className="h-6 w-6 text-red-600 shrink-0" />
            }
            <div>
              <p className={`font-bold text-lg ${data.ok ? "text-green-700" : "text-red-700"}`}>
                {data.ok ? "All systems operational" : "System degraded"}
              </p>
              {data.service && (
                <p className="text-xs text-gray-500 mt-0.5">{data.service}</p>
              )}
            </div>
            <div className="ml-auto">
              <Badge variant={data.ok ? "success" : "danger"} className="text-sm px-3 py-1">
                {data.ok ? "OK" : "DEGRADED"}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Database */}
            <Card>
              <CardHeader>
                <Database className="h-4 w-4 text-gray-400" /> Database
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-3 text-sm">
                  <dt className="text-gray-500">Status</dt>
                  <dd><StatusPill ok={data.checks.db.ok} /></dd>

                  <dt className="text-gray-500">Latency</dt>
                  <dd className="font-mono font-bold text-gray-800">{data.checks.db.ms} ms</dd>

                  {data.checks.db.error && (
                    <>
                      <dt className="text-gray-500">Error</dt>
                      <dd className="text-red-600 text-xs font-mono">{data.checks.db.error}</dd>
                    </>
                  )}
                </dl>
              </CardContent>
            </Card>

            {/* S3 */}
            <Card>
              <CardHeader>
                <Cloud className="h-4 w-4 text-gray-400" /> Storage (S3)
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-3 text-sm">
                  <dt className="text-gray-500">Configured</dt>
                  <dd>
                    <Badge variant={data.checks.s3.configured ? "success" : "default"}>
                      {data.checks.s3.configured ? "Yes" : "Not configured"}
                    </Badge>
                  </dd>

                  {data.checks.s3.configured && (
                    <>
                      <dt className="text-gray-500">Status</dt>
                      <dd>
                        <StatusPill ok={data.checks.s3.ok ?? null} />
                      </dd>
                    </>
                  )}

                  {data.checks.s3.error && (
                    <>
                      <dt className="text-gray-500">Error</dt>
                      <dd className={`text-xs font-mono ${data.checks.s3.configured ? "text-red-600" : "text-gray-400"}`}>
                        {data.checks.s3.error}
                      </dd>
                    </>
                  )}
                </dl>
              </CardContent>
            </Card>

            {/* Build Info */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <Info className="h-4 w-4 text-gray-400" /> Build Info
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  {[
                    { label: "NODE_ENV",        value: data.build.nodeEnv },
                    { label: "Version",         value: data.build.version         ?? "—" },
                    { label: "Git SHA",         value: data.build.gitSha          ?? "—" },
                    { label: "Render Service",  value: data.build.renderService   ?? "—" },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                      <p className="text-xs text-gray-400 mb-1">{label}</p>
                      <p className="font-mono font-semibold text-gray-800 text-sm truncate">{value}</p>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          </div>

          <p className="text-xs text-gray-400">
            This page checks DB connectivity and S3 signing readiness. It does not fetch actual S3 objects (safe by design).
          </p>
        </div>
      )}
    </div>
  );
}
