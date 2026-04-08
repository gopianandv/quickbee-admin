import { useEffect, useState } from "react";
import { RefreshCw, BarChart2, Filter } from "lucide-react";
import { adminGetTaskAnalytics, type TaskAnalyticsResponse } from "@/api/adminAnalytics";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { ErrorMessage } from "@/components/ui/ErrorMessage";

const STATUS_COLORS: Record<string, string> = {
  COMPLETED:                "#059669",
  CANCELLED:                "#DC2626",
  NEW:                      "#6B7280",
  ACCEPTED:                 "#2563EB",
  IN_PROGRESS:              "#D97706",
  PENDING_CONSUMER_CONFIRM: "#7C3AED",
  EXPIRED:                  "#9CA3AF",
};

const STATUS_BG: Record<string, string> = {
  COMPLETED:                "bg-green-500",
  CANCELLED:                "bg-red-500",
  NEW:                      "bg-gray-400",
  ACCEPTED:                 "bg-blue-500",
  IN_PROGRESS:              "bg-amber-500",
  PENDING_CONSUMER_CONFIRM: "bg-purple-500",
  EXPIRED:                  "bg-gray-300",
};

export default function AdminTaskAnalytics() {
  const [fromDate, setFromDate] = useState("");
  const [toDate,   setToDate]   = useState("");
  const [data,     setData]     = useState<TaskAnalyticsResponse | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [err,      setErr]      = useState<string | null>(null);

  async function load() {
    setLoading(true); setErr(null);
    try {
      const d = await adminGetTaskAnalytics({ fromDate: fromDate || undefined, toDate: toDate || undefined });
      setData(d);
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? (e as { message?: string })?.message ?? "Failed to load");
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const maxCategoryCount = Math.max(...(data?.byCategory.map((c) => c.count) ?? [1]), 1);

  const inputCls = "rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30";

  return (
    <div>
      <PageHeader
        title="Task Analytics"
        subtitle="Platform-wide task breakdown and trends."
        actions={
          <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        }
      />

      {/* Date filter */}
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <Filter className="h-4 w-4 text-gray-400 shrink-0" />
        <label className="text-sm text-gray-500">From</label>
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={inputCls} />
        <label className="text-sm text-gray-500">To</label>
        <input type="date" value={toDate}   onChange={(e) => setToDate(e.target.value)}   className={inputCls} />
        <Button variant="primary" size="md" onClick={load} disabled={loading}>
          {loading ? "Loading…" : "Apply"}
        </Button>
        {(fromDate || toDate) && (
          <Button variant="ghost" size="sm" onClick={() => { setFromDate(""); setToDate(""); }}>Clear</Button>
        )}
        {(fromDate || toDate) && (
          <Badge variant="info" className="text-xs">
            {fromDate || "…"} → {toDate || "now"}
          </Badge>
        )}
      </div>

      <ErrorMessage message={err} className="mb-4" />

      {data && (
        <div className="flex flex-col gap-4">
          {/* KPI bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: "Total Tasks",       value: data.summary.total,              accent: "text-gray-800"  },
              { label: "Completed",         value: data.summary.completed,          accent: "text-green-600" },
              { label: "Cancelled",         value: data.summary.cancelled,          accent: "text-red-500"   },
              { label: "Completion Rate",   value: `${data.summary.completionRate}%`,   accent: "text-green-600" },
              { label: "Cancellation Rate", value: `${data.summary.cancellationRate}%`, accent: "text-red-500"   },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm text-center">
                <p className={`text-2xl font-bold ${kpi.accent}`}>{kpi.value}</p>
                <p className="text-xs text-gray-500 mt-1">{kpi.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* By Status */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2"><BarChart2 className="h-4 w-4 text-gray-400" /> By Status</div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.byStatus.map((s) => {
                    const barCls = STATUS_BG[s.status] ?? "bg-gray-400";
                    const maxCount = Math.max(...data.byStatus.map((x) => x.count), 1);
                    return (
                      <div key={s.status} className="flex items-center gap-3">
                        <div className="w-36 shrink-0 flex items-center gap-2">
                          <div className={`h-2.5 w-2.5 rounded-full ${barCls} shrink-0`} />
                          <span className="text-sm font-semibold truncate" style={{ color: STATUS_COLORS[s.status] ?? "#374151" }}>
                            {s.status}
                          </span>
                        </div>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${barCls}`} style={{ width: `${(s.count / maxCount) * 100}%` }} />
                        </div>
                        <span className="text-sm font-bold text-gray-700 w-10 text-right">{s.count}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* By Payment Mode */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2"><BarChart2 className="h-4 w-4 text-gray-400" /> By Payment Mode</div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.byPaymentMode.map((m) => {
                    const maxCount = Math.max(...data.byPaymentMode.map((x) => x.count), 1);
                    const pct = Math.round((m.count / maxCount) * 100);
                    return (
                      <div key={m.mode}>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-semibold text-gray-700">{m.mode}</span>
                          <span className="text-sm font-bold text-gray-800">{m.count}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-brand rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Top Categories */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center gap-2"><BarChart2 className="h-4 w-4 text-gray-400" /> Top Categories</div>
              </CardHeader>
              <CardContent>
                {data.byCategory.length === 0 ? (
                  <p className="text-sm text-gray-400">No category data.</p>
                ) : (
                  <div className="space-y-3">
                    {data.byCategory.map((c) => (
                      <div key={c.categoryId ?? c.categoryName}>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-semibold text-gray-700">{c.categoryName}</span>
                          <span className="text-sm font-bold text-gray-800">{c.count}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${(c.count / maxCategoryCount) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Last 7 days bar chart */}
            {data.recentDaily.length > 0 && (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center gap-2"><BarChart2 className="h-4 w-4 text-gray-400" /> Last 7 Days</div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 items-end h-24">
                    {(() => {
                      const maxVal = Math.max(...data.recentDaily.map((d) => d.count), 1);
                      return data.recentDaily.map((d) => (
                        <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-xs font-bold text-gray-600">{d.count}</span>
                          <div
                            className="w-full bg-brand rounded-t-sm"
                            style={{ height: `${Math.max((d.count / maxVal) * 72, 4)}px` }}
                          />
                          <span className="text-[10px] text-gray-400">
                            {new Date(d.day).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                          </span>
                        </div>
                      ));
                    })()}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
