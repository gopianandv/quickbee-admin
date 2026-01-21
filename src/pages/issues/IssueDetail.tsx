import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  addIssueComment,
  closeIssue,
  getIssueById,
  patchIssue,
  resolveIssue,
  type IssueOutcome,
  type IssueSeverity,
  type IssueStatus,
  type IssueCategory,
  type IssueReason,
} from "@/api/adminIssues";
import { getAdminTokenPayload } from "@/auth/tokenStore"; // ✅ optional helper (safe)

function box(title: string, children: any) {
  return (
    <div style={{ border: "1px solid #E5E7EB", borderRadius: 12, background: "#fff", overflow: "hidden" }}>
      <div style={{ padding: 12, background: "#F9FAFB", borderBottom: "1px solid #E5E7EB", fontWeight: 900 }}>
        {title}
      </div>
      <div style={{ padding: 12 }}>{children}</div>
    </div>
  );
}

function miniLabel(label: string, value?: any) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ color: "#6B7280", fontSize: 12, fontWeight: 800 }}>{label}</div>
      <div style={{ marginTop: 4, fontWeight: 700, color: "#111827" }}>{value ?? "-"}</div>
    </div>
  );
}

function SeverityPill({ severity }: { severity?: IssueSeverity | string | null }) {
  const s = String(severity || "MEDIUM").toUpperCase();
  const base: any = {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    border: "1px solid #E5E7EB",
    background: "#F3F4F6",
    color: "#111827",
  };
  if (s === "HIGH") return <span style={{ ...base, background: "#FEE2E2", color: "#991B1B", borderColor: "#FCA5A5" }}>HIGH</span>;
  if (s === "LOW") return <span style={{ ...base, background: "#E0F2FE", color: "#075985", borderColor: "#7DD3FC" }}>LOW</span>;
  return <span style={{ ...base, background: "#FEF3C7", color: "#92400E", borderColor: "#FCD34D" }}>MED</span>;
}

const OUTCOMES: { value: IssueOutcome; label: string; hint: string }[] = [
  { value: "NO_ACTION", label: "No action", hint: "Info only / not actionable" },
  { value: "WARNING_SENT", label: "Warning sent", hint: "Policy reminder / caution" },
  { value: "TASK_CANCELLED", label: "Task cancelled", hint: "Cancelled task using admin moderation" },
  { value: "ESCROW_REFUNDED", label: "Escrow refunded", hint: "Manual refund (HOLD only)" },
  { value: "USER_SUSPENDED", label: "User suspended", hint: "Phase-2 enforcement placeholder" },
  { value: "USER_BANNED", label: "User banned", hint: "Phase-2 enforcement placeholder" },
  { value: "OTHER", label: "Other", hint: "Custom resolution" },
];

const CATEGORY_OPTIONS: { value: IssueCategory; label: string }[] = [
  { value: "RATINGS_SAFETY", label: "Ratings safety" },
  { value: "TASK_DISPUTE", label: "Task dispute" },
  { value: "SUPPORT", label: "Support" },
];

const REASON_OPTIONS: { value: IssueReason; label: string }[] = [
  { value: "LOW_RATING_WATCHLIST", label: "Low rating watchlist" },
  { value: "MISBEHAVIOUR", label: "Misbehaviour" },
  { value: "PAYMENT_PROBLEM", label: "Payment problem" },
  { value: "OTHER", label: "Other" },
];

function prettyModeration(m: any) {
  if (!m) return null;
  const cancelled = m.cancelled ? "✅ yes" : "❌ no";
  const refunded = m.refunded ? "✅ yes" : "❌ no";
  return { cancelled, refunded, raw: m };
}

export default function IssueDetail() {
  const { id } = useParams<{ id: string }>();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [noteBody, setNoteBody] = useState("");

  // 🔥 NEW: editable category/reason state (mirrors server)
  const [editCategory, setEditCategory] = useState<IssueCategory | "">("");
  const [editReason, setEditReason] = useState<IssueReason | "">("");

  // Resolve form
  const [outcome, setOutcome] = useState<IssueOutcome>("NO_ACTION");
  const [resolutionNote, setResolutionNote] = useState("");

  const [alsoCancelTask, setAlsoCancelTask] = useState(false);
  const [alsoRefundEscrow, setAlsoRefundEscrow] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // Close form
  const [closeNote, setCloseNote] = useState("");

  const isGeneral = useMemo(() => !data?.task?.id, [data]);

  // Optional: get current admin id from token payload (so Claim can assign)
  const me = useMemo(() => {
    try {
      return getAdminTokenPayload?.(); // { userId, ... }
    } catch {
      return null;
    }
  }, []);

  async function load() {
    if (!id) return;
    setLoading(true);
    setErr(null);
    try {
      const d = await getIssueById(id);
      setData(d);

      // keep resolve state in sync
      setOutcome((d?.outcome as IssueOutcome) || "NO_ACTION");
      setResolutionNote(d?.resolutionNote || "");

      // ✅ set editable meta based on server
      setEditCategory((d?.category as IssueCategory) || "");
      setEditReason((d?.reason as IssueReason) || "");
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Failed to load issue");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const currentStatus = String(data?.status || "OPEN").toUpperCase() as IssueStatus;
  const currentSeverity = String(data?.severity || "MEDIUM").toUpperCase() as IssueSeverity;

  const canResolve = useMemo(() => ["OPEN", "IN_REVIEW"].includes(currentStatus), [currentStatus]);
  const canClose = useMemo(() => currentStatus !== "CLOSED", [currentStatus]);

  const task = data?.task || null;

  const hasTask = !!task?.id;
  const taskHasEscrowHold = String(task?.escrow?.status || "").toUpperCase() === "HOLD";
  const taskPaymentMode = String(task?.paymentMode || "").toUpperCase(); // "APP" | "CASH"
  const canRefund = hasTask && taskPaymentMode === "APP" && taskHasEscrowHold;
  const [assigneeInput, setAssigneeInput] = useState("");

  const canCancel = hasTask;

  // If cancel is checked, refund checkbox is irrelevant
  useEffect(() => {
    if (alsoCancelTask) setAlsoRefundEscrow(false);
  }, [alsoCancelTask]);

  async function quickSetStatus(next: IssueStatus) {
    if (!id) return;
    setSaving(true);
    setErr(null);
    try {
      await patchIssue(id, { status: next });
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Failed to update status");
    } finally {
      setSaving(false);
    }
  }

  async function quickSetSeverity(next: IssueSeverity) {
    if (!id) return;
    setSaving(true);
    setErr(null);
    try {
      await patchIssue(id, { severity: next });
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Failed to update severity");
    } finally {
      setSaving(false);
    }
  }

  // ✅ NEW: update meta (category/reason) safely
  async function updateMeta(next: Partial<{ category: IssueCategory | null; reason: IssueReason | null }>) {
    if (!id) return;
    setSaving(true);
    setErr(null);
    try {
      await patchIssue(id, next);
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Failed to update issue");
    } finally {
      setSaving(false);
    }
  }

  async function claim() {
    if (!id) return;
    setSaving(true);
    setErr(null);
    try {
      const myId = (me as any)?.userId || (me as any)?.id;
      await patchIssue(id, {
        status: "IN_REVIEW",
        ...(myId ? { assignedToUserId: myId } : {}),
      });
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Failed to claim");
    } finally {
      setSaving(false);
    }
  }

  // add near other state


  // helper
  async function setAssignee(nextUserId: string | null) {
    if (!id) return;
    setSaving(true);
    setErr(null);
    try {
      await patchIssue(id, { assignedToUserId: nextUserId });
      setAssigneeInput("");
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Failed to update assignee");
    } finally {
      setSaving(false);
    }
  }


  async function addNote() {
    if (!id) return;
    const body = noteBody.trim();
    if (body.length < 2) return;
    setSaving(true);
    setErr(null);
    try {
      await addIssueComment(id, body);
      setNoteBody("");
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Failed to add note");
    } finally {
      setSaving(false);
    }
  }

  async function doResolve() {
    if (!id) return;
    setSaving(true);
    setErr(null);
    try {
      const payload = {
        outcome,
        resolutionNote: resolutionNote.trim(),
        alsoCancelTask: alsoCancelTask && canCancel,
        alsoRefundEscrow: alsoRefundEscrow && canRefund,
        cancelReason: (cancelReason || resolutionNote).trim() || undefined,
      };

      if (!payload.resolutionNote || payload.resolutionNote.length < 10) {
        setErr("Resolution note must be at least 10 characters.");
        setSaving(false);
        return;
      }

      const res = await resolveIssue(id, payload);

      if (res?.moderation) {
        setData((prev: any) => ({ ...prev, _moderationResult: res.moderation }));
      }

      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Failed to resolve issue");
    } finally {
      setSaving(false);
    }
  }

  async function doClose() {
    if (!id) return;
    const note = closeNote.trim();
    if (note.length < 3) {
      setErr("Please add a short closing note (min 3 chars).");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      await closeIssue(id, note);
      setCloseNote("");
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Failed to close issue");
    } finally {
      setSaving(false);
    }
  }

  const comments = Array.isArray(data?.comments) ? data.comments : [];
  const moderationPretty = prettyModeration(data?._moderationResult);

  return (
    <div style={{ maxWidth: 1200, margin: "30px auto", fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <h2 style={{ margin: 0 }}>Issue</h2>
            <span style={{ color: "#6B7280", fontWeight: 800 }}>{id}</span>
            <StatusBadge status={currentStatus as any} />
            <SeverityPill severity={currentSeverity} />
            {isGeneral ? (
              <span style={{ color: "#6B7280", fontWeight: 800 }}>General report</span>
            ) : (
              <span style={{ color: "#6B7280", fontWeight: 800 }}>Task-linked</span>
            )}
          </div>

          <div style={{ marginTop: 8, color: "#6B7280" }}>
            Created:{" "}
            <b style={{ color: "#111827" }}>
              {data?.createdAt ? new Date(data.createdAt).toLocaleString() : "-"}
            </b>
            {data?.updatedAt ? (
              <>
                {" "}
                • Updated: <b style={{ color: "#111827" }}>{new Date(data.updatedAt).toLocaleString()}</b>
              </>
            ) : null}
          </div>

          {/* ✅ NEW: assignment line */}
          <div style={{ marginTop: 6, color: "#6B7280" }}>
            Assigned to:{" "}
            <b style={{ color: "#111827" }}>
              {data?.assignedTo?.name || data?.assignedToUserId || "Unassigned"}
            </b>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={load}
            disabled={loading || saving}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #E5E7EB",
              background: "#fff",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {err ? <div style={{ color: "crimson", marginTop: 12 }}>{err}</div> : null}
      {loading ? <div style={{ marginTop: 12 }}>Loading…</div> : null}

      {!loading && data ? (
        <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 14, marginTop: 14 }}>
          {/* LEFT */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {box(
              "Issue details",
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    {/* ✅ NEW: editable category */}
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ color: "#6B7280", fontSize: 12, fontWeight: 800 }}>Category</div>
                      <select
                        value={editCategory || ""}
                        disabled={saving}
                        onChange={async (e) => {
                          const v = e.target.value as IssueCategory;
                          setEditCategory(v);
                          await updateMeta({ category: v });
                        }}
                        style={{
                          marginTop: 6,
                          width: "100%",
                          padding: 10,
                          borderRadius: 10,
                          border: "1px solid #E5E7EB",
                          background: "#fff",
                          fontWeight: 800,
                        }}
                      >
                        <option value="" disabled>
                          Select category…
                        </option>
                        {CATEGORY_OPTIONS.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* ✅ NEW: editable reason */}
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ color: "#6B7280", fontSize: 12, fontWeight: 800 }}>Reason</div>
                      <select
                        value={editReason || ""}
                        disabled={saving}
                        onChange={async (e) => {
                          const v = e.target.value as IssueReason;
                          setEditReason(v);
                          await updateMeta({ reason: v });
                        }}
                        style={{
                          marginTop: 6,
                          width: "100%",
                          padding: 10,
                          borderRadius: 10,
                          border: "1px solid #E5E7EB",
                          background: "#fff",
                          fontWeight: 800,
                        }}
                      >
                        <option value="" disabled>
                          Select reason…
                        </option>
                        {REASON_OPTIONS.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    {miniLabel("Status", <StatusBadge status={currentStatus as any} />)}
                    {miniLabel("Severity", <SeverityPill severity={currentSeverity} />)}
                  </div>
                </div>

                <div style={{ marginTop: 10 }}>
                  <div style={{ color: "#6B7280", fontSize: 12, fontWeight: 800 }}>User note</div>
                  <div
                    style={{
                      marginTop: 6,
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.4,
                      color: "#111827",
                      fontWeight: 600,
                    }}
                  >
                    {data?.note || "(No note provided)"}
                  </div>
                </div>
              </div>
            )}

            {box(
              "Task context",
              task ? (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 900,
                          color: "#111827",
                          fontSize: 16,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {task.title || "Task"}
                      </div>
                      <div style={{ marginTop: 6, color: "#6B7280", fontWeight: 700 }}>
                        Task ID:{" "}
                        <Link to={`/admin/tasks/${task.id}`} style={{ fontWeight: 900 }}>
                          {task.id}
                        </Link>
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ color: "#6B7280", fontSize: 12, fontWeight: 900 }}>Task status</div>
                      <div style={{ marginTop: 4, fontWeight: 900 }}>{task.status || "-"}</div>
                      <div style={{ marginTop: 10, color: "#6B7280", fontSize: 12, fontWeight: 900 }}>Payment</div>
                      <div style={{ marginTop: 4, fontWeight: 900 }}>
                        {String(task.paymentMode || "-").toUpperCase()}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 12 }}>
                    <div style={{ border: "1px solid #E5E7EB", borderRadius: 12, padding: 10 }}>
                      <div style={{ color: "#6B7280", fontSize: 12, fontWeight: 900 }}>Escrow</div>
                      <div style={{ marginTop: 6, fontWeight: 900 }}>
                        {task.escrow
                          ? `${task.escrow.status} • ₹${(task.escrow.amountPaise || 0) / 100}`
                          : "—"}
                      </div>
                      <div style={{ marginTop: 8, color: "#6B7280", fontSize: 12 }}>
                        Refund possible:{" "}
                        <b style={{ color: canRefund ? "#065F46" : "#991B1B" }}>{canRefund ? "YES" : "NO"}</b>
                      </div>
                    </div>

                    <div style={{ border: "1px solid #E5E7EB", borderRadius: 12, padding: 10 }}>
                      <div style={{ color: "#6B7280", fontSize: 12, fontWeight: 900 }}>Posted by</div>
                      <div style={{ marginTop: 6, fontWeight: 900 }}>
                        {task.postedBy?.id ? (
                          <Link to={`/admin/users/${task.postedBy.id}`}>{task.postedBy.name || "User"}</Link>
                        ) : task.postedById ? (
                          <Link to={`/admin/users/${task.postedById}`}>{task.postedById}</Link>
                        ) : (
                          "—"
                        )}
                      </div>
                      <div style={{ marginTop: 4, color: "#6B7280", fontSize: 12 }}>
                        {task.postedBy?.email || ""}
                      </div>
                    </div>

                    <div style={{ border: "1px solid #E5E7EB", borderRadius: 12, padding: 10 }}>
                      <div style={{ color: "#6B7280", fontSize: 12, fontWeight: 900 }}>Assigned to</div>
                      <div style={{ marginTop: 6, fontWeight: 900 }}>
                        {task.assignedTo?.id ? (
                          <Link to={`/admin/users/${task.assignedTo.id}`}>{task.assignedTo.name || "User"}</Link>
                        ) : task.assignedToId ? (
                          <Link to={`/admin/users/${task.assignedToId}`}>{task.assignedToId}</Link>
                        ) : (
                          "—"
                        )}
                      </div>
                      <div style={{ marginTop: 4, color: "#6B7280", fontSize: 12 }}>
                        {task.assignedTo?.email || ""}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ color: "#6B7280" }}>This issue is not linked to a task. (General report)</div>
              )
            )}

            {box(
              "People",
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ border: "1px solid #E5E7EB", borderRadius: 12, padding: 12 }}>
                  <div style={{ color: "#6B7280", fontSize: 12, fontWeight: 900 }}>Reporter</div>
                  <div style={{ marginTop: 6, fontWeight: 900, fontSize: 15 }}>
                    {data?.reporter?.id ? (
                      <Link to={`/admin/users/${data.reporter.id}`}>{data.reporter.name || "User"}</Link>
                    ) : (
                      data?.reporter?.name || "—"
                    )}
                  </div>
                  <div style={{ marginTop: 6, color: "#6B7280", fontWeight: 700 }}>{data?.reporter?.email || ""}</div>
                </div>

                <div style={{ border: "1px solid #E5E7EB", borderRadius: 12, padding: 12 }}>
                  <div style={{ color: "#6B7280", fontSize: 12, fontWeight: 900 }}>Reported user</div>
                  {data?.reportedUser?.id ? (
                    <>
                      <div style={{ marginTop: 6, fontWeight: 900, fontSize: 15 }}>
                        <Link to={`/admin/users/${data.reportedUser.id}`}>{data.reportedUser.name || "User"}</Link>
                      </div>
                      <div style={{ marginTop: 6, color: "#6B7280", fontWeight: 700 }}>{data.reportedUser.email || ""}</div>
                    </>
                  ) : (
                    <div style={{ marginTop: 6, color: "#6B7280" }}>{isGeneral ? "Not applicable (general report)" : "Not captured"}</div>
                  )}
                </div>
              </div>
            )}

            {box(
              "Internal notes",
              <div>
                <div style={{ display: "flex", gap: 10 }}>
                  <textarea
                    value={noteBody}
                    onChange={(e) => setNoteBody(e.target.value)}
                    placeholder="Add an internal note…"
                    rows={3}
                    style={{
                      flex: 1,
                      padding: 10,
                      borderRadius: 12,
                      border: "1px solid #E5E7EB",
                      resize: "vertical",
                      fontFamily: "system-ui",
                    }}
                  />
                  <button
                    onClick={addNote}
                    disabled={saving || noteBody.trim().length < 2}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: "1px solid #111827",
                      background: "#111827",
                      color: "#fff",
                      fontWeight: 900,
                      cursor: "pointer",
                      height: 44,
                      alignSelf: "flex-start",
                    }}
                  >
                    Add
                  </button>
                </div>

                <div style={{ marginTop: 12 }}>
                  {comments.length === 0 ? (
                    <div style={{ color: "#6B7280" }}>No internal notes yet.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {comments.map((c: any) => (
                        <div key={c.id} style={{ border: "1px solid #E5E7EB", borderRadius: 12, padding: 10 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                            <div style={{ fontWeight: 900, color: "#111827" }}>
                              {c.actor?.name || "Admin"}
                              <span style={{ color: "#6B7280", fontWeight: 800, marginLeft: 8 }}>{c.kind || "NOTE"}</span>
                            </div>
                            <div style={{ color: "#6B7280", fontWeight: 800, fontSize: 12 }}>
                              {c.createdAt ? new Date(c.createdAt).toLocaleString() : ""}
                            </div>
                          </div>
                          <div style={{ marginTop: 8, whiteSpace: "pre-wrap", lineHeight: 1.4, color: "#111827", fontWeight: 600 }}>
                            {c.body}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {box(
              "Quick actions",
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    onClick={() => quickSetStatus("OPEN")}
                    disabled={saving || currentStatus === "OPEN"}
                    style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #E5E7EB", background: "#fff", cursor: "pointer", fontWeight: 900 }}
                  >
                    Set OPEN
                  </button>
                  <button
                    onClick={() => quickSetStatus("IN_REVIEW")}
                    disabled={saving || currentStatus === "IN_REVIEW"}
                    style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #E5E7EB", background: "#fff", cursor: "pointer", fontWeight: 900 }}
                  >
                    Set IN_REVIEW
                  </button>
                  <button
                    onClick={claim}
                    disabled={saving}
                    style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #111827", background: "#111827", color: "#fff", cursor: "pointer", fontWeight: 900 }}
                    title="Assign to me and move to IN_REVIEW"
                  >
                    Claim
                  </button>
                </div>

                <div style={{ borderTop: "1px solid #E5E7EB", marginTop: 8, paddingTop: 10 }}>
                  <div style={{ color: "#6B7280", fontSize: 12, fontWeight: 900, marginBottom: 8 }}>
                    Assignment
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                      onClick={async () => {
                        // "Claim" already assigns to me; keep it.
                        await claim();
                      }}
                      disabled={saving}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid #111827",
                        background: "#111827",
                        color: "#fff",
                        cursor: "pointer",
                        fontWeight: 900,
                      }}
                    >
                      Claim
                    </button>

                    <button
                      onClick={() => setAssignee(null)}
                      disabled={saving}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid #E5E7EB",
                        background: "#fff",
                        cursor: "pointer",
                        fontWeight: 900,
                      }}
                      title="Remove assignment"
                    >
                      Unassign
                    </button>
                  </div>

                  <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                    <input
                      value={assigneeInput}
                      onChange={(e) => setAssigneeInput(e.target.value)}
                      placeholder="Reassign to userId (UUID)…"
                      style={{
                        flex: 1,
                        padding: 10,
                        borderRadius: 10,
                        border: "1px solid #E5E7EB",
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                      }}
                      disabled={saving}
                    />

                    <button
                      onClick={() => {
                        const v = assigneeInput.trim();
                        if (!v) return;
                        setAssignee(v);
                      }}
                      disabled={saving || assigneeInput.trim().length < 10}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid #111827",
                        background: assigneeInput.trim().length < 10 ? "#F3F4F6" : "#111827",
                        color: assigneeInput.trim().length < 10 ? "#6B7280" : "#fff",
                        cursor: assigneeInput.trim().length < 10 ? "not-allowed" : "pointer",
                        fontWeight: 900,
                        whiteSpace: "nowrap",
                      }}
                      title="Paste an admin/support user's UUID"
                    >
                      Reassign
                    </button>
                  </div>

                  <div style={{ marginTop: 8, color: "#6B7280", fontSize: 12 }}>
                    Tip: copy the target admin/support userId from <b>Admin → Users</b> page.
                  </div>
                </div>


                <div style={{ borderTop: "1px solid #E5E7EB", marginTop: 8, paddingTop: 10 }}>
                  <div style={{ color: "#6B7280", fontSize: 12, fontWeight: 900, marginBottom: 8 }}>Severity</div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                      onClick={() => quickSetSeverity("LOW")}
                      disabled={saving || currentSeverity === "LOW"}
                      style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #E5E7EB", background: "#fff", cursor: "pointer", fontWeight: 900 }}
                    >
                      LOW
                    </button>
                    <button
                      onClick={() => quickSetSeverity("MEDIUM")}
                      disabled={saving || currentSeverity === "MEDIUM"}
                      style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #E5E7EB", background: "#fff", cursor: "pointer", fontWeight: 900 }}
                    >
                      MED
                    </button>
                    <button
                      onClick={() => quickSetSeverity("HIGH")}
                      disabled={saving || currentSeverity === "HIGH"}
                      style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #E5E7EB", background: "#fff", cursor: "pointer", fontWeight: 900 }}
                    >
                      HIGH
                    </button>
                  </div>
                </div>
              </div>
            )}

            {box(
              "Resolve",
              <div>
                <div style={{ color: "#6B7280", fontSize: 12, fontWeight: 900, marginBottom: 6 }}>Outcome</div>
                <select
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value as any)}
                  style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #E5E7EB", background: "#fff", fontWeight: 800 }}
                  disabled={!canResolve || saving}
                >
                  {OUTCOMES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <div style={{ marginTop: 6, color: "#6B7280", fontSize: 12 }}>{OUTCOMES.find((o) => o.value === outcome)?.hint || ""}</div>

                <div style={{ marginTop: 12, color: "#6B7280", fontSize: 12, fontWeight: 900 }}>Resolution note (internal)</div>
                <textarea
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  rows={5}
                  placeholder="What did we verify? What action was taken?"
                  style={{ width: "100%", padding: 10, borderRadius: 12, border: "1px solid #E5E7EB", resize: "vertical", fontFamily: "system-ui" }}
                  disabled={!canResolve || saving}
                />

                <div style={{ marginTop: 12, borderTop: "1px solid #E5E7EB", paddingTop: 12 }}>
                  <div style={{ fontWeight: 900, marginBottom: 8 }}>Optional moderation</div>

                  <label style={{ display: "flex", alignItems: "center", gap: 10, opacity: canCancel ? 1 : 0.5 }}>
                    <input
                      type="checkbox"
                      checked={alsoCancelTask}
                      onChange={(e) => setAlsoCancelTask(e.target.checked)}
                      disabled={!canResolve || saving || !canCancel}
                    />
                    Cancel task (uses admin cancel guards)
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, opacity: canRefund && !alsoCancelTask ? 1 : 0.5 }}>
                    <input
                      type="checkbox"
                      checked={alsoRefundEscrow}
                      onChange={(e) => setAlsoRefundEscrow(e.target.checked)}
                      disabled={!canResolve || saving || !canRefund || alsoCancelTask}
                    />
                    Refund escrow (APP + HOLD only)
                  </label>

                  {!canRefund && hasTask ? (
                    <div style={{ marginTop: 8, color: "#6B7280", fontSize: 12 }}>
                      Refund is only possible for <b>APP</b> tasks when escrow is in <b>HOLD</b>.
                    </div>
                  ) : null}

                  {alsoCancelTask || alsoRefundEscrow ? (
                    <>
                      <div style={{ marginTop: 10, color: "#6B7280", fontSize: 12, fontWeight: 900 }}>Memo / cancel reason</div>
                      <input
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        placeholder="Short reason shown in wallet memo / audit logs"
                        style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #E5E7EB" }}
                        disabled={!canResolve || saving}
                      />
                    </>
                  ) : null}
                </div>

                <button
                  onClick={doResolve}
                  disabled={saving || !canResolve}
                  style={{
                    marginTop: 14,
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: "1px solid #111827",
                    background: canResolve ? "#111827" : "#9CA3AF",
                    color: "#fff",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  Resolve
                </button>

                {moderationPretty ? (
                  <div style={{ marginTop: 12, border: "1px solid #E5E7EB", borderRadius: 12, padding: 10 }}>
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>Moderation result</div>
                    <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                      <div>
                        <b>Cancelled:</b> {moderationPretty.cancelled}
                      </div>
                      <div>
                        <b>Refunded:</b> {moderationPretty.refunded}
                      </div>
                    </div>
                    <pre style={{ margin: 0, fontSize: 12, whiteSpace: "pre-wrap" }}>{JSON.stringify(moderationPretty.raw, null, 2)}</pre>
                  </div>
                ) : null}
              </div>
            )}

            {box(
              "Close",
              <div>
                <div style={{ color: "#6B7280", fontSize: 12, fontWeight: 900 }}>Closing note</div>
                <textarea
                  value={closeNote}
                  onChange={(e) => setCloseNote(e.target.value)}
                  rows={3}
                  placeholder="Why are we closing this issue?"
                  style={{ width: "100%", padding: 10, borderRadius: 12, border: "1px solid #E5E7EB", resize: "vertical", fontFamily: "system-ui" }}
                  disabled={!canClose || saving}
                />

                <button
                  onClick={doClose}
                  disabled={saving || !canClose}
                  style={{
                    marginTop: 10,
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: "1px solid #E5E7EB",
                    background: "#fff",
                    color: "#111827",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  Close issue
                </button>
              </div>
            )}

            {box(
              "Resolution metadata",
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                {miniLabel("Resolved at", data?.resolvedAt ? new Date(data.resolvedAt).toLocaleString() : "—")}
                {miniLabel("Outcome", data?.outcome || "—")}
                {miniLabel("Resolved by", data?.resolvedBy?.name || data?.resolvedByUserId || "—")}
                {miniLabel("Closed at", data?.closedAt ? new Date(data.closedAt).toLocaleString() : "—")}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
