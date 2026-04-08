import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  RefreshCw, User, Wallet, Clock, MessageSquare,
  AlertTriangle, CheckCircle, XCircle, ChevronRight,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { hasPerm } from "@/auth/permissions";
import {
  adminGetTask,
  adminUpdateTaskStatus,
  adminCancelTask,
  adminRefundEscrow,
} from "@/api/adminTasks";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { useToast } from "@/lib/toast";
import { useConfirm } from "@/lib/confirm";

type TaskStatus =
  | "NEW" | "ACCEPTED" | "IN_PROGRESS" | "PENDING_CONSUMER_CONFIRM"
  | "COMPLETED" | "CANCELLED" | "EXPIRED";

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "NEW",                      label: "New"                       },
  { value: "ACCEPTED",                 label: "Accepted"                  },
  { value: "IN_PROGRESS",              label: "In Progress"               },
  { value: "PENDING_CONSUMER_CONFIRM", label: "Pending Consumer Confirm"  },
  { value: "COMPLETED",                label: "Completed"                 },
  { value: "CANCELLED",                label: "Cancelled"                 },
  { value: "EXPIRED",                  label: "Expired"                   },
];

const PROGRESS_KIND_LABELS: Record<string, string> = {
  TASK_ACCEPTED:             "Task Accepted",
  TASK_STARTED:              "Task Started",
  TASK_MARKED_DONE:          "Marked Done by Helper",
  TASK_COMPLETION_CONFIRMED: "Completion Confirmed",
  TASK_CANCELLED:            "Task Cancelled",
  ON_THE_WAY:                "On the Way",
  ARRIVED:                   "Helper Arrived",
  WORKING:                   "Working",
  DELAYED:                   "Delayed",
  CUSTOM_NOTE:               "Note",
};

function moneyRs(paise?: number | null) {
  return (Number(paise ?? 0) / 100).toFixed(2);
}

function userLabel(u: any): string {
  if (!u) return "—";
  return u.name || u.email || u.profile?.phoneNumber || String(u.id || "").slice(0, 8) || "—";
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">{children}</p>;
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-t border-gray-100 first:border-0">
      <span className="text-sm text-gray-500 min-w-[130px] shrink-0">{label}</span>
      <span className="text-sm font-semibold text-gray-800">{children}</span>
    </div>
  );
}

export default function AdminTaskDetail() {
  const { id } = useParams();
  const taskId = id as string;

  const [data,    setData]    = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState<string | null>(null);

  const isAdmin = hasPerm("ADMIN");
  const { success: toastSuccess, error: toastError } = useToast();
  const confirm = useConfirm();

  const [newStatus,        setNewStatus]        = useState<TaskStatus>("NEW");
  const [note,             setNote]             = useState("");
  const [cancelReason,     setCancelReason]     = useState("");
  const [refundEscrowFlag, setRefundEscrowFlag] = useState(true);

  async function load() {
    setLoading(true); setErr(null);
    try {
      const d = await adminGetTask(taskId);
      setData(d);
      const s = String(d?.status || "NEW").toUpperCase();
      const isKnown = STATUS_OPTIONS.some((o) => o.value === s as any);
      setNewStatus((isKnown ? s : "NEW") as TaskStatus);
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? (e as { message?: string })?.message ?? "Failed to load task");
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [taskId]); // eslint-disable-line react-hooks/exhaustive-deps

  const paymentMode  = String(data?.paymentMode || "").toUpperCase();
  const isAppPayment = paymentMode === "APP";
  const statusUpper  = useMemo(() => String(data?.status || "").toUpperCase(), [data]);

  const canRefundEscrow = useMemo(() => {
    const escrow = data?.escrow;
    if (!escrow) return false;
    return String(escrow.status || "").toUpperCase() === "HOLD" && isAppPayment;
  }, [data, isAppPayment]);

  const canCancelTask = useMemo(() =>
    ["NEW", "ACCEPTED", "IN_PROGRESS", "PENDING_CONSUMER_CONFIRM"].includes(statusUpper),
    [statusUpper]
  );

  const cancelDisabledReason = useMemo(() => {
    if (!data) return "";
    if (statusUpper === "CANCELLED") return "Task is already cancelled.";
    if (statusUpper === "COMPLETED") return "Completed tasks cannot be cancelled.";
    if (statusUpper === "EXPIRED")   return "Expired tasks cannot be cancelled.";
    if (!canCancelTask) return `Cancel is disabled for status: ${statusUpper}`;
    return "";
  }, [data, statusUpper, canCancelTask]);

  const canShowRefundToggle = isAppPayment && canRefundEscrow;

  async function onUpdateStatus() {
    const ok = await confirm({
      title: `Force status to "${newStatus}"?`,
      message: "This bypasses normal task flow. Only use if you know what you're doing.",
      confirmLabel: "Update",
    });
    if (!ok) return;
    try {
      await adminUpdateTaskStatus(taskId, newStatus, note.trim() || undefined);
      await load(); setNote("");
      toastSuccess("Status updated", `Task status changed to ${newStatus}.`);
    } catch (e: unknown) {
      toastError("Update failed", (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? (e as { message?: string })?.message ?? "Failed to update status");
    }
  }

  async function onCancelTask() {
    if (!canCancelTask) return;
    const ok = await confirm({
      title: "Cancel this task?",
      message: cancelReason.trim()
        ? `Reason: "${cancelReason.trim()}"${canShowRefundToggle && refundEscrowFlag ? " · Escrow will be refunded." : ""}`
        : "No reason provided. Are you sure?",
      variant: "danger",
      confirmLabel: "Cancel Task",
    });
    if (!ok) return;
    try {
      await adminCancelTask(taskId, cancelReason.trim() || undefined, canShowRefundToggle ? refundEscrowFlag : false);
      await load();
      toastSuccess("Task cancelled", canShowRefundToggle && refundEscrowFlag ? "Task cancelled and escrow refunded." : "Task has been cancelled.");
    } catch (e: unknown) {
      toastError("Cancel failed", (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? (e as { message?: string })?.message ?? "Failed to cancel task");
    }
  }

  async function onRefundEscrow() {
    const ok = await confirm({
      title: "Refund escrow manually?",
      message: "This will release the held amount back to the consumer's wallet.",
      confirmLabel: "Refund",
    });
    if (!ok) return;
    try {
      await adminRefundEscrow(taskId, note.trim() || undefined);
      await load();
      toastSuccess("Escrow refunded", "Funds returned to consumer wallet.");
    } catch (e: unknown) {
      toastError("Refund failed", (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? (e as { message?: string })?.message ?? "Failed to refund escrow");
    }
  }

  const selectCls = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30 disabled:opacity-50";
  const inputCls  = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30 disabled:opacity-50";

  return (
    <div>
      <PageHeader
        title={data?.title || "Task Detail"}
        breadcrumbs={[
          { label: "Tasks", to: "/admin/tasks" },
          { label: data?.title || taskId },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {data && <StatusBadge status={data.status} />}
            {!isAdmin && <Badge variant="default" className="text-xs">Read-only (Support)</Badge>}
            <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        }
      />

      {data && (
        <p className="text-xs text-gray-400 mb-4 font-mono">Task ID: {data.id}</p>
      )}

      <ErrorMessage message={err} className="mb-4" />

      {loading && !data && (
        <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Loading…</div>
      )}

      {data && (
        <div className="flex flex-col gap-4">
          {/* Top grid: summary + people + escrow + actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Summary */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-gray-400" /> Summary</div>
              </CardHeader>
              <CardContent>
                <InfoRow label="Status"><StatusBadge status={data.status} /></InfoRow>
                <InfoRow label="Created">{new Date(data.createdAt).toLocaleString()}</InfoRow>
                <InfoRow label="Category">{data.category?.name || "—"}</InfoRow>
                <InfoRow label="Payment mode">
                  <Badge variant="default">{data.paymentMode || "—"}</Badge>
                </InfoRow>
                <InfoRow label="Cost">{data.cost != null ? `₹${data.cost}` : "—"}</InfoRow>
                {data.description && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Description</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{data.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* People */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2"><User className="h-4 w-4 text-gray-400" /> People</div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <FieldLabel>Poster</FieldLabel>
                  {data.postedBy?.id
                    ? <Link to={`/admin/users/${data.postedBy.id}`} className="font-bold text-blue-600 hover:underline">{userLabel(data.postedBy)}</Link>
                    : <span className="text-sm font-semibold text-gray-800">{userLabel(data.postedBy)}</span>
                  }
                  {data.postedBy?.name && (data.postedBy?.email || data.postedBy?.profile?.phoneNumber) && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {data.postedBy.email || data.postedBy.profile?.phoneNumber}
                      {!data.postedBy.email && data.postedBy.profile?.phoneNumber ? " (phone only)" : ""}
                    </p>
                  )}
                </div>
                <div className="border-t border-gray-100 pt-4">
                  <FieldLabel>Helper</FieldLabel>
                  {data.assignedTo?.id
                    ? <Link to={`/admin/users/${data.assignedTo.id}`} className="font-bold text-blue-600 hover:underline">{userLabel(data.assignedTo)}</Link>
                    : <span className="text-sm text-gray-400">Not yet assigned</span>
                  }
                  {data.assignedTo?.name && (data.assignedTo?.email || data.assignedTo?.profile?.phoneNumber) && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {data.assignedTo.email || data.assignedTo.profile?.phoneNumber}
                      {!data.assignedTo.email && data.assignedTo.profile?.phoneNumber ? " (phone only)" : ""}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Escrow */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2"><Wallet className="h-4 w-4 text-gray-400" /> Escrow</div>
              </CardHeader>
              <CardContent>
                <InfoRow label="Status">
                  {data.escrow?.status ? <StatusBadge status={data.escrow.status} /> : <span className="text-gray-400">—</span>}
                </InfoRow>
                <InfoRow label="Amount (paise)">{data.escrow?.amountPaise ?? "—"}</InfoRow>
                <InfoRow label="Amount (₹)">
                  <span className={`font-bold ${(data.escrow?.amountPaise ?? 0) > 0 ? "text-green-600" : "text-gray-800"}`}>
                    {data.escrow?.amountPaise ? `₹${moneyRs(data.escrow.amountPaise)}` : "—"}
                  </span>
                </InfoRow>
              </CardContent>
            </Card>

            {/* Admin actions */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Admin Actions</div>
              </CardHeader>
              <CardContent>
                {!isAdmin ? (
                  <p className="text-sm text-gray-500">You have read-only access. Admin actions are restricted to ADMIN.</p>
                ) : (
                  <div className="space-y-5">
                    {/* Update status */}
                    <div>
                      <FieldLabel>Force status update</FieldLabel>
                      <div className="flex gap-2 mb-2">
                        <select value={newStatus} onChange={(e) => setNewStatus(e.target.value as TaskStatus)} className={selectCls}>
                          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <Button variant="secondary" size="md" onClick={onUpdateStatus}>Update</Button>
                      </div>
                      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note" className={inputCls} />
                    </div>

                    {/* Cancel task */}
                    <div className="border-t border-gray-100 pt-4">
                      <FieldLabel>Cancel task</FieldLabel>
                      {!canCancelTask && (
                        <p className="text-xs text-amber-600 mb-2">{cancelDisabledReason}</p>
                      )}
                      <input
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        placeholder="Cancel reason"
                        disabled={!canCancelTask}
                        className={inputCls + " mb-2"}
                      />
                      {canShowRefundToggle ? (
                        <label className="flex items-center gap-2 text-sm mb-2 cursor-pointer">
                          <input type="checkbox" checked={refundEscrowFlag} onChange={(e) => setRefundEscrowFlag(e.target.checked)} className="rounded" />
                          Refund escrow to consumer wallet (APP + HOLD only)
                        </label>
                      ) : (
                        <p className="text-xs text-gray-400 mb-2">Refund only available when payment is <strong>APP</strong> and escrow is <strong>HOLD</strong>.</p>
                      )}
                      <Button variant="danger" size="md" onClick={onCancelTask} disabled={!canCancelTask} className="w-full">
                        <XCircle className="h-4 w-4" /> Cancel Task
                      </Button>
                    </div>

                    {/* Refund escrow */}
                    <div className="border-t border-gray-100 pt-4">
                      <FieldLabel>Manual escrow refund</FieldLabel>
                      {!canRefundEscrow && (
                        <p className="text-xs text-gray-400 mb-2">Refund enabled only when payment is <strong>APP</strong> and escrow is <strong>HOLD</strong>.</p>
                      )}
                      <Button variant="secondary" size="md" onClick={onRefundEscrow} disabled={!canRefundEscrow} className="w-full">
                        <Wallet className="h-4 w-4" /> Refund Escrow
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                Task Timeline
                {data.progressUpdates?.length > 0 && (
                  <Badge variant="default" className="text-[10px]">{data.progressUpdates.length} updates</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative pl-5 border-l-2 border-gray-100 space-y-4">
                {/* Creation row */}
                <div className="relative">
                  <div className="absolute -left-[1.35rem] top-1 h-3 w-3 rounded-full bg-gray-400 border-2 border-white" />
                  <p className="text-sm font-bold text-gray-800">📋 Task Created</p>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(data.createdAt).toLocaleString()}</p>
                </div>

                {data.progressUpdates?.length > 0 ? (
                  data.progressUpdates.map((pu: any) => {
                    const label = PROGRESS_KIND_LABELS[pu.kind] ?? pu.kind;
                    const isCancelled = pu.kind === "TASK_CANCELLED";
                    const isCompleted = pu.kind === "TASK_COMPLETION_CONFIRMED";
                    const dotCls = isCancelled ? "bg-red-500" : isCompleted ? "bg-green-500" : "bg-blue-500";
                    return (
                      <div key={pu.id} className="relative">
                        <div className={`absolute -left-[1.35rem] top-1 h-3 w-3 rounded-full border-2 border-white ${dotCls}`} />
                        <p className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                          <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          {label}
                        </p>
                        {pu.message && <p className="text-sm text-gray-600 mt-0.5">{pu.message}</p>}
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(pu.createdAt).toLocaleString()}
                          {pu.postedBy && <span> · by <Link to={`/admin/users/${pu.postedBy.id}`} className="text-blue-600 hover:underline">{userLabel(pu.postedBy)}</Link></span>}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-sm text-gray-400">
                    No detailed progress updates recorded.
                    {(data.assignedToId || data.cancelledAt) && (
                      <ul className="mt-2 pl-4 list-disc space-y-1">
                        {data.assignedToId && <li>Accepted by helper — {new Date(data.updatedAt).toLocaleString()}</li>}
                        {data.status === "IN_PROGRESS" && <li>Work started — {new Date(data.updatedAt).toLocaleString()}</li>}
                        {data.status === "PENDING_CONSUMER_CONFIRM" && <li>Marked complete by helper — {new Date(data.updatedAt).toLocaleString()}</li>}
                        {data.status === "COMPLETED" && <li>Completed (confirmed by consumer) — {new Date(data.updatedAt).toLocaleString()}</li>}
                        {data.cancelledAt && <li>Cancelled — {new Date(data.cancelledAt).toLocaleString()}{data.cancelReason ? ` · ${data.cancelReason}` : ""}</li>}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Counter-offers */}
          {data.counterOffers?.length > 0 && (
            <Card>
              <CardHeader>
                Counter-Offers <Badge variant="default" className="ml-2 text-[10px]">{data.counterOffers.length}</Badge>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Helper</th>
                      <th className="text-left py-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Rate</th>
                      <th className="text-left py-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Status</th>
                      <th className="text-left py-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Original</th>
                      <th className="text-left py-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Note / Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.counterOffers.map((co: any) => (
                      <tr key={co.offerId} className="hover:bg-gray-50">
                        <td className="py-2 px-3">
                          <Link to={`/admin/users/${co.helper?.id}`} className="font-semibold text-blue-600 hover:underline">{userLabel(co.helper)}</Link>
                        </td>
                        <td className="py-2 px-3 font-semibold">
                          {co.acceptOriginalPrice ? <span className="text-gray-400 text-xs">Original</span> : `₹${co.proposedRate}`}
                        </td>
                        <td className="py-2 px-3">
                          <Badge variant={co.status === "ACCEPTED" ? "success" : co.status === "REJECTED" ? "danger" : "default"}>
                            {co.status}
                          </Badge>
                        </td>
                        <td className="py-2 px-3">
                          {co.acceptOriginalPrice
                            ? <CheckCircle className="h-4 w-4 text-green-500" />
                            : <XCircle className="h-4 w-4 text-gray-300" />
                          }
                        </td>
                        <td className="py-2 px-3 text-xs text-gray-500">
                          {co.note && <div>{co.note}</div>}
                          <div>{new Date(co.createdAt).toLocaleString()}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {/* Chat thread */}
          {data.chatThread?.messages?.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-gray-400" /> Latest Chat (20)
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.chatThread.messages.map((m: any) => (
                  <div key={m.id} className="border-t border-gray-100 pt-3 first:border-0 first:pt-0">
                    <p className="text-xs text-gray-400 mb-1">{m.sender?.name || "User"} · {new Date(m.createdAt).toLocaleString()}</p>
                    <p className="text-sm text-gray-800">{m.text || "—"}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
