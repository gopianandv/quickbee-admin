import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import StatusBadge from "@/components/ui/StatusBadge";
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

export default function AdminTaskDetail() {
    const { id } = useParams();
    const taskId = id as string;

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

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

            // Default status selection to what DB has, else NEW
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

    const canRefundEscrow = useMemo(() => {
        const escrow = data?.escrow;
        if (!escrow) return false;
        // Your service enforces HOLD + APP before refund
        return String(escrow.status || "").toUpperCase() === "HOLD";
    }, [data]);

    const isCancelled = useMemo(() => {
        return String(data?.status || "").toUpperCase() === "CANCELLED";
    }, [data]);

    const paymentMode = String(data?.paymentMode || "").toUpperCase(); // "APP" | "CASH" etc.
    const isAppPayment = paymentMode === "APP";

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
        try {
            await adminCancelTask(taskId, cancelReason.trim() || undefined, refundEscrowFlag);
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
                    <div>
                        Poster: {data.postedBy?.id ? <Link to={`/admin/users/${data.postedBy.id}`}>{data.postedBy?.email}</Link> : (data.postedBy?.email || "-")}
                    </div>
                    <div>
                        Helper: {data.assignedTo?.id ? <Link to={`/admin/users/${data.assignedTo.id}`}>{data.assignedTo?.email}</Link> : (data.assignedTo?.email || "-")}
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
                    {/* Cancel */}
                    <div style={{ borderTop: "1px solid #eee", paddingTop: 12 }}>
                        <div style={{ fontWeight: 700, marginBottom: 8 }}>Cancel Task</div>

                        <input
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            placeholder="Cancel reason"
                            style={{ width: "100%", padding: 8, marginBottom: 10 }}
                        />

                        {/* Refund toggle only makes sense for APP payments */}
                        {isAppPayment ? (
                            <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
                                <input
                                    type="checkbox"
                                    checked={refundEscrowFlag}
                                    onChange={(e) => setRefundEscrowFlag(e.target.checked)}
                                />
                                Refund escrow to consumer wallet (APP only)
                            </label>
                        ) : (
                            <div style={{ fontSize: 12, color: "#666", marginBottom: 10 }}>
                                Refund toggle hidden because payment mode is <b>{data.paymentMode || "-"}</b>.
                            </div>
                        )}

                        <button
                            onClick={onCancelTask}
                            disabled={isCancelled}
                            style={{
                                padding: "8px 12px",
                                opacity: isCancelled ? 0.5 : 1,
                                cursor: isCancelled ? "not-allowed" : "pointer",
                            }}
                        >
                            {isCancelled ? "Already Cancelled" : "Cancel Task"}
                        </button>
                    </div>

                    {/* Refund escrow */}
                    <div style={{ borderTop: "1px solid #eee", marginTop: 14, paddingTop: 12 }}>
                        <div style={{ fontWeight: 700, marginBottom: 8 }}>Manual Escrow Refund</div>

                        <button
                            onClick={onRefundEscrow}
                            disabled={!canRefundEscrow || !isAppPayment}
                            style={{
                                padding: "8px 12px",
                                opacity: !canRefundEscrow || !isAppPayment ? 0.5 : 1,
                                cursor: !canRefundEscrow || !isAppPayment ? "not-allowed" : "pointer",
                            }}
                            title={
                                !isAppPayment
                                    ? "Only APP payment escrow can be refunded."
                                    : !canRefundEscrow
                                        ? "Escrow must exist and be in HOLD status."
                                        : undefined
                            }
                        >
                            Refund Escrow
                        </button>

                        {!isAppPayment ? (
                            <div style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
                                Manual refund disabled because payment mode is not APP.
                            </div>
                        ) : !canRefundEscrow ? (
                            <div style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
                                Refund is enabled only when escrow status is <b>HOLD</b>.
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>

            {/* Lifecycle Timeline */}
            <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14, marginTop: 10 }}>
                <div style={{ fontWeight: 800, marginBottom: 10 }}>Lifecycle</div>

                <ul style={{ margin: 0, paddingLeft: 18 }}>
                    <li>Created — {new Date(data.createdAt).toLocaleString()}</li>

                    {data.assignedToId && (
                        <li>Accepted by helper — {new Date(data.updatedAt).toLocaleString()}</li>
                    )}

                    {data.status === "IN_PROGRESS" && (
                        <li>Work started — {new Date(data.updatedAt).toLocaleString()}</li>
                    )}

                    {data.status === "PENDING_CONSUMER_CONFIRM" && (
                        <li>Marked complete (helper) — {new Date(data.updatedAt).toLocaleString()}</li>
                    )}

                    {data.status === "COMPLETED" && (
                        <li>Completed (consumer) — {new Date(data.updatedAt).toLocaleString()}</li>
                    )}

                    {data.cancelledAt && (
                        <li>Cancelled — {new Date(data.cancelledAt).toLocaleString()}</li>
                    )}
                </ul>
            </div>


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
