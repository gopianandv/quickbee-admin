import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  RefreshCw, Shield, ShieldCheck, Key, LogOut, Trash2,
  UserX, UserCheck, ExternalLink, AlertTriangle,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  adminDeleteUser,
  adminDisableUser,
  adminEnableUser,
  adminGetUserProfile,
  adminGetUserHeldEscrows,
  adminGrantPermission,
  adminRevokePermission,
  adminResetUserOtp,
  adminRevokeUserSessions,
  formatDeleteBlockedReasons,
  isAdminDeleteBlockedError,
  type HeldEscrowResponse,
} from "@/api/adminUsers";
import { hasPerm } from "@/auth/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { useToast } from "@/lib/toast";
import { useConfirm } from "@/lib/confirm";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://quickbee-backend.onrender.com";

function toAbsoluteUrl(u?: string | null) {
  if (!u) return null;
  const s = String(u).trim();
  if (!s) return null;
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("//")) return `https:${s}`;
  if (s.startsWith("/")) return `${API_BASE}${s}`;
  return `${API_BASE}/${s}`;
}

function joinOrDash(arr: any) {
  if (!Array.isArray(arr) || arr.length === 0) return "—";
  return arr.join(", ");
}

const SYSTEM_PERMISSIONS = ["ADMIN", "KYC_REVIEW", "FINANCE", "SUPPORT"] as const;

function VerifiedBadge({ ok }: { ok: boolean }) {
  return ok
    ? <span className="text-[11px] font-bold text-green-600">✓ Verified</span>
    : <span className="text-[11px] font-bold text-red-500">✗ Unverified</span>;
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-t border-gray-100 first:border-0">
      <span className="text-sm text-gray-500 min-w-[110px] shrink-0">{label}</span>
      <span className="text-sm font-semibold text-gray-800 min-w-0">{children}</span>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30";

export default function AdminUserProfile() {
  const { userId } = useParams();
  const id = userId as string;

  const [data,    setData]    = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState<string | null>(null);
  const [saving,  setSaving]  = useState(false);
  const [permToAdd, setPermToAdd] = useState<string>("");

  /* Reason inputs for disable / delete */
  const [disableReason, setDisableReason] = useState("");
  const [deleteReason,  setDeleteReason]  = useState("");

  const isAdmin = hasPerm("ADMIN");
  const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast();
  const confirm = useConfirm();

  // Held-escrow state (lazy-loaded in its own card; failure here must not
  // break the whole profile page).
  const [heldEscrows, setHeldEscrows] = useState<HeldEscrowResponse | null>(null);
  const [heldEscrowsLoading, setHeldEscrowsLoading] = useState(false);
  const [heldEscrowsErr, setHeldEscrowsErr] = useState<string | null>(null);

  async function load() {
    setLoading(true); setErr(null);
    try {
      const d = await adminGetUserProfile(id);
      setData(d);
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? (e as { message?: string })?.message ?? "Failed to load profile");
    } finally { setLoading(false); }
  }

  async function loadHeldEscrows() {
    setHeldEscrowsLoading(true);
    setHeldEscrowsErr(null);
    try {
      const d = await adminGetUserHeldEscrows(id);
      setHeldEscrows(d);
    } catch (e: any) {
      setHeldEscrowsErr(
        e?.response?.data?.error ?? e?.message ?? "Failed to load held escrows",
      );
    } finally {
      setHeldEscrowsLoading(false);
    }
  }

  useEffect(() => { load(); loadHeldEscrows(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const user          = data?.user;
  const role          = String(user?.role || "").toUpperCase();
  const isHelper      = role === "HELPER";
  const profile       = user?.profile || {};
  const wallet        = user?.wallet ?? null;
  const languages     = data?.helperProfile?.languages || [];
  const serviceAreas  = data?.helperProfile?.serviceAreas || [];
  const skills        = data?.helperProfile?.skills || [];
  const kyc           = data?.kyc || { status: "NOT_STARTED" };
  const perms         = user?.permissions || [];
  const stats         = data?.stats || {};
  const isPhoneOnly   = !user?.email && !!profile?.phoneNumber;
  const lastLoginAt: string | null = data?.lastLoginAt ?? null;
  const profilePicUrl = toAbsoluteUrl(profile?.profilePicture);
  const isDisabled    = !!user?.isDisabled;
  const isDeleted     = !!user?.isDeleted;

  const permNames = useMemo(() => {
    const p = Array.isArray(perms) ? perms : [];
    return p.map((x: any) => String(x?.permission || "").toUpperCase()).filter(Boolean);
  }, [perms]);

  const availableToAdd = useMemo(() => {
    const set = new Set(permNames);
    return SYSTEM_PERMISSIONS.filter((p) => !set.has(p));
  }, [permNames]);

  useEffect(() => {
    if (permToAdd && !availableToAdd.includes(permToAdd as any)) setPermToAdd("");
  }, [availableToAdd, permToAdd]);

  async function onDisable() {
    if (!isAdmin) { toastError("Access denied", "Only ADMIN can disable users."); return; }
    if (saving) return;
    const reason = disableReason.trim();
    if (reason.length < 3) { toastWarning("Reason required", "Enter a disable reason (min 3 characters)."); return; }
    const ok = await confirm({
      title: "Disable this user?",
      message: `Reason: "${reason}"`,
      variant: "danger",
      confirmLabel: "Disable",
    });
    if (!ok) return;
    setSaving(true); setErr(null);
    try {
      await adminDisableUser(id, reason);
      toastSuccess("User disabled", "The user has been disabled successfully.");
      setDisableReason("");
      await load();
    } catch (e: unknown) {
      toastError("Disable failed", (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? (e as { message?: string })?.message ?? "Failed");
    } finally { setSaving(false); }
  }

  async function onEnable() {
    if (!isAdmin) { toastError("Access denied", "Only ADMIN can enable users."); return; }
    const ok = await confirm({
      title: "Re-enable this user?",
      message: "The user will regain full access to the platform.",
      confirmLabel: "Enable",
    });
    if (!ok) return;
    setSaving(true); setErr(null);
    try {
      await adminEnableUser(id);
      toastSuccess("User enabled", "The user's account has been re-enabled.");
      await load();
    } catch (e: unknown) {
      toastError("Enable failed", (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? (e as { message?: string })?.message ?? "Failed");
    } finally { setSaving(false); }
  }

  async function onDeleteAccount() {
    if (!isAdmin) { toastError("Access denied", "Only ADMIN can delete users."); return; }
    if (isDeleted) { toastWarning("Already deleted", "This account is already deleted."); return; }
    const reason = deleteReason.trim();
    if (reason.length < 3) { toastWarning("Reason required", "Enter a delete reason (min 3 characters)."); return; }
    const ok = await confirm({
      title: "Permanently delete this account?",
      message: `This will anonymize personal data, disable login, revoke all sessions, and mark as deleted.\n\nReason: "${reason}"`,
      variant: "danger",
      confirmLabel: "Delete permanently",
    });
    if (!ok) return;
    setSaving(true); setErr(null);
    try {
      await adminDeleteUser(id, reason);
      toastSuccess("Account deleted", "User account has been deleted and anonymized.");
      setDeleteReason("");
      await load();
    } catch (e: unknown) {
      if (isAdminDeleteBlockedError(e)) {
        const reasons  = (e as any).response?.data?.reasons || [];
        const details  = (e as any).response?.data?.details;
        const pretty   = formatDeleteBlockedReasons(reasons);
        const extra = details
          ? ` Wallet: ${details.walletBalancePaise ?? 0}p · Escrow holds: ${details.escrowHeldCount ?? 0} · Pending cashouts: ${details.pendingCashouts ?? 0} · Active tasks: ${details.activeTasks ?? 0}`
          : "";
        toastError(`Deletion blocked: ${pretty}`, extra || undefined);
      } else {
        setErr((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? (e as { message?: string })?.message ?? "Failed to delete user");
      }
    } finally { setSaving(false); }
  }

  async function onGrantPermission() {
    if (!isAdmin || !permToAdd) return;
    const ok = await confirm({
      title: `Grant "${permToAdd}" permission?`,
      message: "The user will gain elevated access based on this role.",
      confirmLabel: "Grant",
    });
    if (!ok) return;
    setSaving(true); setErr(null);
    try {
      await adminGrantPermission(id, permToAdd);
      toastSuccess("Permission granted", `${permToAdd} granted successfully.`);
      setPermToAdd("");
      await load();
    } catch (e: unknown) {
      toastError("Grant failed", (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? (e as { message?: string })?.message ?? "Failed");
    } finally { setSaving(false); }
  }

  async function onRevokePermission(permission: string) {
    if (!isAdmin) return;
    const ok = await confirm({
      title: `Revoke "${permission}" permission?`,
      message: "The user will immediately lose access tied to this role.",
      variant: "danger",
      confirmLabel: "Revoke",
    });
    if (!ok) return;
    setSaving(true); setErr(null);
    try {
      await adminRevokePermission(id, permission);
      toastSuccess("Permission revoked", `${permission} removed successfully.`);
      await load();
    } catch (e: unknown) {
      toastError("Revoke failed", (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? (e as { message?: string })?.message ?? "Failed");
    } finally { setSaving(false); }
  }

  async function onResetOtp() {
    const ok = await confirm({
      title: "Reset OTP challenges?",
      message: "This will invalidate all pending OTP challenges so the user can request a fresh one.",
      confirmLabel: "Reset OTP",
    });
    if (!ok) return;
    setSaving(true); setErr(null);
    try {
      const r = await adminResetUserOtp(id);
      toastSuccess("OTP reset", `${r.clearedCount} challenge(s) cleared.`);
    } catch (e: unknown) {
      toastError("OTP reset failed", (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? (e as { message?: string })?.message ?? "Failed");
    } finally { setSaving(false); }
  }

  async function onRevokeSessions() {
    const ok = await confirm({
      title: "Revoke all sessions?",
      message: "The user will be immediately logged out of all devices and their push notification registrations cleared.",
      variant: "danger",
      confirmLabel: "Revoke sessions",
    });
    if (!ok) return;
    setSaving(true); setErr(null);
    try {
      const r = await adminRevokeUserSessions(id);
      toastSuccess("Sessions revoked", `${r.tokensRevoked} token(s) revoked · ${r.devicesCleared} device(s) cleared.`);
      await load();
    } catch (e: unknown) {
      toastError("Revoke failed", (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? (e as { message?: string })?.message ?? "Failed");
    } finally { setSaving(false); }
  }

  return (
    <div>
      <PageHeader
        title={user?.name || "User Profile"}
        breadcrumbs={[
          { label: "Users", to: "/admin/users" },
          { label: user?.name || id },
        ]}
        actions={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {user && <StatusBadge status={role || "UNKNOWN"} />}
            {isDeleted  && <StatusBadge status="DELETED"  />}
            {isDisabled && <StatusBadge status="DISABLED" />}
            {!isAdmin && <Badge variant="default" className="text-xs">Read-only (Support)</Badge>}
            <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        }
      />

      {user && <p className="text-xs text-gray-400 mb-4 font-mono">User ID: {user.id}</p>}

      <ErrorMessage message={err} className="mb-4" />

      {loading && !data && (
        <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Loading…</div>
      )}

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Identity */}
          <Card>
            <CardHeader>Identity</CardHeader>
            <CardContent>
              {/* Avatar + name */}
              <div className="flex items-center gap-3 pb-4 mb-2">
                {profilePicUrl ? (
                  <img src={profilePicUrl} alt="Profile"
                    className="h-14 w-14 rounded-full object-cover border-2 border-gray-200 shrink-0" />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-surface border-2 border-gray-200 flex items-center justify-center text-white font-bold text-xl shrink-0">
                    {String(user?.name || "?")[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-bold text-lg text-gray-900">{user?.name || "—"}</p>
                  {profile?.displayName && profile.displayName !== user?.name && (
                    <p className="text-sm text-gray-500">{profile.displayName}</p>
                  )}
                </div>
              </div>

              {isPhoneOnly && (
                <div className="mb-3 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm font-semibold text-amber-700">
                  ⚠ Phone-only account — no email registered
                </div>
              )}

              <div className="flex items-center gap-2 py-1.5">
                <span className="text-sm text-gray-500 min-w-[110px]">Email</span>
                <span className="text-sm font-semibold text-gray-800">{user?.email || <span className="text-gray-400 italic">—</span>}</span>
                {user?.email && <VerifiedBadge ok={!!user.emailVerifiedAt} />}
              </div>
              <div className="flex items-center gap-2 py-1.5 border-t border-gray-100">
                <span className="text-sm text-gray-500 min-w-[110px]">Phone</span>
                <span className="text-sm font-semibold text-gray-800">{profile?.phoneNumber || <span className="text-gray-400 italic">—</span>}</span>
                {profile?.phoneNumber && <VerifiedBadge ok={!!user?.phoneVerifiedAt} />}
              </div>

              <InfoRow label="Role"><Badge variant="default">{user?.role || "—"}</Badge></InfoRow>
              <InfoRow label="Gender">{profile?.gender || "—"}</InfoRow>
              <InfoRow label="Created">{user?.createdAt ? new Date(user.createdAt).toLocaleString() : "—"}</InfoRow>
              <InfoRow label="Last login">
                {lastLoginAt ? new Date(lastLoginAt).toLocaleString() : <span className="text-gray-400 italic">Never</span>}
              </InfoRow>
              <InfoRow label="Account">
                {user?.isVerified
                  ? <span className="text-green-600">✓ Verified{user.verifiedAt ? ` · ${new Date(user.verifiedAt).toLocaleDateString()}` : ""}</span>
                  : <span className="text-gray-400">Not verified</span>
                }
              </InfoRow>

              <div className="mt-3 pt-3 border-t border-dashed border-gray-200">
                <InfoRow label="Account status">
                  <span className={`font-bold ${isDeleted ? "text-red-600" : isDisabled ? "text-amber-600" : "text-green-600"}`}>
                    {isDeleted ? "DELETED" : isDisabled ? "DISABLED" : "ACTIVE"}
                  </span>
                </InfoRow>
                {isDeleted && <>
                  <InfoRow label="Deleted at">{user?.deletedAt ? new Date(user.deletedAt).toLocaleString() : "—"}</InfoRow>
                  <InfoRow label="Delete reason">{user?.deletedReason || "—"}</InfoRow>
                </>}
                {isDisabled && <>
                  <InfoRow label="Disabled at">{user?.disabledAt ? new Date(user.disabledAt).toLocaleString() : "—"}</InfoRow>
                  <InfoRow label="Disable reason">{user?.disabledReason || "—"}</InfoRow>
                  <InfoRow label="Disabled by">{user?.disabledByUserId || "—"}</InfoRow>
                </>}
              </div>
            </CardContent>
          </Card>

          {/* Wallet & Finance */}
          <Card>
            <CardHeader>Wallet & Finance</CardHeader>
            <CardContent>
              {wallet ? (
                <>
                  <div className="mb-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Balance</p>
                    <p className={`text-2xl font-bold ${wallet.balancePaise > 0 ? "text-green-600" : "text-gray-800"}`}>
                      ₹{(wallet.balancePaise / 100).toFixed(2)}
                      <span className="text-sm font-normal text-gray-400 ml-2">({wallet.balancePaise} paise)</span>
                    </p>
                  </div>
                  {profile?.upiVpa && <InfoRow label="UPI VPA">{profile.upiVpa}</InfoRow>}
                  {profile?.bankMasked && <InfoRow label="Bank">{profile.bankMasked}</InfoRow>}
                  {profile?.payoutDefault && <InfoRow label="Payout default">{String(profile.payoutDefault)}</InfoRow>}
                  {!profile?.upiVpa && !profile?.bankMasked && (
                    <p className="text-sm text-gray-400">No payout method saved.</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-400">No wallet created yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Held Escrow (added 2026-04-21) */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <span>Held Escrow</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadHeldEscrows}
                  disabled={heldEscrowsLoading}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${heldEscrowsLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {heldEscrowsErr ? (
                <ErrorMessage message={heldEscrowsErr} />
              ) : heldEscrowsLoading && !heldEscrows ? (
                <p className="text-sm text-gray-400">Loading…</p>
              ) : !heldEscrows || heldEscrows.count === 0 ? (
                <p className="text-sm text-gray-400">No funds held in escrow.</p>
              ) : (
                <>
                  <div className="flex items-baseline gap-4 mb-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">
                        Total held
                      </p>
                      <p className="text-2xl font-bold text-gray-800">
                        ₹{(heldEscrows.totalPaise / 100).toFixed(2)}
                      </p>
                    </div>
                    {heldEscrows.suspiciousCount > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-600 mb-1 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Orphaned
                        </p>
                        <p className="text-xl font-bold text-amber-600">
                          ₹{(heldEscrows.suspiciousPaise / 100).toFixed(2)}
                          <span className="text-xs text-amber-500 ml-1">
                            ({heldEscrows.suspiciousCount})
                          </span>
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="max-h-[360px] overflow-y-auto border border-gray-100 rounded-md">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr className="text-left text-gray-500 font-semibold">
                          <th className="px-2 py-1.5">Task</th>
                          <th className="px-2 py-1.5">Status</th>
                          <th className="px-2 py-1.5 text-right">Amount</th>
                          <th className="px-2 py-1.5 text-right">Age</th>
                        </tr>
                      </thead>
                      <tbody>
                        {heldEscrows.items.map((it) => (
                          <tr
                            key={it.escrowId}
                            className={`border-t border-gray-100 ${
                              it.suspicious ? "bg-amber-50" : ""
                            }`}
                          >
                            <td className="px-2 py-1.5">
                              <Link
                                to={`/admin/tasks/${it.taskId}`}
                                className="text-blue-600 hover:underline"
                              >
                                {it.taskTitle || it.taskId.slice(0, 8)}
                              </Link>
                              {it.assignedTo && (
                                <div className="text-[10px] text-gray-500">
                                  → {it.assignedTo.name || it.assignedTo.id.slice(0, 8)}
                                </div>
                              )}
                            </td>
                            <td className="px-2 py-1.5">
                              <StatusBadge status={it.taskStatus || "—"} />
                              {it.suspicious && (
                                <span className="ml-1 text-[10px] font-bold text-amber-700">
                                  ORPHAN
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-1.5 text-right font-semibold text-gray-800">
                              ₹{(it.amountPaise / 100).toFixed(2)}
                            </td>
                            <td className="px-2 py-1.5 text-right text-gray-500">
                              {it.ageDays}d
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {heldEscrows.suspiciousCount > 0 && (
                    <p className="mt-2 text-[11px] text-amber-700">
                      Orphaned rows have status=HOLD but the task is no longer
                      ACCEPTED/IN_PROGRESS. These are swept by the taskExpiry
                      cron (Pass C/D) on the next run.
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* KYC */}
          <Card>
            <CardHeader>KYC</CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-3">
                <StatusBadge status={kyc?.status || "NOT_STARTED"} />
                {kyc?.id && (
                  <Link to={`/admin/kyc/${kyc.id}`}>
                    <Button variant="ghost" size="sm"><ExternalLink className="h-3.5 w-3.5" /> Review →</Button>
                  </Link>
                )}
              </div>
              {kyc?.id ? (
                <>
                  <InfoRow label="Submitted">{kyc.createdAt ? new Date(kyc.createdAt).toLocaleString() : "—"}</InfoRow>
                  <InfoRow label="Reviewed">{kyc.reviewedAt ? new Date(kyc.reviewedAt).toLocaleString() : "—"}</InfoRow>
                  <InfoRow label="Reason">{kyc.reason || "—"}</InfoRow>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {kyc.selfieUrl   && <a href={toAbsoluteUrl(kyc.selfieUrl)   ?? "#"} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline font-medium">Selfie ↗</a>}
                    {kyc.idFrontUrl  && <a href={toAbsoluteUrl(kyc.idFrontUrl)  ?? "#"} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline font-medium">ID Front ↗</a>}
                    {kyc.idBackUrl   && <a href={toAbsoluteUrl(kyc.idBackUrl)   ?? "#"} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline font-medium">ID Back ↗</a>}
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-400">No KYC submission found.</p>
              )}
            </CardContent>
          </Card>

          {/* Profile & Stats */}
          <Card>
            <CardHeader>Profile & Stats</CardHeader>
            <CardContent>
              {profile?.bio && (
                <div className="mb-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Bio</p>
                  <p className="text-sm text-gray-700">{profile.bio}</p>
                </div>
              )}
              <InfoRow label="Languages">{joinOrDash(languages)}</InfoRow>
              <InfoRow label="Service areas">{joinOrDash(serviceAreas)}</InfoRow>
              <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-3">
                {[
                  { label: "Tasks posted", value: stats?.tasksPosted ?? 0 },
                  { label: "Tasks taken", value: stats?.tasksTaken ?? 0 },
                  { label: "Completed (helper)", value: stats?.tasksCompletedAsHelper ?? 0 },
                  { label: "Cancelled (helper)", value: stats?.tasksCancelledAsHelper ?? 0 },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <p className="text-lg font-bold text-gray-800">{s.value}</p>
                  </div>
                ))}
                {isHelper && (
                  <div className={`rounded-lg border px-3 py-2 col-span-2 ${(stats?.noShowCount ?? 0) > 0 ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-100"}`}>
                    <p className="text-xs text-gray-500">No-shows recorded</p>
                    <div className="flex items-center gap-2">
                      <p className={`text-lg font-bold ${(stats?.noShowCount ?? 0) > 0 ? "text-red-600" : "text-gray-800"}`}>
                        {stats?.noShowCount ?? 0}
                      </p>
                      {(stats?.tasksNoShowAsHelper ?? 0) > 0 && (
                        <span className="text-xs text-red-400 font-medium">
                          ({stats.tasksNoShowAsHelper} task{stats.tasksNoShowAsHelper !== 1 ? "s" : ""} marked by consumers)
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Support Tools */}
          <Card>
            <CardHeader><Key className="h-4 w-4 text-gray-400" /> Support Tools</CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={onResetOtp}
                    disabled={saving || isDeleted}
                    className="border-amber-300 text-amber-700 hover:bg-amber-50"
                  >
                    <Key className="h-3.5 w-3.5" /> Reset OTP
                  </Button>
                  <p className="text-[11px] text-gray-400 mt-1 max-w-[180px]">
                    Unblocks users locked out after too many OTP failures
                  </p>
                </div>
                {isAdmin && (
                  <div>
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={onRevokeSessions}
                      disabled={saving || isDeleted}
                      className="border-red-200 text-red-700 hover:bg-red-50"
                    >
                      <LogOut className="h-3.5 w-3.5" /> Revoke All Sessions
                    </Button>
                    <p className="text-[11px] text-gray-400 mt-1 max-w-[200px]">
                      Forces immediate logout on all devices
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone — Disable / Enable / Delete */}
          {isAdmin && !isDeleted && (
            <Card className="border-red-100">
              <CardHeader>
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-red-600">Danger Zone</span>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Disable / Enable */}
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2">
                    {isDisabled ? "Re-enable account" : "Disable account"}
                  </p>
                  {!isDisabled && (
                    <div className="mb-2">
                      <input
                        value={disableReason}
                        onChange={(e) => setDisableReason(e.target.value)}
                        placeholder="Disable reason (required, min 3 chars)…"
                        className={inputCls}
                      />
                    </div>
                  )}
                  {isDisabled ? (
                    <Button variant="secondary" size="md" onClick={onEnable} disabled={saving}>
                      <UserCheck className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Enable Account"}
                    </Button>
                  ) : (
                    <Button
                      variant="danger"
                      size="md"
                      onClick={onDisable}
                      disabled={saving || disableReason.trim().length < 3}
                      title={disableReason.trim().length < 3 ? "Enter a reason first" : undefined}
                    >
                      <UserX className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Disable Account"}
                    </Button>
                  )}
                  <p className="mt-1 text-[11px] text-gray-400">
                    {isDisabled ? "Restores the user's access to the platform." : "Blocks the user from logging in. Reversible."}
                  </p>
                </div>

                {/* Delete */}
                <div className="border-t border-red-100 pt-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-red-400 mb-2">
                    Delete account (irreversible)
                  </p>
                  <div className="mb-2">
                    <input
                      value={deleteReason}
                      onChange={(e) => setDeleteReason(e.target.value)}
                      placeholder="Delete reason (required — e.g. User requested data deletion)…"
                      className={inputCls + " border-red-200"}
                    />
                  </div>
                  <Button
                    variant="danger"
                    size="md"
                    onClick={onDeleteAccount}
                    disabled={saving || deleteReason.trim().length < 3}
                    title={deleteReason.trim().length < 3 ? "Enter a reason first" : undefined}
                    className="bg-red-700 hover:bg-red-800 border-red-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> {saving ? "Deleting…" : "Delete Account Permanently"}
                  </Button>
                  <p className="mt-1 text-[11px] text-red-400">
                    Anonymizes personal data, disables login, revokes sessions. Blocked if the user has active tasks, escrow holds, or pending cashouts.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Skills */}
          <Card className="lg:col-span-2">
            <CardHeader>
              Skills{!isHelper && <span className="ml-2 text-sm font-normal text-gray-400">(hidden for non-helper)</span>}
            </CardHeader>
            <CardContent>
              {!isHelper ? (
                <p className="text-sm text-gray-400">This user is not a helper.</p>
              ) : skills.length === 0 ? (
                <p className="text-sm text-gray-400">No skills selected yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {skills.map((s: any) => (
                    <Badge key={s.id} variant="default" className="text-xs py-1 px-2.5">
                      {s.name}{s.category?.name ? ` · ${s.category.name}` : ""}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Permissions */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between gap-4 w-full">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-gray-400" /> Permissions
                </div>
                {isAdmin && !isDeleted ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={permToAdd}
                      onChange={(e) => setPermToAdd(e.target.value)}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30 min-w-[200px]"
                    >
                      <option value="">Add permission…</option>
                      {availableToAdd.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <Button variant="primary" size="md" onClick={onGrantPermission} disabled={saving || !permToAdd}>
                      {saving ? "Saving…" : "Grant"}
                    </Button>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">{isDeleted ? "Deleted (read-only)" : "Read-only"}</span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {permNames.length === 0 ? (
                <p className="text-sm text-gray-400">No permissions granted.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {permNames.map((p) => (
                    <span key={p} className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 text-blue-800 px-3 py-1 text-xs font-bold">
                      <ShieldCheck className="h-3 w-3" />
                      {p}
                      {isAdmin && !isDeleted && (
                        <button
                          onClick={() => onRevokePermission(p)}
                          disabled={saving}
                          title={`Revoke ${p}`}
                          className="ml-1 text-blue-500 hover:text-red-500 transition-colors font-bold leading-none"
                        >
                          ×
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-3 text-xs text-gray-400">Note: revoking your own ADMIN permission is blocked for safety.</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
