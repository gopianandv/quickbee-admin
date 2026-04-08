import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  RefreshCw, User, CheckCircle, AlertTriangle, Search,
  MessageSquare, FileText, Users,
} from "lucide-react";
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
import { getAdminTokenPayload } from "@/auth/tokenStore";
import { getAssignableUsers, type AssignableUser } from "@/api/adminUsers";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { ErrorMessage } from "@/components/ui/ErrorMessage";

/* ── static option lists ─────────────────────────────────────────── */
const OUTCOMES: { value: IssueOutcome; label: string; hint: string }[] = [
  { value: "NO_ACTION",       label: "No action",        hint: "Info only / not actionable"              },
  { value: "WARNING_SENT",    label: "Warning sent",     hint: "Policy reminder / caution"               },
  { value: "TASK_CANCELLED",  label: "Task cancelled",   hint: "Cancelled task using admin moderation"   },
  { value: "ESCROW_REFUNDED", label: "Escrow refunded",  hint: "Manual refund (HOLD only)"               },
  { value: "USER_SUSPENDED",  label: "User suspended",   hint: "Phase-2 enforcement placeholder"         },
  { value: "USER_BANNED",     label: "User banned",      hint: "Phase-2 enforcement placeholder"         },
  { value: "OTHER",           label: "Other",            hint: "Custom resolution"                       },
];

const CATEGORY_OPTIONS: { value: IssueCategory; label: string }[] = [
  { value: "RATINGS_SAFETY", label: "Ratings safety" },
  { value: "TASK_DISPUTE",   label: "Task dispute"   },
  { value: "SUPPORT",        label: "Support"        },
];

const REASON_OPTIONS: { value: IssueReason; label: string }[] = [
  { value: "LOW_RATING_WATCHLIST", label: "Low rating watchlist" },
  { value: "MISBEHAVIOUR",         label: "Misbehaviour"         },
  { value: "PAYMENT_PROBLEM",      label: "Payment problem"      },
  { value: "OTHER",                label: "Other"                },
];

/* ── sub-components ──────────────────────────────────────────────── */
function SeverityBadge({ severity }: { severity?: IssueSeverity | string | null }) {
  const s = String(severity || "MEDIUM").toUpperCase();
  if (s === "HIGH") return <Badge variant="danger">HIGH</Badge>;
  if (s === "LOW")  return <Badge variant="info">LOW</Badge>;
  return <Badge variant="warning">MED</Badge>;
}

function FieldLabel({ label }: { label: string }) {
  return <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">{label}</div>;
}

function InfoBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <FieldLabel label={label} />
      <div className="text-sm font-semibold text-gray-800">{children}</div>
    </div>
  );
}

const selectCls = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30 disabled:opacity-50 disabled:cursor-not-allowed";
const textareaCls = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30 resize-y disabled:opacity-50";

/* ── main component ──────────────────────────────────────────────── */
export default function IssueDetail() {
  const { id } = useParams<{ id: string }>();

  const [data,    setData]    = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState<string | null>(null);
  const [saving,  setSaving]  = useState(false);

  const [noteBody,      setNoteBody]      = useState("");
  const [editCategory,  setEditCategory]  = useState<IssueCategory | "">("");
  const [editReason,    setEditReason]    = useState<IssueReason | "">("");
  const [outcome,       setOutcome]       = useState<IssueOutcome>("NO_ACTION");
  const [resolutionNote,setResolutionNote]= useState("");
  const [alsoCancelTask,  setAlsoCancelTask]   = useState(false);
  const [alsoRefundEscrow,setAlsoRefundEscrow] = useState(false);
  const [cancelReason,  setCancelReason]  = useState("");
  const [closeNote,     setCloseNote]     = useState("");

  const [assigneeQuery,   setAssigneeQuery]   = useState("");
  const [assigneeResults, setAssigneeResults] = useState<AssignableUser[]>([]);
  const [assigneeLoading, setAssigneeLoading] = useState(false);

  const me = useMemo(() => {
    try { return getAdminTokenPayload?.(); } catch { return null; }
  }, []);

  async function load() {
    if (!id) return;
    setLoading(true); setErr(null);
    try {
      const d = await getIssueById(id);
      setData(d);
      setOutcome((d?.outcome as IssueOutcome) || "NO_ACTION");
      setResolutionNote(d?.resolutionNote || "");
      setEditCategory((d?.category as IssueCategory) || "");
      setEditReason((d?.reason as IssueReason) || "");
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? (e as { message?: string })?.message ?? "Failed to load issue");
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentStatus   = String(data?.status   || "OPEN").toUpperCase()   as IssueStatus;
  const currentSeverity = String(data?.severity  || "MEDIUM").toUpperCase() as IssueSeverity;

  const contextKind = useMemo(() => {
    const hasTask        = !!(data?.taskId || data?.task?.id);
    const hasReportedUser= !!(data?.reportedUserId || data?.reportedUser?.id);
    if (hasTask)         return "TASK";
    if (hasReportedUser) return "HELPER";
    return "GENERAL";
  }, [data]);

  const contextLabel = contextKind === "TASK" ? "Task-linked" : contextKind === "HELPER" ? "Helper-linked" : "General report";

  const canResolve = useMemo(() => ["OPEN", "IN_REVIEW"].includes(currentStatus), [currentStatus]);
  const canClose   = useMemo(() => currentStatus !== "CLOSED",                    [currentStatus]);

  const task             = data?.task || null;
  const hasTask          = !!task?.id;
  const taskHasEscrowHold = String(task?.escrow?.status || "").toUpperCase() === "HOLD";
  const taskPaymentMode  = String(task?.paymentMode || "").toUpperCase();
  const canRefund        = hasTask && taskPaymentMode === "APP" && taskHasEscrowHold;
  const canCancel        = hasTask;

  useEffect(() => { if (alsoCancelTask) setAlsoRefundEscrow(false); }, [alsoCancelTask]);

  const comments          = Array.isArray(data?.comments) ? data.comments : [];
  const moderationResult  = data?._moderationResult ?? null;

  /* actions */
  async function quickSetStatus(next: IssueStatus) {
    if (!id) return;
    setSaving(true); setErr(null);
    try { await patchIssue(id, { status: next }); await load(); }
    catch (e: unknown) { setErr((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? (e as { message?: string })?.message ?? "Failed"); }
    finally { setSaving(false); }
  }

  async function quickSetSeverity(next: IssueSeverity) {
    if (!id) return;
    setSaving(true); setErr(null);
    try { await patchIssue(id, { severity: next }); await load(); }
    catch (e: unknown) { setErr((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? (e as { message?: string })?.message ?? "Failed"); }
    finally { setSaving(false); }
  }

  async function updateMeta(next: Partial<{ category: IssueCategory | null; reason: IssueReason | null }>) {
    if (!id) return;
    setSaving(true); setErr(null);
    try { await patchIssue(id, next); await load(); }
    catch (e: unknown) { setErr((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? (e as { message?: string })?.message ?? "Failed"); }
    finally { setSaving(false); }
  }

  async function claim() {
    if (!id) return;
    setSaving(true); setErr(null);
    try {
      const myId = (me as any)?.userId || (me as any)?.id;
      await patchIssue(id, { status: "IN_REVIEW", ...(myId ? { assignedToUserId: myId } : {}) });
      await load();
    } catch (e: unknown) { setErr((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? (e as { message?: string })?.message ?? "Failed"); }
    finally { setSaving(false); }
  }

  async function setAssignee(nextUserId: string | null) {
    if (!id) return;
    setSaving(true); setErr(null);
    try { await patchIssue(id, { assignedToUserId: nextUserId }); setAssigneeQuery(""); setAssigneeResults([]); await load(); }
    catch (e: unknown) { setErr((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? (e as { message?: string })?.message ?? "Failed"); }
    finally { setSaving(false); }
  }

  async function searchAssignees() {
    const q = assigneeQuery.trim();
    if (q.length < 2) return;
    setAssigneeLoading(true);
    try { setAssigneeResults((await getAssignableUsers({ q, limit: 20 })) || []); }
    catch (e: unknown) { setErr((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? (e as { message?: string })?.message ?? "Failed to search"); }
    finally { setAssigneeLoading(false); }
  }

  async function addNote() {
    if (!id) return;
    const body = noteBody.trim();
    if (body.length < 2) return;
    setSaving(true); setErr(null);
    try { await addIssueComment(id, body); setNoteBody(""); await load(); }
    catch (e: unknown) { setErr((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? (e as { message?: string })?.message ?? "Failed"); }
    finally { setSaving(false); }
  }

  async function doResolve() {
    if (!id) return;
    if (!resolutionNote.trim() || resolutionNote.trim().length < 10) {
      setErr("Resolution note must be at least 10 characters."); return;
    }
    setSaving(true); setErr(null);
    try {
      const res = await resolveIssue(id, {
        outcome,
        resolutionNote: resolutionNote.trim(),
        alsoCancelTask:  alsoCancelTask  && canCancel,
        alsoRefundEscrow:alsoRefundEscrow&& canRefund,
        cancelReason: (cancelReason || resolutionNote).trim() || undefined,
      });
      if (res?.moderation) setData((prev: any) => ({ ...prev, _moderationResult: res.moderation }));
      await load();
    } catch (e: unknown) { setErr((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? (e as { message?: string })?.message ?? "Failed"); }
    finally { setSaving(false); }
  }

  async function doClose() {
    if (!id) return;
    const note = closeNote.trim();
    if (note.length < 3) { setErr("Please add a short closing note (min 3 chars)."); return; }
    setSaving(true); setErr(null);
    try { await closeIssue(id, note); setCloseNote(""); await load(); }
    catch (e: unknown) { setErr((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? (e as { message?: string })?.message ?? "Failed"); }
    finally { setSaving(false); }
  }

  /* ── render ──────────────────────────────────────────────────────── */
  return (
    <div>
      <PageHeader
        title="Issue"
        breadcrumbs={[
          { label: "Issues", to: "/admin/issues" },
          { label: id ?? "…" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={currentStatus as any} />
            <SeverityBadge severity={currentSeverity} />
            <Badge variant="default">{contextLabel}</Badge>
            <Button variant="secondary" size="sm" onClick={load} disabled={loading || saving}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        }
      />

      {data && (
        <div className="mb-3 text-sm text-gray-500 flex flex-wrap gap-4">
          <span>Created: <span className="font-semibold text-gray-700">{new Date(data.createdAt).toLocaleString()}</span></span>
          {data.updatedAt && <span>Updated: <span className="font-semibold text-gray-700">{new Date(data.updatedAt).toLocaleString()}</span></span>}
          <span>Assigned to: <span className="font-semibold text-gray-700">{data.assignedTo?.name || data.assignedToUserId || "Unassigned"}</span></span>
        </div>
      )}

      <ErrorMessage message={err} className="mb-4" />

      {!loading && data && (
        <div className="grid grid-cols-1 xl:grid-cols-[1.7fr_1fr] gap-4">
          {/* ── LEFT COLUMN ─────────────────────────────────────────── */}
          <div className="flex flex-col gap-4">

            {/* Issue details */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-gray-400" /> Issue Details</div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="mb-4">
                      <FieldLabel label="Category" />
                      <select
                        value={editCategory || ""}
                        disabled={saving}
                        onChange={async (e) => {
                          const v = e.target.value as IssueCategory;
                          setEditCategory(v);
                          await updateMeta({ category: v });
                        }}
                        className={selectCls}
                      >
                        <option value="" disabled>Select category…</option>
                        {CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <FieldLabel label="Reason" />
                      <select
                        value={editReason || ""}
                        disabled={saving}
                        onChange={async (e) => {
                          const v = e.target.value as IssueReason;
                          setEditReason(v);
                          await updateMeta({ reason: v });
                        }}
                        className={selectCls}
                      >
                        <option value="" disabled>Select reason…</option>
                        {REASON_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <InfoBlock label="Status"><StatusBadge status={currentStatus as any} /></InfoBlock>
                    <InfoBlock label="Severity"><SeverityBadge severity={currentSeverity} /></InfoBlock>
                  </div>
                </div>
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <FieldLabel label="User note" />
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{data?.note || "(No note provided)"}</p>
                </div>
              </CardContent>
            </Card>

            {/* Task context */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-gray-400" /> Task Context</div>
              </CardHeader>
              <CardContent>
                {task ? (
                  <div>
                    <div className="flex justify-between gap-4 mb-4">
                      <div className="min-w-0">
                        <p className="text-base font-bold text-gray-900 truncate">{task.title || "Task"}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Task ID:{" "}
                          <Link to={`/admin/tasks/${task.id}`} className="font-semibold text-blue-600 hover:underline">{task.id}</Link>
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <FieldLabel label="Task status" />
                        <Badge variant="default">{task.status || "—"}</Badge>
                        <div className="mt-2">
                          <FieldLabel label="Payment" />
                          <Badge variant="default">{String(task.paymentMode || "—").toUpperCase()}</Badge>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                        <FieldLabel label="Escrow" />
                        <p className="text-sm font-bold text-gray-800">
                          {task.escrow ? `${task.escrow.status} · ₹${(task.escrow.amountPaise || 0) / 100}` : "—"}
                        </p>
                        <p className="text-xs mt-1">
                          Refund:{" "}
                          <span className={`font-bold ${canRefund ? "text-green-600" : "text-red-500"}`}>{canRefund ? "YES" : "NO"}</span>
                        </p>
                      </div>

                      <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                        <FieldLabel label="Posted by" />
                        {task.postedBy?.id
                          ? <Link to={`/admin/users/${task.postedBy.id}`} className="text-sm font-bold text-blue-600 hover:underline">{task.postedBy.name || "User"}</Link>
                          : task.postedById
                          ? <Link to={`/admin/users/${task.postedById}`} className="text-sm font-bold text-blue-600 hover:underline">{task.postedById}</Link>
                          : <span className="text-sm text-gray-400">—</span>
                        }
                        {task.postedBy?.email && <p className="text-xs text-gray-400 mt-1">{task.postedBy.email}</p>}
                      </div>

                      <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                        <FieldLabel label="Assigned to" />
                        {task.assignedTo?.id
                          ? <Link to={`/admin/users/${task.assignedTo.id}`} className="text-sm font-bold text-blue-600 hover:underline">{task.assignedTo.name || "User"}</Link>
                          : task.assignedToId
                          ? <Link to={`/admin/users/${task.assignedToId}`} className="text-sm font-bold text-blue-600 hover:underline">{task.assignedToId}</Link>
                          : <span className="text-sm text-gray-400">—</span>
                        }
                        {task.assignedTo?.email && <p className="text-xs text-gray-400 mt-1">{task.assignedTo.email}</p>}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">
                    {contextKind === "HELPER"
                      ? "This issue is linked to a helper profile (not a task)."
                      : "This issue is not linked to a task. (General report)"}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* People */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2"><Users className="h-4 w-4 text-gray-400" /> People</div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <FieldLabel label="Reporter" />
                    {data?.reporter?.id
                      ? <Link to={`/admin/users/${data.reporter.id}`} className="text-base font-bold text-blue-600 hover:underline">{data.reporter.name || "User"}</Link>
                      : <span className="text-base font-bold text-gray-800">{data?.reporter?.name || "—"}</span>
                    }
                    {data?.reporter?.email && <p className="text-xs text-gray-400 mt-1">{data.reporter.email}</p>}
                  </div>

                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <FieldLabel label="Reported user" />
                    {data?.reportedUser?.id
                      ? <>
                          <Link to={`/admin/users/${data.reportedUser.id}`} className="text-base font-bold text-blue-600 hover:underline">{data.reportedUser.name || "User"}</Link>
                          {data.reportedUser.email && <p className="text-xs text-gray-400 mt-1">{data.reportedUser.email}</p>}
                        </>
                      : <p className="text-sm text-gray-400">
                          {contextKind === "GENERAL" ? "Not applicable (general report)"
                            : contextKind === "HELPER" ? (data?.reportedUserId ? `ID: ${data.reportedUserId}` : "Not captured")
                            : "Not captured"}
                        </p>
                    }
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Internal notes */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-gray-400" /> Internal Notes</div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <textarea
                    value={noteBody}
                    onChange={(e) => setNoteBody(e.target.value)}
                    placeholder="Add an internal note…"
                    rows={3}
                    disabled={saving}
                    className={textareaCls + " flex-1"}
                  />
                  <Button
                    variant="primary"
                    size="md"
                    onClick={addNote}
                    disabled={saving || noteBody.trim().length < 2}
                    className="self-start"
                  >
                    Add
                  </Button>
                </div>

                {comments.length === 0 ? (
                  <p className="text-sm text-gray-400">No internal notes yet.</p>
                ) : (
                  <div className="space-y-3">
                    {comments.map((c: any) => (
                      <div key={c.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                        <div className="flex justify-between gap-4 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-800">{c.actor?.name || "Admin"}</span>
                            <Badge variant="default" className="text-[10px]">{c.kind || "NOTE"}</Badge>
                          </div>
                          <span className="text-xs text-gray-400">{c.createdAt ? new Date(c.createdAt).toLocaleString() : ""}</span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{c.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── RIGHT COLUMN ────────────────────────────────────────── */}
          <div className="flex flex-col gap-4">

            {/* Quick actions */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-gray-400" /> Quick Actions</div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Status */}
                <div>
                  <FieldLabel label="Set status" />
                  <div className="flex flex-wrap gap-2">
                    <Button variant={currentStatus === "OPEN" ? "primary" : "secondary"} size="sm"
                      onClick={() => quickSetStatus("OPEN")} disabled={saving || currentStatus === "OPEN"}>
                      OPEN
                    </Button>
                    <Button variant={currentStatus === "IN_REVIEW" ? "primary" : "secondary"} size="sm"
                      onClick={() => quickSetStatus("IN_REVIEW")} disabled={saving || currentStatus === "IN_REVIEW"}>
                      IN REVIEW
                    </Button>
                    <Button variant="secondary" size="sm" onClick={claim} disabled={saving}
                      title="Assign to me and move to IN_REVIEW">
                      <User className="h-3.5 w-3.5" /> Claim
                    </Button>
                  </div>
                </div>

                {/* Severity */}
                <div className="border-t border-gray-100 pt-3">
                  <FieldLabel label="Set severity" />
                  <div className="flex gap-2">
                    {(["LOW", "MEDIUM", "HIGH"] as IssueSeverity[]).map((s) => (
                      <Button key={s}
                        variant={currentSeverity === s ? "primary" : "secondary"}
                        size="sm"
                        onClick={() => quickSetSeverity(s)}
                        disabled={saving || currentSeverity === s}
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Assignment */}
                <div className="border-t border-gray-100 pt-3">
                  <FieldLabel label="Assignment" />
                  <div className="flex gap-2 mb-3">
                    <Button variant="secondary" size="sm" onClick={claim} disabled={saving}
                      title="Assign to me and move to IN_REVIEW">
                      Assign to me
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setAssignee(null)} disabled={saving}>
                      Unassign
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={assigneeQuery}
                      onChange={(e) => setAssigneeQuery(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") searchAssignees(); }}
                      placeholder="Search name / email…"
                      disabled={saving}
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
                    />
                    <Button variant="secondary" size="sm"
                      onClick={searchAssignees}
                      disabled={saving || assigneeLoading || assigneeQuery.trim().length < 2}
                    >
                      <Search className="h-3.5 w-3.5" />
                      {assigneeLoading ? "…" : "Find"}
                    </Button>
                  </div>
                  {assigneeResults.length > 0 ? (
                    <div className="mt-2 space-y-2">
                      {assigneeResults.map((u) => (
                        <div key={u.id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{u.name}</p>
                            <p className="text-xs text-gray-400 truncate">{u.email}</p>
                          </div>
                          <Button variant="primary" size="sm" onClick={() => setAssignee(u.id)} disabled={saving}>
                            Assign
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-gray-400">
                      Tip: search "support", "raj", or email. Only users with <strong>SUPPORT/ADMIN</strong> and not disabled will appear.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Resolve */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" /> Resolve</div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <FieldLabel label="Outcome" />
                  <select
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value as IssueOutcome)}
                    disabled={!canResolve || saving}
                    className={selectCls}
                  >
                    {OUTCOMES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <p className="mt-1 text-xs text-gray-400">{OUTCOMES.find((o) => o.value === outcome)?.hint}</p>
                </div>

                <div>
                  <FieldLabel label="Resolution note (internal, min 10 chars)" />
                  <textarea
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    rows={5}
                    placeholder="What did we verify? What action was taken?"
                    disabled={!canResolve || saving}
                    className={textareaCls}
                  />
                </div>

                {/* Optional moderation */}
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Optional moderation</p>
                  <label className={`flex items-center gap-2 text-sm ${!canCancel ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}>
                    <input
                      type="checkbox"
                      checked={alsoCancelTask}
                      onChange={(e) => setAlsoCancelTask(e.target.checked)}
                      disabled={!canResolve || saving || !canCancel}
                      className="rounded"
                    />
                    Cancel task (admin cancel guards)
                  </label>
                  <label className={`flex items-center gap-2 text-sm ${(!canRefund || alsoCancelTask) ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}>
                    <input
                      type="checkbox"
                      checked={alsoRefundEscrow}
                      onChange={(e) => setAlsoRefundEscrow(e.target.checked)}
                      disabled={!canResolve || saving || !canRefund || alsoCancelTask}
                      className="rounded"
                    />
                    Refund escrow (APP + HOLD only)
                  </label>
                  {!canRefund && hasTask && (
                    <p className="text-xs text-gray-400">Refund only possible for <strong>APP</strong> tasks when escrow is in <strong>HOLD</strong>.</p>
                  )}
                  {(alsoCancelTask || alsoRefundEscrow) && (
                    <div className="mt-2">
                      <FieldLabel label="Memo / cancel reason" />
                      <input
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        placeholder="Short reason for wallet memo / audit logs"
                        disabled={!canResolve || saving}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
                      />
                    </div>
                  )}
                </div>

                <Button
                  variant="primary"
                  size="md"
                  onClick={doResolve}
                  disabled={saving || !canResolve}
                  className="w-full"
                >
                  {saving ? "Resolving…" : "Resolve Issue"}
                </Button>

                {!canResolve && (
                  <p className="text-xs text-center text-gray-400">Issue is already {currentStatus.toLowerCase()} — cannot resolve.</p>
                )}

                {moderationResult && (
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <p className="font-semibold text-sm text-gray-800 mb-2">Moderation result</p>
                    <div className="flex gap-4 mb-2 text-sm">
                      <span>Cancelled: <strong>{moderationResult.cancelled ? "✅ yes" : "❌ no"}</strong></span>
                      <span>Refunded: <strong>{moderationResult.refunded ? "✅ yes" : "❌ no"}</strong></span>
                    </div>
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap">{JSON.stringify(moderationResult, null, 2)}</pre>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Close */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-gray-400" /> Close</div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <FieldLabel label="Closing note (min 3 chars)" />
                  <textarea
                    value={closeNote}
                    onChange={(e) => setCloseNote(e.target.value)}
                    rows={3}
                    placeholder="Why are we closing this issue?"
                    disabled={!canClose || saving}
                    className={textareaCls}
                  />
                </div>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={doClose}
                  disabled={saving || !canClose}
                  className="w-full"
                >
                  {saving ? "Closing…" : "Close Issue"}
                </Button>
                {!canClose && <p className="text-xs text-center text-gray-400">Issue is already closed.</p>}
              </CardContent>
            </Card>

            {/* Resolution metadata */}
            <Card>
              <CardHeader>Resolution Metadata</CardHeader>
              <CardContent className="space-y-3">
                <InfoBlock label="Resolved at">
                  {data?.resolvedAt ? new Date(data.resolvedAt).toLocaleString() : "—"}
                </InfoBlock>
                <InfoBlock label="Outcome">
                  {data?.outcome ? <Badge variant="default">{data.outcome}</Badge> : "—"}
                </InfoBlock>
                <InfoBlock label="Resolved by">
                  {data?.resolvedBy?.name || data?.resolvedByUserId || "—"}
                </InfoBlock>
                <InfoBlock label="Closed at">
                  {data?.closedAt ? new Date(data.closedAt).toLocaleString() : "—"}
                </InfoBlock>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
