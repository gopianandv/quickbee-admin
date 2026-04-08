import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Copy, CheckCircle, AlertCircle, Ban, Loader2 } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  adminGetCashout,
  adminMarkCashoutProcessing,
  adminMarkCashoutPaid,
  adminMarkCashoutFailed,
  adminCancelCashout,
} from "@/api/adminFinance";
import { hasPerm } from "@/auth/permissions";
import CopyIdButton from "@/components/ui/CopyIdButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";

function formatINR(paise: number) {
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  return `${sign}₹${(abs / 100).toFixed(2)}`;
}

function norm(s?: any) {
  return String(s ?? "").trim().toUpperCase();
}

const inputCls =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30";

export default function CashoutDetail() {
  const { cashoutId } = useParams();
  const id = cashoutId as string;

  const canFinance = hasPerm("FINANCE", "ADMIN");

  const [data,    setData]    = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState<string | null>(null);
  const [saving,  setSaving]  = useState(false);
  const [actionErr, setActionErr] = useState<string | null>(null);

  const [note,          setNote]          = useState("");
  const [failureReason, setFailureReason] = useState("");

  async function load() {
    setLoading(true); setErr(null);
    try {
      const d = await adminGetCashout(id);
      setData(d);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Failed to load cashout");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const status = useMemo(() => norm(data?.status), [data]);

  const isTerminal      = status === "PAID" || status === "FAILED" || status === "CANCELLED";
  const canMarkProcessing = status === "REQUESTED";
  const canMarkPaid     = status === "PROCESSING";
  const canMarkFailed   = status === "PROCESSING";
  const canCancel       = status === "REQUESTED";

  if (!canFinance) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-6 text-center mt-6">
        <p className="font-bold text-red-700 text-lg">Access Denied</p>
        <p className="mt-1 text-sm text-red-600">You don't have FINANCE permission.</p>
        <Link to="/admin/dashboard">
          <Button variant="secondary" size="sm" className="mt-4">← Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  if (loading) return (
    <div className="flex items-center gap-2 py-10 text-gray-500">
      <Loader2 className="h-5 w-5 animate-spin" /> Loading cashout…
    </div>
  );
  if (err) return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-700 mt-4">{err}</div>
  );
  if (!data) return null;

  async function doAction(fn: () => Promise<any>) {
    if (saving) return;
    setSaving(true); setActionErr(null);
    try {
      await fn();
      await load();
    } catch (e: any) {
      const httpStatus = e?.response?.status;
      const payload    = e?.response?.data;
      setActionErr(
        [
          "Action failed",
          httpStatus ? `HTTP ${httpStatus}` : null,
          payload?.error ? payload.error : payload ? JSON.stringify(payload) : null,
          e?.message,
        ].filter(Boolean).join(" · ")
      );
    } finally {
      setSaving(false);
    }
  }

  const methodType = norm(data?.methodType);

  return (
    <div>
      <PageHeader
        title="Cashout"
        subtitle={
          <div className="flex items-center gap-2 mt-1">
            <span className="font-mono text-xs text-gray-500">{data.id}</span>
            <CopyIdButton value={data.id} label="Cashout ID" />
            <StatusBadge status={data.status} />
            <Badge variant={isTerminal ? "default" : "info"} className="text-xs">
              {isTerminal ? "Terminal" : "Active"}
            </Badge>
          </div>
        }
        breadcrumbs={[
          { label: "Finance", to: "/admin/finance" },
          { label: "Cashouts", to: "/admin/finance/cashouts" },
          { label: "Detail" },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Summary */}
        <Card>
          <CardHeader>
            <CheckCircle className="h-4 w-4 text-gray-400" /> Summary
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-3 text-sm">
              <dt className="text-gray-500">Amount</dt>
              <dd className="font-mono font-bold text-gray-800">{formatINR(data.amountPaise)}</dd>

              <dt className="text-gray-500">Method</dt>
              <dd><Badge variant="default">{data.methodType}</Badge></dd>

              <dt className="text-gray-500">Status</dt>
              <dd><StatusBadge status={data.status} /></dd>

              <dt className="text-gray-500">Created</dt>
              <dd className="text-gray-700">{new Date(data.createdAt).toLocaleString()}</dd>

              <dt className="text-gray-500">Processed</dt>
              <dd className="text-gray-700">{data.processedAt ? new Date(data.processedAt).toLocaleString() : "—"}</dd>

              {data.failureReason && (
                <>
                  <dt className="text-gray-500">Failure</dt>
                  <dd className="text-red-600">{data.failureReason}</dd>
                </>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* User */}
        <Card>
          <CardHeader>
            <ArrowLeft className="h-4 w-4 text-gray-400" /> User
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-3 text-sm">
              <dt className="text-gray-500">Email</dt>
              <dd>
                {data.user?.id ? (
                  <Link to={`/admin/users/${data.user.id}`} className="text-blue-600 hover:underline font-semibold">
                    {data.user.email}
                  </Link>
                ) : (
                  <span>{data.user?.email || data.userId}</span>
                )}
              </dd>
              {data.user?.name && (
                <>
                  <dt className="text-gray-500">Name</dt>
                  <dd className="text-gray-700">{data.user.name}</dd>
                </>
              )}
              <dt className="text-gray-500">User ID</dt>
              <dd className="flex items-center gap-1.5">
                <span className="font-mono text-xs text-gray-500">{data.user?.id ?? data.userId}</span>
                <CopyIdButton value={data.user?.id ?? data.userId} label="User ID" />
              </dd>
            </dl>
          </CardContent>
        </Card>

        {/* Payout Details */}
        <Card>
          <CardHeader>
            <Copy className="h-4 w-4 text-gray-400" /> Payout Details
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-3 text-sm">
              {methodType === "UPI" ? (
                <>
                  <dt className="text-gray-500">UPI ID</dt>
                  <dd className="font-mono font-semibold text-gray-800">{data.upiId || "—"}</dd>
                </>
              ) : (
                <>
                  <dt className="text-gray-500">Holder</dt>
                  <dd className="font-semibold text-gray-800">{data.bankHolderName || "—"}</dd>

                  <dt className="text-gray-500">IFSC</dt>
                  <dd className="font-mono text-gray-800">{data.bankIfsc || "—"}</dd>

                  <dt className="text-gray-500">Account</dt>
                  <dd className="font-mono text-gray-800">
                    {data.bankAccountLast4 ? `XXXX${data.bankAccountLast4}` : "—"}
                  </dd>
                </>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Linked Financials */}
        <Card>
          <CardHeader>
            <CheckCircle className="h-4 w-4 text-gray-400" /> Linked Financials
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[160px_1fr] gap-x-4 gap-y-3 text-sm">
              <dt className="text-gray-500">Wallet Txn (debit)</dt>
              <dd>
                {data.walletTxnId ? (
                  <div className="flex items-center gap-1.5">
                    <Link to={`/admin/finance/ledger/${data.walletTxnId}`} className="font-mono text-xs text-blue-600 hover:underline">
                      {data.walletTxnId}
                    </Link>
                    <CopyIdButton value={data.walletTxnId} label="Wallet Txn ID" />
                  </div>
                ) : (
                  <span className="text-gray-400">Not created yet</span>
                )}
              </dd>
            </dl>

            {data.walletTxn && (
              <div className="mt-4 pt-4 border-t border-dashed border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Wallet Txn Snapshot</p>
                <dl className="grid grid-cols-[160px_1fr] gap-x-4 gap-y-2 text-sm">
                  <dt className="text-gray-500">Amount</dt>
                  <dd className="font-mono text-gray-800">{formatINR(data.walletTxn.amountPaise)}</dd>

                  <dt className="text-gray-500">Type</dt>
                  <dd className="font-mono text-gray-800">{data.walletTxn.type}</dd>

                  <dt className="text-gray-500">Status</dt>
                  <dd><StatusBadge status={data.walletTxn.status} /></dd>
                </dl>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Finance Actions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <AlertCircle className="h-4 w-4 text-gray-400" /> Finance Actions
          </CardHeader>
          <CardContent>
            {actionErr && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {actionErr}
              </div>
            )}

            <div className="mb-4">
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Note (optional — used for audit/memo)
              </label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note…"
                className={inputCls}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="md"
                disabled={!canMarkProcessing || saving}
                title={!canMarkProcessing ? "Allowed only when status is REQUESTED" : undefined}
                onClick={() => doAction(() => adminMarkCashoutProcessing(id, note.trim() || undefined))}
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Mark Processing
              </Button>

              <Button
                variant="primary"
                size="md"
                disabled={!canMarkPaid || saving}
                title={!canMarkPaid ? "Allowed only when status is PROCESSING" : undefined}
                onClick={() => doAction(() => adminMarkCashoutPaid(id, note.trim() || undefined))}
              >
                Mark Paid (creates ledger debit)
              </Button>

              <Button
                variant="danger"
                size="md"
                disabled={!canMarkFailed || saving}
                title={!canMarkFailed ? "Allowed only when status is PROCESSING" : undefined}
                onClick={() => {
                  const reason = failureReason.trim() || window.prompt("Failure reason:") || "";
                  if (!reason) return;
                  setFailureReason(reason);
                  doAction(() => adminMarkCashoutFailed(id, reason));
                }}
              >
                Mark Failed
              </Button>

              <Button
                variant="danger"
                size="md"
                disabled={!canCancel || saving}
                title={!canCancel ? "Allowed only when status is REQUESTED" : undefined}
                onClick={() => {
                  const n = note.trim() || window.prompt("Cancel note (optional):") || undefined;
                  doAction(() => adminCancelCashout(id, n));
                }}
              >
                <Ban className="h-3.5 w-3.5" /> Cancel Request
              </Button>
            </div>

            <p className="mt-4 text-[11px] text-gray-400">
              Rules: REQUESTED → PROCESSING → PAID/FAILED · REQUESTED → CANCELLED · PAID creates WalletTransaction DEBIT_CASHOUT and links it.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
