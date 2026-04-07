import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import StatusBadge from "@/components/ui/StatusBadge";
import { hasPerm } from "@/auth/permissions";
import {
  adminGetTask,
  adminUpdateTaskStatus,
  adminCancelTask,
  adminRefundEscrow,
} from "@/api/adminTasks";

type TaskStatus =
  | "NEW"
  | "ACCEPTED"
  | "IN_PROGRESS"
  | "PENDING_CONSUMER_CONFIRM"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED";

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "NEW", label: "New" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "PENDING_CONSUMER_CONFIRM", label: "Pending Consumer Confirm" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "EXPIRED", label: "Expired" },
];

function moneyRs(paise?: number | null) {
  const n = Number(paise ?? 0);
  return (n / 100).toFixed(2);
}

/** Show name first, fall back to email, then phone, then short ID — handles phone-only accounts */
function userLabel(u: any): string {
  if (!u) return "-";
  return u.name || u.email || u.profile?.phoneNumber || String(u.id || "").slice(0, 8) || "-";
}

const PROGRESS_KIND_LABELS: Record<string, string> = {
  TASK_ACCEPTED:             "✅ Task Accepted",
  TASK_STARTED:              "🚀 Task Started",
  TASK_MARKED_DONE:          "🏁 Marked Done by Helper",
  TASK_COMPLETION_CONFIRMED: "✓ Completion Confirmed",
  TASK_CANCELLED:            "✗ Task Cancelled",
  ON_THE_WAY:                "🚗 On the Way",
  ARRIVED:                   "📍 Helper Arrived",
  WORKING:                   "🔧 Working",
  DELAYED:                   "⏱ Delayed",
  CUSTOM_NOTE:               "📝 Note",
};

export default function AdminTaskDetail() {
  const { id } = useParams();
  const taskId = id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isAdmin = hasPerm("ADMIN");

  // actions
  const [newStatus, setNewStatus] = useState<TaskStatus>("NEW");
  const [note, setNote] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [refundEscrowFlag, setRefundEscrowFlag] = useState(true);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const d = await adminGetTask(taskId);
      setData(d);

      const s = String(d?.status || "NEW").toUpperCase();
      const isKnown = STATUS_OPTIONS.some((o) => o.value === (s as any));
      setNewStatus((isKnown ? (s as TaskStatus) : "NEW") as TaskStatus);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Failed to load task");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  const paymentMode = String(data?.paymentMode || "").toUpperCase();
  const isAppPayment = paymentMode === "APP";

  const canRefundEscrow = useMemo(() => {
    const escrow = data?.escrow;
    if (!escrow) return false;
    const isHold = String(escrow.status || "").toUpperCase() === "HOLD";
    return isHold && isAppPayment;
  }, [data, isAppPayment]);

  const statusUpper = useMemo(() => String(data?.status || "").toUpperCase(), [data]);

  const canCancelTask = useMemo(() => {
    return ["NEW", "ACCEPTED", "IN_PROGRESS", "PENDING_CONSUMER_CONFIRM"].includes(statusUpper);
  }, [statusUpper]);

  const cancelDisabledReason = useMemo(() => {
    if (!data) return "";
    if (statusUpper === "CANCELLED") return "Task is already cancelled.";
    if (statusUpper === "COMPLETED")
      return "Completed tasks cannot be cancelled in MVP (would require payout reversal / dispute flow).";
    if (statusUpper === "EXPIRED") return "Expired tasks cannot be cancelled.";
    if (!canCancelTask) return `Cancel is disabled for status: ${statusUpper}`;
    return "";
  }, [data, statusUpper, canCancelTask]);

  const canShowRefundToggle = isAppPayment && canRefundEscrow;

  async function onUpdateStatus() {
    try {
      await adminUpdateTaskStatus(taskId, newStatus, note.trim() || undefined);
      await load();
      setNote("");
      alert("Status updated");
    } catch (e: any) {
      alert(e?.response?.data?.error || e?.message || "Failed to update status");
    }
  }

  async function onCancelTask() {
    const statusNow = String(data?.status || "").toUpperCase();
    const allowed = ["NEW", "ACCEPTED", "IN_PROGRESS", "PENDING_CONSUMER_CONFIRM"].includes(statusNow);
    if (!allowed) {
      alert(
        statusNow === "COMPLETED"
          ? "Completed tasks cannot be cancelled in MVP."
          : `Cancel is not allowed for status: ${statusNow}`
      );
      return;
    }

    try {
      const refund = canShowRefundToggle ? refundEscrowFlag : false;
      await adminCancelTask(taskId, cancelReason.trim() || undefined, refund);
      await load();
      alert("Task cancelled");
    } catch (e: any) {
      alert(e?.response?.data?.error || e?.message || "Failed to cancel task");
    }
  }

  async function onRefundEscrow() {
    try {
      await adminRefundEscrow(taskId, note.trim() || undefined);
      await load();
      alert("Escrow refunded");
    } catch (e: any) {
      alert(e?.response?.data?.error || e?.message || "Failed to refund escrow");
    }
  }

  if (loading) return <div style={{ padding: 20, fontFamily: "system-ui" }}>Loading…</div>;
  if (err) return <div style={{ padding: 20, fontFamily: "system-ui", color: "crimson" }}>{err}</div>;
  if (!data) return null;

  return (
    <div style={{ maxWidth: 1100, margin: "30px auto", fontFamily: "system-ui" }}>
      <div style={{ marginBottom: 12 }}>
        <Link to="/admin/tasks">← Back to Tasks</Link>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>{data.title}</h2>
        <StatusBadge status={data.status} />
        {!isAdmin ? (
          <span style={{ fontSize: 12, color: "#666" }}>· Read-only (Support)</span>
        ) : null}
      </div>

      <div style={{ color: "#555", marginBottom: 16 }}>
        Task ID: <code>{data.id}</code>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {/* Summary */}
        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Summary</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div>Status:</div>
            <StatusBadge status={data.status} />
          </div>

          <div style={{ marginTop: 6 }}>Created: {new Date(data.createdAt).toLocaleString()}</div>
          <div>Category: {data.category?.name || "-"}</div>
          <div>Payment Mode: {data.paymentMode || "-"}</div>
          <div>Cost: {data.cost ?? "-"}</div>
        </div>

        {/* People */}
        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>People</div>

          {/* Poster */}
          <div style={{ marginBottom: 8 }}>
            <span style={{ color: "#6B7280", minWidth: 60, display: "inline-block" }}>Poster:</span>{" "}
            {data.postedBy?.id ? (
              <Link to={`/admin/users/${data.postedBy.id}`} style={{ fontWeight: 700 }}>
                {userLabel(data.postedBy)}
              </Link>
            ) : (
              <span>{userLabel(data.postedBy)}</span>
            )}
            {/* show email/phone as secondary info if name is the primary */}
            {data.postedBy?.name && (data.postedBy?.email || data.postedBy?.profile?.phoneNumber) ? (
              <div style={{ fontSize: 12, color: "#6B7280", marginLeft: 64 }}>
                {data.postedBy.email || data.postedBy.profile?.phoneNumber}
                {!data.postedBy.email && data.postedBy.profile?.phoneNumber
                  ? " (phone only)" : ""}
              </div>
            ) : null}
          </div>

          {/* Helper */}
          <div>
            <span style={{ color: "#6B7280", minWidth: 60, display: "inline-block" }}>Helper:</span>{" "}
            {data.assignedTo?.id ? (
              <Link to={`/admin/users/${data.assignedTo.id}`} style={{ fontWeight: 700 }}>
                {userLabel(data.assignedTo)}
              </Link>
            ) : (
              <span style={{ color: "#6B7280" }}>Not yet assigned</span>
            )}
            {data.assignedTo?.name && (data.assignedTo?.email || data.assignedTo?.profile?.phoneNumber) ? (
              <div style={{ fontSize: 12, color: "#6B7280", marginLeft: 64 }}>
                {data.assignedTo.email || data.assignedTo.profile?.phoneNumber}
                {!data.assignedTo.email && data.assignedTo.profile?.phoneNumber
                  ? " (phone only)" : ""}
              </div>
            ) : null}
          </div>
        </div>

        {/* Escrow */}
        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Escrow</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div>Status:</div>
            <StatusBadge status={data.escrow?.status || "-"} />
          </div>
          <div style={{ marginTop: 6 }}>Amount (paise): {data.escrow?.amountPaise ?? "-"}</div>
          <div>Amount (₹): {data.escrow?.amountPaise ? moneyRs(data.escrow.amountPaise) : "-"}</div>
        </div>

        {/* Admin actions */}
        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
          {!isAdmin ? (
            <div style={{ color: "#666", fontSize: 13 }}>
              You have read-only access. Admin actions (cancel/refund/status updates) are restricted to ADMIN.
            </div>
          ) : (
            <>
              {/* Cancel */}
              <div style={{ borderTop: "1px solid #eee", paddingTop: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Cancel Task</div>

                {!canCancelTask ? (
                  <div style={{ fontSize: 12, color: "#666", marginBottom: 10 }}>
                    {cancelDisabledReason}
                  </div>
                ) : null}

                <input
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Cancel reason"
                  style={{ width: "100%", padding: 8, marginBottom: 10 }}
                  disabled={!canCancelTask}
                />

                {canShowRefundToggle ? (
                  <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
                    <input
                      type="checkbox"
                      checked={refundEscrowFlag}
                      onChange={(e) => setRefundEscrowFlag(e.target.checked)}
                    />
                    Refund escrow to consumer wallet (APP + HOLD only)
                  </label>
                ) : (
                  <div style={{ fontSize: 12, color: "#666", marginBottom: 10 }}>
                    Refund option available only when payment is <b>APP</b> and escrow is <b>HOLD</b>.
                  </div>
                )}

                <button
                  onClick={onCancelTask}
                  disabled={!canCancelTask}
                  style={{
                    padding: "8px 12px",
                    opacity: !canCancelTask ? 0.5 : 1,
                    cursor: !canCancelTask ? "not-allowed" : "pointer",
                  }}
                  title={!canCancelTask ? cancelDisabledReason : undefined}
                >
                  Cancel Task
                </button>
              </div>

              {/* Refund escrow */}
              <div style={{ borderTop: "1px solid #eee", marginTop: 14, paddingTop: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Manual Escrow Refund</div>

                <button
                  onClick={onRefundEscrow}
                  disabled={!canRefundEscrow}
                  style={{
                    padding: "8px 12px",
                    opacity: !canRefundEscrow ? 0.5 : 1,
                    cursor: !canRefundEscrow ? "not-allowed" : "pointer",
                  }}
                  title={!canRefundEscrow ? "Escrow must be APP payment and in HOLD status." : undefined}
                >
                  Refund Escrow
                </button>

                {!canRefundEscrow ? (
                  <div style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
                    Refund is enabled only when payment mode is <b>APP</b> and escrow status is <b>HOLD</b>.
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Task Progress Timeline */}
      <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14, marginTop: 10 }}>
        <div style={{ fontWeight: 800, marginBottom: 12 }}>
          Task Timeline
          {data.progressUpdates?.length > 0
            ? <span style={{ fontWeight: 400, fontSize: 13, color: "#6B7280", marginLeft: 8 }}>
                ({data.progressUpdates.length} update{data.progressUpdates.length !== 1 ? "s" : ""})
              </span>
            : null}
        </div>

        {/* Always show the creation row */}
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 10 }}>
          <div style={{
            width: 10, height: 10, borderRadius: "50%", background: "#6B7280",
            marginTop: 4, flexShrink: 0,
          }} />
          <div>
            <div style={{ fontWeight: 700 }}>📋 Task Created</div>
            <div style={{ fontSize: 12, color: "#6B7280" }}>{new Date(data.createdAt).toLocaleString()}</div>
          </div>
        </div>

        {data.progressUpdates?.length > 0 ? (
          data.progressUpdates.map((pu: any) => {
            const label = PROGRESS_KIND_LABELS[pu.kind] ?? pu.kind;
            const isCancelled = pu.kind === "TASK_CANCELLED";
            const isCompleted = pu.kind === "TASK_COMPLETION_CONFIRMED";
            const dotColor = isCancelled ? "#DC2626" : isCompleted ? "#059669" : "#2563EB";

            return (
              <div key={pu.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 10 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: "50%", background: dotColor,
                  marginTop: 4, flexShrink: 0,
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{label}</div>
                  {pu.message ? (
                    <div style={{ color: "#374151", marginTop: 2 }}>{pu.message}</div>
                  ) : null}
                  <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
                    {new Date(pu.createdAt).toLocaleString()}
                    {pu.postedBy
                      ? <span> · by <Link to={`/admin/users/${pu.postedBy.id}`}>{userLabel(pu.postedBy)}</Link></span>
                      : null}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          /* Fallback: reconstruct from task status fields when no progress records exist */
          <div style={{ color: "#6B7280", fontSize: 13, marginLeft: 22 }}>
            <div>No detailed progress updates recorded.</div>
            <div style={{ marginTop: 8, borderTop: "1px dashed #E5E7EB", paddingTop: 8 }}>
              <div style={{ fontWeight: 700, marginBottom: 6, color: "#374151" }}>Status history (inferred):</div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {data.assignedToId && (
                  <li>Accepted by helper — {new Date(data.updatedAt).toLocaleString()}</li>
                )}
                {data.status === "IN_PROGRESS" && (
                  <li>Work started — {new Date(data.updatedAt).toLocaleString()}</li>
                )}
                {data.status === "PENDING_CONSUMER_CONFIRM" && (
                  <li>Marked complete by helper — {new Date(data.updatedAt).toLocaleString()}</li>
                )}
                {data.status === "COMPLETED" && (
                  <li>Completed (confirmed by consumer) — {new Date(data.updatedAt).toLocaleString()}</li>
                )}
                {data.cancelledAt && (
                  <li>Cancelled — {new Date(data.cancelledAt).toLocaleString()}
                    {data.cancelReason ? ` · Reason: ${data.cancelReason}` : ""}
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Counter-Offers */}
      {data.counterOffers?.length > 0 ? (
        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14, marginTop: 10 }}>
          <div style={{ fontWeight: 800, marginBottom: 12 }}>
            Counter-Offers
            <span style={{ fontWeight: 400, fontSize: 13, color: "#6B7280", marginLeft: 8 }}>
              ({data.counterOffers.length})
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 120px 120px 160px", gap: 0, border: "1px solid #E5E7EB", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ padding: "8px 12px", background: "#F9FAFB", fontWeight: 800, fontSize: 12, borderBottom: "1px solid #E5E7EB" }}>Helper</div>
            <div style={{ padding: "8px 12px", background: "#F9FAFB", fontWeight: 800, fontSize: 12, borderBottom: "1px solid #E5E7EB" }}>Rate</div>
            <div style={{ padding: "8px 12px", background: "#F9FAFB", fontWeight: 800, fontSize: 12, borderBottom: "1px solid #E5E7EB" }}>Status</div>
            <div style={{ padding: "8px 12px", background: "#F9FAFB", fontWeight: 800, fontSize: 12, borderBottom: "1px solid #E5E7EB" }}>Accepted Original</div>
            <div style={{ padding: "8px 12px", background: "#F9FAFB", fontWeight: 800, fontSize: 12, borderBottom: "1px solid #E5E7EB" }}>Note / Date</div>
            {data.counterOffers.map((co: any) => {
              const statusColor = co.status === "ACCEPTED" ? "#059669" : co.status === "REJECTED" ? "#DC2626" : "#6B7280";
              return (
                <>
                  <div key={`${co.offerId}-h`} style={{ padding: "8px 12px", borderBottom: "1px solid #F3F4F6" }}>
                    <Link to={`/admin/users/${co.helper?.id}`} style={{ fontWeight: 700 }}>
                      {userLabel(co.helper)}
                    </Link>
                  </div>
                  <div style={{ padding: "8px 12px", borderBottom: "1px solid #F3F4F6", fontWeight: 700 }}>
                    {co.acceptOriginalPrice ? <span style={{ color: "#6B7280", fontSize: 12 }}>Original</span> : `₹${co.proposedRate}`}
                  </div>
                  <div style={{ padding: "8px 12px", borderBottom: "1px solid #F3F4F6", fontWeight: 700, color: statusColor }}>
                    {co.status}
                  </div>
                  <div style={{ padding: "8px 12px", borderBottom: "1px solid #F3F4F6", fontSize: 13 }}>
                    {co.acceptOriginalPrice ? "Yes" : "No"}
                  </div>
                  <div style={{ padding: "8px 12px", borderBottom: "1px solid #F3F4F6", fontSize: 12, color: "#6B7280" }}>
                    {co.note ? <div>{co.note}</div> : null}
                    <div>{new Date(co.createdAt).toLocaleString()}</div>
                  </div>
                </>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Chat */}
      {data.chatThread?.messages?.length ? (
        <div style={{ marginTop: 16, border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Latest Chat (20)</div>
          {data.chatThread.messages.map((m: any) => (
            <div key={m.id} style={{ borderTop: "1px solid #eee", paddingTop: 8, marginTop: 8 }}>
              <div style={{ fontSize: 12, color: "#666" }}>
                {m.sender?.name || "User"} · {new Date(m.createdAt).toLocaleString()}
              </div>
              <div>{m.text || "-"}</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
