import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Loader2, CreditCard, Link as LinkIcon, ChevronDown } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { adminGetPaymentIntent } from "@/api/adminPaymentIntentsApi";
import CopyIdButton from "@/components/ui/CopyIdButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";

function formatINR(paise: number) {
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  return `${sign}₹${(abs / 100).toFixed(2)}`;
}

export default function PaymentIntentDetail() {
  const { paymentIntentId } = useParams();
  const [loading, setLoading] = useState(false);
  const [row,     setRow]     = useState<any>(null);
  const [err,     setErr]     = useState<string | null>(null);

  async function load() {
    if (!paymentIntentId) return;
    setLoading(true); setErr(null);
    try {
      const data = await adminGetPaymentIntent(paymentIntentId);
      setRow(data);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [paymentIntentId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return (
    <div className="flex items-center gap-2 py-10 text-gray-500">
      <Loader2 className="h-5 w-5 animate-spin" /> Loading payment intent…
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
        title="Payment Intent"
        subtitle={
          <div className="flex items-center gap-2 mt-1">
            <span className="font-mono text-xs text-gray-500">{row.id}</span>
            <CopyIdButton value={row.id} label="PaymentIntent ID" />
            <StatusBadge status={row.status} />
            <span className="font-mono font-bold text-gray-800">{formatINR(row.amountPaise)}</span>
          </div>
        }
        breadcrumbs={[
          { label: "Finance", to: "/admin/finance" },
          { label: "Payment Intents", to: "/admin/finance/payment-intents" },
          { label: "Detail" },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Summary */}
        <Card>
          <CardHeader>
            <CreditCard className="h-4 w-4 text-gray-400" /> Summary
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[160px_1fr] gap-x-4 gap-y-3 text-sm">
              <dt className="text-gray-500">Amount</dt>
              <dd className="font-mono font-bold text-gray-800">{formatINR(row.amountPaise)}</dd>

              <dt className="text-gray-500">Provider</dt>
              <dd><Badge variant="default" className="font-mono text-xs">{row.provider}</Badge></dd>

              <dt className="text-gray-500">Provider Ref</dt>
              <dd className="flex items-center gap-1.5">
                <span className="font-mono text-xs text-gray-700">{row.providerRef ?? "—"}</span>
                {row.providerRef && <CopyIdButton value={row.providerRef} label="Provider Ref" />}
              </dd>

              <dt className="text-gray-500">Status</dt>
              <dd><StatusBadge status={row.status} /></dd>

              <dt className="text-gray-500">User</dt>
              <dd>
                <Link to={`/admin/users/${row.userId}`} className="text-blue-600 hover:underline font-semibold">
                  {row.user?.email ?? row.userId}
                </Link>
              </dd>

              <dt className="text-gray-500">Created</dt>
              <dd className="text-gray-700">{new Date(row.createdAt).toLocaleString()}</dd>

              <dt className="text-gray-500">Updated</dt>
              <dd className="text-gray-700">{new Date(row.updatedAt).toLocaleString()}</dd>

              <dt className="text-gray-500">Posted Wallet Txn</dt>
              <dd>
                {row.postedWalletTxnId ? (
                  <div className="flex items-center gap-1.5">
                    <Link to={`/admin/finance/ledger/${row.postedWalletTxnId}`} className="font-mono text-xs text-blue-600 hover:underline">
                      {row.postedWalletTxnId}
                    </Link>
                    <CopyIdButton value={row.postedWalletTxnId} label="Posted WalletTxn ID" />
                  </div>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </dd>
            </dl>
          </CardContent>
        </Card>

        {/* Posted Wallet Txn Snapshot */}
        <Card>
          <CardHeader>
            <LinkIcon className="h-4 w-4 text-gray-400" /> Posted Wallet Txn Snapshot
          </CardHeader>
          <CardContent>
            {row.postedWalletTxn ? (
              <dl className="grid grid-cols-[160px_1fr] gap-x-4 gap-y-3 text-sm">
                <dt className="text-gray-500">Txn ID</dt>
                <dd className="flex items-center gap-1.5">
                  <Link to={`/admin/finance/ledger/${row.postedWalletTxn.id}`} className="font-mono text-xs text-blue-600 hover:underline">
                    {row.postedWalletTxn.id}
                  </Link>
                  <CopyIdButton value={row.postedWalletTxn.id} label="WalletTxn ID" />
                </dd>

                <dt className="text-gray-500">Amount</dt>
                <dd className="font-mono font-semibold text-gray-800">{formatINR(row.postedWalletTxn.amountPaise)}</dd>

                <dt className="text-gray-500">Type</dt>
                <dd><Badge variant="default" className="font-mono text-xs">{row.postedWalletTxn.type}</Badge></dd>

                <dt className="text-gray-500">Status</dt>
                <dd><StatusBadge status={row.postedWalletTxn.status} /></dd>
              </dl>
            ) : (
              <p className="text-sm text-gray-400">Not posted yet.</p>
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
