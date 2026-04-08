import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Loader2, Wallet, Link as LinkIcon, ChevronDown } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { adminGetLedgerTxn } from "@/api/adminFinanceLedgerApi";
import CopyIdButton from "@/components/ui/CopyIdButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";

function formatINR(paise: number) {
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  return `${sign}₹${(abs / 100).toFixed(2)}`;
}

export default function LedgerDetail() {
  const { walletTxnId } = useParams();
  const [loading, setLoading] = useState(false);
  const [row,     setRow]     = useState<any>(null);
  const [err,     setErr]     = useState<string | null>(null);

  async function load() {
    if (!walletTxnId) return;
    setLoading(true); setErr(null);
    try {
      const data = await adminGetLedgerTxn(walletTxnId);
      setRow(data);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [walletTxnId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return (
    <div className="flex items-center gap-2 py-10 text-gray-500">
      <Loader2 className="h-5 w-5 animate-spin" /> Loading transaction…
    </div>
  );
  if (err) return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-700 mt-4">{err}</div>
  );
  if (!row) return (
    <div className="py-10 text-center text-gray-400">Not found.</div>
  );

  const direction = row.computed?.direction ?? (row.amountPaise < 0 ? "DEBIT" : "CREDIT");

  return (
    <div>
      <PageHeader
        title="Wallet Transaction"
        subtitle={
          <div className="flex items-center gap-2 mt-1">
            <span className="font-mono text-xs text-gray-500">{row.id}</span>
            <CopyIdButton value={row.id} label="Wallet Txn ID" />
            <StatusBadge status={row.status} />
            <Badge variant={direction === "CREDIT" ? "success" : "danger"} className="text-xs font-mono">
              {direction}
            </Badge>
            <span className="font-mono font-bold text-gray-800">{formatINR(row.amountPaise)}</span>
          </div>
        }
        breadcrumbs={[
          { label: "Finance", to: "/admin/finance" },
          { label: "Wallet Ledger", to: "/admin/finance/ledger" },
          { label: "Detail" },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Summary */}
        <Card>
          <CardHeader>
            <Wallet className="h-4 w-4 text-gray-400" /> Transaction Details
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-3 text-sm">
              <dt className="text-gray-500">Amount</dt>
              <dd className="font-mono font-bold text-gray-800">{formatINR(row.amountPaise)}</dd>

              <dt className="text-gray-500">Direction</dt>
              <dd>
                <Badge variant={direction === "CREDIT" ? "success" : "danger"} className="text-xs font-mono">
                  {direction}
                </Badge>
              </dd>

              <dt className="text-gray-500">Abs Amount</dt>
              <dd className="font-mono text-gray-800">
                {formatINR(row.computed?.absAmountPaise ?? Math.abs(row.amountPaise))}
              </dd>

              <dt className="text-gray-500">Type</dt>
              <dd><Badge variant="default" className="text-xs font-mono">{row.type}</Badge></dd>

              <dt className="text-gray-500">Status</dt>
              <dd><StatusBadge status={row.status} /></dd>

              <dt className="text-gray-500">Created</dt>
              <dd className="text-gray-700">{new Date(row.createdAt).toLocaleString()}</dd>
            </dl>
          </CardContent>
        </Card>

        {/* Deep links */}
        <Card>
          <CardHeader>
            <LinkIcon className="h-4 w-4 text-gray-400" /> Linked Records
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-3 text-sm">
              {row.user?.id && (
                <>
                  <dt className="text-gray-500">User</dt>
                  <dd className="flex items-center gap-1.5">
                    <Link to={`/admin/users/${row.user.id}`} className="text-blue-600 hover:underline font-semibold">
                      {row.user.email ?? row.user.id}
                    </Link>
                    <CopyIdButton value={row.user.id} label="User ID" />
                  </dd>
                </>
              )}

              {row.task?.id && (
                <>
                  <dt className="text-gray-500">Task</dt>
                  <dd className="flex items-center gap-1.5">
                    <Link to={`/admin/tasks/${row.task.id}`} className="text-blue-600 hover:underline">
                      {row.task.title ?? row.task.id.slice(0, 8) + "…"}
                    </Link>
                    <CopyIdButton value={row.task.id} label="Task ID" />
                  </dd>
                </>
              )}

              {row.links?.cashoutId && (
                <>
                  <dt className="text-gray-500">Cashout</dt>
                  <dd className="flex items-center gap-1.5">
                    <Link to={`/admin/finance/cashouts/${row.links.cashoutId}`} className="text-blue-600 hover:underline font-mono text-xs">
                      {row.links.cashoutId}
                    </Link>
                    <CopyIdButton value={row.links.cashoutId} label="Cashout ID" />
                  </dd>
                </>
              )}

              {row.links?.paymentIntentId && (
                <>
                  <dt className="text-gray-500">Payment Intent</dt>
                  <dd className="flex items-center gap-1.5">
                    <Link to={`/admin/finance/payment-intents/${row.links.paymentIntentId}`} className="text-blue-600 hover:underline font-mono text-xs">
                      {row.links.paymentIntentId}
                    </Link>
                    <CopyIdButton value={row.links.paymentIntentId} label="PaymentIntent ID" />
                  </dd>
                </>
              )}

              {!row.user?.id && !row.task?.id && !row.links?.cashoutId && !row.links?.paymentIntentId && (
                <dt className="col-span-2 text-gray-400 text-sm">No linked records.</dt>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Raw payload collapsible */}
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
