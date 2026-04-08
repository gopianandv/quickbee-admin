import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Loader2, Receipt, StickyNote, Link as LinkIcon, ChevronDown } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { adminGetPlatformFee } from "@/api/adminPlatformFeeLedgerApi";
import CopyIdButton from "@/components/ui/CopyIdButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";

function formatINR(paise: number) {
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  return `${sign}₹${(abs / 100).toFixed(2)}`;
}

export default function PlatformFeeLedgerDetail() {
  const { feeId } = useParams();
  const [loading, setLoading] = useState(false);
  const [row,     setRow]     = useState<any>(null);
  const [err,     setErr]     = useState<string | null>(null);

  async function load() {
    if (!feeId) return;
    setLoading(true); setErr(null);
    try {
      const data = await adminGetPlatformFee(feeId);
      setRow(data);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [feeId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return (
    <div className="flex items-center gap-2 py-10 text-gray-500">
      <Loader2 className="h-5 w-5 animate-spin" /> Loading platform fee row…
    </div>
  );
  if (err) return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-700 mt-4">{err}</div>
  );
  if (!row) return (
    <div className="py-10 text-center text-gray-400">Not found.</div>
  );

  return (
    <div>
      <PageHeader
        title="Platform Fee Row"
        subtitle={
          <div className="flex items-center gap-2 mt-1">
            <span className="font-mono text-xs text-gray-500">{row.id}</span>
            <CopyIdButton value={row.id} label="PlatformFee ID" />
            <Badge variant="default" className="font-mono text-xs">{row.kind}</Badge>
            <span className="font-mono font-bold text-gray-800">{formatINR(row.amountPaise)}</span>
          </div>
        }
        breadcrumbs={[
          { label: "Finance", to: "/admin/finance" },
          { label: "Platform Fees", to: "/admin/finance/platform-fees" },
          { label: "Detail" },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Summary */}
        <Card>
          <CardHeader>
            <Receipt className="h-4 w-4 text-gray-400" /> Summary
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-3 text-sm">
              <dt className="text-gray-500">Amount</dt>
              <dd className="font-mono font-bold text-gray-800">{formatINR(row.amountPaise)}</dd>

              <dt className="text-gray-500">Kind</dt>
              <dd><Badge variant="default" className="font-mono text-xs">{row.kind}</Badge></dd>

              <dt className="text-gray-500">Via</dt>
              <dd>
                {row.via
                  ? <StatusBadge status={row.via} />
                  : <span className="text-gray-400">—</span>}
              </dd>

              <dt className="text-gray-500">Created</dt>
              <dd className="text-gray-700">{new Date(row.createdAt).toLocaleString()}</dd>
            </dl>
          </CardContent>
        </Card>

        {/* Linked Records */}
        <Card>
          <CardHeader>
            <LinkIcon className="h-4 w-4 text-gray-400" /> Linked Records
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-3 text-sm">
              <dt className="text-gray-500">User</dt>
              <dd className="flex items-center gap-1.5">
                <Link to={`/admin/users/${row.userId}`} className="text-blue-600 hover:underline font-semibold">
                  {row.user?.email ?? <span className="font-mono text-xs">{row.userId}</span>}
                </Link>
                <CopyIdButton value={row.userId} label="User ID" />
              </dd>

              <dt className="text-gray-500">Task</dt>
              <dd>
                {row.task?.id ? (
                  <div className="flex items-center gap-1.5">
                    <Link to={`/admin/tasks/${row.task.id}`} className="text-blue-600 hover:underline">
                      {row.task.title ?? <span className="font-mono text-xs">{row.task.id}</span>}
                    </Link>
                    <CopyIdButton value={row.task.id} label="Task ID" />
                  </div>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </dd>
            </dl>
          </CardContent>
        </Card>

        {/* Note */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <StickyNote className="h-4 w-4 text-gray-400" /> Note
          </CardHeader>
          <CardContent>
            {row.note ? (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{row.note}</p>
            ) : (
              <p className="text-sm text-gray-400">No note attached to this fee row.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Raw payload */}
      <details className="mt-4 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <summary className="flex cursor-pointer items-center gap-2 px-5 py-3 text-sm font-semibold text-gray-600 bg-gray-50/60 hover:bg-gray-100 select-none">
          <ChevronDown className="h-4 w-4" /> Technical details (raw payload)
        </summary>
        <pre className="overflow-x-auto p-4 text-xs text-gray-700 bg-gray-50">
          {JSON.stringify(row, null, 2)}
        </pre>
      </details>
    </div>
  );
}
