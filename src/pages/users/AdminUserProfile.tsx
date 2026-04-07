import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  adminDeleteUser,
  adminDisableUser,
  adminEnableUser,
  adminGetUserProfile,
  adminGrantPermission,
  adminRevokePermission,
  adminResetUserOtp,
  adminRevokeUserSessions,
  formatDeleteBlockedReasons,
  isAdminDeleteBlockedError,
} from "@/api/adminUsers";
import { hasPerm } from "@/auth/permissions";

function isArray(x: any): x is any[] {
  return Array.isArray(x);
}

function joinOrDash(arr: any) {
  if (!isArray(arr) || arr.length === 0) return "-";
  return arr.join(", ");
}

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

function KycLink({ label, url }: { label: string; url?: string | null }) {
  const abs = toAbsoluteUrl(url);
  if (!abs) return null;
  return (
    <a href={abs} target="_blank" rel="noreferrer">
      {label}
    </a>
  );
}

function btnStyle(kind: "danger" | "default") {
  const isDanger = kind === "danger";
  return {
    padding: "10px 14px",
    borderRadius: 10,
    border: isDanger ? "1px solid #991B1B" : "1px solid #E5E7EB",
    background: isDanger ? "#991B1B" : "#fff",
    color: isDanger ? "#fff" : "#111827",
    cursor: "pointer",
    fontWeight: 800,
    whiteSpace: "nowrap",
  } as React.CSSProperties;
}

const SYSTEM_PERMISSIONS = ["ADMIN", "KYC_REVIEW", "FINANCE", "SUPPORT"] as const;

export default function AdminUserProfile() {
  const { userId } = useParams();
  const id = userId as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  const isAdmin = hasPerm("ADMIN");

  const [permToAdd, setPermToAdd] = useState<string>("");

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const d = await adminGetUserProfile(id);
      setData(d);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const user = data?.user;
  const role = String(user?.role || "").toUpperCase();
  const isHelper = role === "HELPER";

  const profile = user?.profile || {};
  const wallet = user?.wallet ?? null;
  const languages = data?.helperProfile?.languages || [];
  const serviceAreas = data?.helperProfile?.serviceAreas || [];
  const skills = data?.helperProfile?.skills || [];
  const kyc = data?.kyc || { status: "NOT_STARTED" };
  const perms = user?.permissions || [];
  const stats = data?.stats || {};
  const isPhoneOnly = !user?.email && !!profile?.phoneNumber;
  const lastLoginAt: string | null = data?.lastLoginAt ?? null;
  const profilePicUrl = toAbsoluteUrl(profile?.profilePicture);

  const isDisabled = !!user?.isDisabled;
  const isDeleted = !!user?.isDeleted;

  const permNames = useMemo(() => {
    const p = Array.isArray(perms) ? perms : [];
    return p.map((x: any) => String(x?.permission || "").toUpperCase()).filter(Boolean);
  }, [perms]);

  const availableToAdd = useMemo(() => {
    const set = new Set(permNames);
    return SYSTEM_PERMISSIONS.filter((p) => !set.has(p));
  }, [permNames]);

  useEffect(() => {
    if (permToAdd && !availableToAdd.includes(permToAdd as any)) {
      setPermToAdd("");
    }
  }, [availableToAdd, permToAdd]);

  async function onDisable() {
    if (!isAdmin) {
      alert("Read-only access. Only ADMIN can disable users.");
      return;
    }
    if (saving) return;

    const reason = window.prompt("Disable reason (required):");
    if (!reason || reason.trim().length < 3) return;

    const ok = window.confirm(`Disable this user?\n\nReason: ${reason.trim()}`);
    if (!ok) return;

    setSaving(true);
    setErr(null);
    try {
      await adminDisableUser(id, reason.trim());
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Failed to disable user");
    } finally {
      setSaving(false);
    }
  }

  async function onEnable() {
    if (!isAdmin) {
      alert("Read-only access. Only ADMIN can enable users.");
      return;
    }
    if (saving) return;

    const ok = window.confirm("Enable this user?");
    if (!ok) return;

    setSaving(true);
    setErr(null);
    try {
      await adminEnableUser(id);
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Failed to enable user");
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteAccount() {
    if (!isAdmin) {
      alert("Read-only access. Only ADMIN can delete users.");
      return;
    }
    if (saving) return;
    if (isDeleted) {
      alert("This account is already deleted.");
      return;
    }

    const reason = window.prompt(
      "Delete reason (required):\n\nExample: Verified account deletion request from support workflow"
    );
    if (!reason || reason.trim().length < 3) return;

    const ok = window.confirm(
      `Delete this account permanently?\n\n` +
        `This will anonymize personal data, disable login, revoke sessions, and mark the user as deleted.\n\n` +
        `Reason: ${reason.trim()}`
    );
    if (!ok) return;

    setSaving(true);
    setErr(null);

    try {
      await adminDeleteUser(id, reason.trim());
      alert("User account deleted successfully.");
      await load();
    } catch (e: any) {
      if (isAdminDeleteBlockedError(e)) {
        const reasons = e.response?.data?.reasons || [];
        const details = e.response?.data?.details;

        const prettyReasons = formatDeleteBlockedReasons(reasons);
        const extra =
          details
            ? `\n\nBlocker details:` +
              `\n• Wallet balance paise: ${details.walletBalancePaise ?? 0}` +
              `\n• Escrow holds: ${details.escrowHeldCount ?? 0}` +
              `\n• Pending cashouts: ${details.pendingCashouts ?? 0}` +
              `\n• Pending payments: ${details.pendingPaymentIntents ?? 0}` +
              `\n• Active tasks: ${details.activeTasks ?? 0}` +
              `\n• Open issues: ${details.openIssues ?? 0}` +
              `\n• Pending platform fee paise: ${details.pendingPlatformFeePaise ?? 0}`
            : "";

        alert(`Deletion blocked due to: ${prettyReasons}.${extra}`);
      } else {
        setErr(e?.response?.data?.error || e?.message || "Failed to delete user");
      }
    } finally {
      setSaving(false);
    }
  }

  async function onGrantPermission() {
    if (!isAdmin) {
      alert("Read-only access. Only ADMIN can grant permissions.");
      return;
    }
    if (saving) return;
    if (!permToAdd) return;

    const ok = window.confirm(`Grant permission "${permToAdd}" to this user?`);
    if (!ok) return;

    setSaving(true);
    setErr(null);
    try {
      await adminGrantPermission(id, permToAdd);
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Failed to grant permission");
    } finally {
      setSaving(false);
    }
  }

  async function onRevokePermission(permission: string) {
    if (!isAdmin) {
      alert("Read-only access. Only ADMIN can revoke permissions.");
      return;
    }
    if (saving) return;

    const ok = window.confirm(`Revoke permission "${permission}" from this user?`);
    if (!ok) return;

    setSaving(true);
    setErr(null);
    try {
      await adminRevokePermission(id, permission);
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Failed to revoke permission");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={{ padding: 20, fontFamily: "system-ui" }}>Loading…</div>;
  if (err) return <div style={{ padding: 20, fontFamily: "system-ui", color: "crimson" }}>{err}</div>;
  if (!data) return null;

  return (
    <div style={{ maxWidth: 1100, margin: "30px auto", fontFamily: "system-ui" }}>
      <div style={{ marginBottom: 12 }}>
        <Link to="/admin/users">← Back to Users</Link>
        <span style={{ marginLeft: 10, color: "#6B7280" }}>·</span>
        <Link style={{ marginLeft: 10 }} to="/admin/dashboard">
          Dashboard
        </Link>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "flex-start",
          marginBottom: 8,
        }}
      >
        <div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
            <h2 style={{ margin: 0 }}>{user?.name || "User"}</h2>
            <StatusBadge status={role || "UNKNOWN"} />
            {isDeleted ? <StatusBadge status="DELETED" /> : null}
            {isDisabled ? <StatusBadge status="DISABLED" /> : null}
            {!isAdmin ? <span style={{ fontSize: 12, color: "#666" }}>· Read-only (Support)</span> : null}
          </div>

          <div style={{ color: "#555", marginBottom: 16 }}>
            User ID: <code>{user?.id}</code>
          </div>
        </div>

        {isAdmin ? (
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
            {isDeleted ? (
              <div style={{ fontSize: 12, color: "#666", paddingTop: 8 }}>Deleted accounts are read-only.</div>
            ) : (
              <>
                {isDisabled ? (
                  <button onClick={onEnable} disabled={saving} style={btnStyle("default")}>
                    {saving ? "Saving…" : "Enable"}
                  </button>
                ) : (
                  <button onClick={onDisable} disabled={saving} style={btnStyle("danger")}>
                    {saving ? "Saving…" : "Disable"}
                  </button>
                )}

                <button
                  onClick={onDeleteAccount}
                  disabled={saving}
                  style={{
                    ...btnStyle("danger"),
                    background: "#7F1D1D",
                    border: "1px solid #7F1D1D",
                  }}
                  title="Delete account permanently"
                >
                  {saving ? "Saving…" : "Delete Account"}
                </button>
              </>
            )}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: "#666", paddingTop: 8 }}>Admin actions are restricted to ADMIN.</div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Identity</div>

          {/* Profile picture + name header */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            {profilePicUrl ? (
              <img
                src={profilePicUrl}
                alt="Profile"
                style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: "2px solid #E5E7EB", flexShrink: 0 }}
              />
            ) : (
              <div style={{
                width: 56, height: 56, borderRadius: "50%", background: "#F3F4F6",
                border: "2px solid #E5E7EB", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 22, flexShrink: 0, color: "#9CA3AF",
              }}>
                {String(user?.name || "?")[0].toUpperCase()}
              </div>
            )}
            <div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{user?.name || "—"}</div>
              {profile?.displayName && profile.displayName !== user?.name ? (
                <div style={{ fontSize: 13, color: "#6B7280" }}>{profile.displayName}</div>
              ) : null}
            </div>
          </div>

          {/* Phone-only account notice */}
          {isPhoneOnly ? (
            <div style={{
              fontSize: 12, color: "#92400E", background: "#FEF3C7",
              border: "1px solid #FCD34D", borderRadius: 6, padding: "4px 10px",
              marginBottom: 10, fontWeight: 700,
            }}>
              ⚠ Phone-only account — no email registered
            </div>
          ) : null}

          {/* Email row */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ minWidth: 90, color: "#6B7280" }}>Email:</span>
            <b>{user?.email || <span style={{ color: "#9CA3AF", fontStyle: "italic" }}>—</span>}</b>
            {user?.email ? (
              user?.emailVerifiedAt
                ? <span style={{ color: "#059669", fontSize: 11, fontWeight: 700 }}>✓ Verified</span>
                : <span style={{ color: "#DC2626", fontSize: 11, fontWeight: 700 }}>✗ Unverified</span>
            ) : null}
          </div>

          {/* Phone row */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ minWidth: 90, color: "#6B7280" }}>Phone:</span>
            <b>{profile?.phoneNumber || <span style={{ color: "#9CA3AF", fontStyle: "italic" }}>—</span>}</b>
            {profile?.phoneNumber ? (
              user?.phoneVerifiedAt
                ? <span style={{ color: "#059669", fontSize: 11, fontWeight: 700 }}>✓ Verified</span>
                : <span style={{ color: "#DC2626", fontSize: 11, fontWeight: 700 }}>✗ Unverified</span>
            ) : null}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ minWidth: 90, color: "#6B7280" }}>Role:</span>
            <b>{user?.role || "-"}</b>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ minWidth: 90, color: "#6B7280" }}>Display Name:</span>
            <span>{profile?.displayName || "-"}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ minWidth: 90, color: "#6B7280" }}>Gender:</span>
            <span>{profile?.gender || "-"}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ minWidth: 90, color: "#6B7280" }}>Created:</span>
            <span>{user?.createdAt ? new Date(user.createdAt).toLocaleString() : "-"}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ minWidth: 90, color: "#6B7280" }}>Account:</span>
            {user?.isVerified
              ? <span style={{ color: "#059669", fontWeight: 700 }}>✓ Verified{user.verifiedAt ? ` · ${new Date(user.verifiedAt).toLocaleDateString()}` : ""}</span>
              : <span style={{ color: "#6B7280" }}>Not verified</span>
            }
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ minWidth: 90, color: "#6B7280" }}>Last Login:</span>
            {lastLoginAt
              ? <span>{new Date(lastLoginAt).toLocaleString()}</span>
              : <span style={{ color: "#9CA3AF", fontStyle: "italic" }}>Never logged in</span>
            }
          </div>

          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed #E5E7EB" }}>
            <div>
              Status: <b>{isDeleted ? "DELETED" : isDisabled ? "DISABLED" : "ACTIVE"}</b>
            </div>

            {isDeleted ? (
              <>
                <div>Deleted At: {user?.deletedAt ? new Date(user.deletedAt).toLocaleString() : "-"}</div>
                <div>Deleted Reason: {user?.deletedReason || "-"}</div>
              </>
            ) : null}

            {isDisabled ? (
              <>
                <div>Disabled At: {user?.disabledAt ? new Date(user.disabledAt).toLocaleString() : "-"}</div>
                <div>Disabled Reason: {user?.disabledReason || "-"}</div>
                <div>Disabled By: {user?.disabledByUserId || "-"}</div>
              </>
            ) : null}
          </div>
        </div>

        {/* Wallet & Finance card */}
        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Wallet & Finance</div>
          {wallet ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ minWidth: 110, color: "#6B7280" }}>Balance:</span>
                <b style={{ fontSize: 16, color: wallet.balancePaise > 0 ? "#059669" : "#111827" }}>
                  ₹{(wallet.balancePaise / 100).toFixed(2)}
                </b>
                <span style={{ fontSize: 11, color: "#6B7280" }}>({wallet.balancePaise} paise)</span>
              </div>
              {profile?.upiVpa ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ minWidth: 110, color: "#6B7280" }}>UPI VPA:</span>
                  <b>{profile.upiVpa}</b>
                </div>
              ) : null}
              {profile?.bankMasked ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ minWidth: 110, color: "#6B7280" }}>Bank:</span>
                  <b>{profile.bankMasked}</b>
                </div>
              ) : null}
              {profile?.payoutDefault ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ minWidth: 110, color: "#6B7280" }}>Payout Default:</span>
                  <b>{String(profile.payoutDefault)}</b>
                </div>
              ) : null}
              {!profile?.upiVpa && !profile?.bankMasked ? (
                <div style={{ color: "#6B7280", fontSize: 13 }}>No payout method saved.</div>
              ) : null}
            </>
          ) : (
            <div style={{ color: "#6B7280" }}>No wallet created yet.</div>
          )}
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>KYC</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div>Status:</div>
            <StatusBadge status={kyc?.status || "NOT_STARTED"} />
          </div>

          {kyc?.id ? (
            <>
              <div style={{ marginTop: 8 }}>
                Submitted: {kyc.createdAt ? new Date(kyc.createdAt).toLocaleString() : "-"}
              </div>
              <div>Reviewed: {kyc.reviewedAt ? new Date(kyc.reviewedAt).toLocaleString() : "-"}</div>
              <div>Reason: {kyc.reason || "-"}</div>

              <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <KycLink label="Selfie" url={kyc.selfieUrl} />
                <KycLink label="ID Front" url={kyc.idFrontUrl} />
                <KycLink label="ID Back" url={kyc.idBackUrl} />
              </div>
            </>
          ) : (
            <div style={{ marginTop: 8, color: "#666" }}>No KYC submission found.</div>
          )}
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Profile</div>
          <div>Bio: {profile?.bio || "-"}</div>
          <div style={{ marginTop: 8 }}>Languages: {joinOrDash(languages)}</div>
          <div>Service Areas: {joinOrDash(serviceAreas)}</div>
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Stats</div>
          <div>
            Tasks Posted: <b>{stats?.tasksPosted ?? 0}</b>
          </div>
          <div>
            Tasks Taken: <b>{stats?.tasksTaken ?? 0}</b>
          </div>
          <div>
            Completed (as helper): <b>{stats?.tasksCompletedAsHelper ?? 0}</b>
          </div>
          <div>
            Cancelled (as helper): <b>{stats?.tasksCancelledAsHelper ?? 0}</b>
          </div>
        </div>

        {/* Support Tools card */}
        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14, gridColumn: "1 / -1" }}>
          <div style={{ fontWeight: 800, marginBottom: 12 }}>Support Tools</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>

            {/* OTP Reset — ADMIN or SUPPORT */}
            <div>
              <button
                disabled={saving || isDeleted}
                onClick={async () => {
                  if (saving) return;
                  const ok = window.confirm(
                    "Reset OTP?\n\nThis will invalidate all pending OTP challenges for this user so they can request a fresh one."
                  );
                  if (!ok) return;
                  setSaving(true);
                  setErr(null);
                  try {
                    const r = await adminResetUserOtp(id);
                    alert(`OTP reset. ${r.clearedCount} challenge(s) cleared.`);
                  } catch (e: any) {
                    setErr(e?.response?.data?.error || e?.message || "Failed to reset OTP");
                  } finally {
                    setSaving(false);
                  }
                }}
                style={{
                  padding: "8px 14px", borderRadius: 8, border: "1px solid #D97706",
                  background: "#FFFBEB", color: "#92400E", cursor: isDeleted ? "not-allowed" : "pointer",
                  fontWeight: 700, opacity: isDeleted ? 0.5 : 1,
                }}
                title="Invalidate all pending OTP challenges so the user can get a fresh one"
              >
                🔑 Reset OTP
              </button>
              <div style={{ fontSize: 11, color: "#6B7280", marginTop: 4, maxWidth: 180 }}>
                Unblocks users locked out after too many OTP failures
              </div>
            </div>

            {/* Revoke Sessions — ADMIN only */}
            {isAdmin ? (
              <div>
                <button
                  disabled={saving || isDeleted}
                  onClick={async () => {
                    if (saving) return;
                    const ok = window.confirm(
                      "Revoke all sessions?\n\nThis will immediately log the user out of all devices and clear their push notification registrations.\n\nThey will need to log in again."
                    );
                    if (!ok) return;
                    setSaving(true);
                    setErr(null);
                    try {
                      const r = await adminRevokeUserSessions(id);
                      alert(
                        `Sessions revoked.\n• Refresh tokens revoked: ${r.tokensRevoked}\n• Device tokens cleared: ${r.devicesCleared}`
                      );
                      await load();
                    } catch (e: any) {
                      setErr(e?.response?.data?.error || e?.message || "Failed to revoke sessions");
                    } finally {
                      setSaving(false);
                    }
                  }}
                  style={{
                    padding: "8px 14px", borderRadius: 8, border: "1px solid #991B1B",
                    background: "#FEF2F2", color: "#991B1B", cursor: isDeleted ? "not-allowed" : "pointer",
                    fontWeight: 700, opacity: isDeleted ? 0.5 : 1,
                  }}
                  title="Revoke all refresh tokens and device tokens — forces user to re-login"
                >
                  🚪 Revoke All Sessions
                </button>
                <div style={{ fontSize: 11, color: "#6B7280", marginTop: 4, maxWidth: 200 }}>
                  Forces immediate logout on all devices
                </div>
              </div>
            ) : null}

          </div>
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14, gridColumn: "1 / -1" }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>
            Skills{" "}
            {isHelper ? "" : <span style={{ fontWeight: 500, color: "#666" }}>(hidden for non-helper)</span>}
          </div>

          {!isHelper ? (
            <div style={{ color: "#666" }}>This user is not a helper.</div>
          ) : skills.length === 0 ? (
            <div style={{ color: "#666" }}>No skills selected yet.</div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {skills.map((s: any) => (
                <span
                  key={s.id}
                  style={{
                    display: "inline-block",
                    padding: "6px 10px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 700,
                    background: "#F2F2F2",
                    border: "1px solid #DDD",
                  }}
                >
                  {s.name}
                  {s.category?.name ? ` · ${s.category.name}` : ""}
                </span>
              ))}
            </div>
          )}
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14, gridColumn: "1 / -1" }}>
          <div
            style={{
              fontWeight: 800,
              marginBottom: 10,
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
            }}
          >
            <div>Permissions</div>

            {isAdmin && !isDeleted ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select
                  value={permToAdd}
                  onChange={(e) => setPermToAdd(e.target.value)}
                  style={{
                    padding: 10,
                    borderRadius: 10,
                    border: "1px solid #E5E7EB",
                    background: "#fff",
                    minWidth: 200,
                  }}
                >
                  <option value="">Add permission…</option>
                  {availableToAdd.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>

                <button
                  onClick={onGrantPermission}
                  disabled={saving || !permToAdd}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid #111827",
                    background: !permToAdd ? "#F3F4F6" : "#111827",
                    color: !permToAdd ? "#6B7280" : "#fff",
                    cursor: !permToAdd ? "not-allowed" : "pointer",
                    fontWeight: 900,
                  }}
                  title={!permToAdd ? "Select a permission to add" : "Grant permission"}
                >
                  {saving ? "Saving…" : "Grant"}
                </button>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: "#666" }}>{isDeleted ? "Deleted (read-only)" : "Read-only"}</div>
            )}
          </div>

          {permNames.length === 0 ? (
            <div style={{ color: "#666" }}>No permissions granted.</div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {permNames.map((p) => (
                <span
                  key={p}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 10px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 900,
                    background: "#EAF2FF",
                    color: "#0B3A88",
                    border: "1px solid #BFD6FF",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span>{p}</span>

                  {isAdmin && !isDeleted ? (
                    <button
                      onClick={() => onRevokePermission(p)}
                      disabled={saving}
                      title={`Revoke ${p}`}
                      style={{
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        fontWeight: 900,
                        color: "#0B3A88",
                        padding: 0,
                        lineHeight: "14px",
                      }}
                    >
                      ×
                    </button>
                  ) : null}
                </span>
              ))}
            </div>
          )}

          <div style={{ marginTop: 10, color: "#6B7280", fontSize: 12 }}>
            Note: revoking your own ADMIN permission is blocked for safety.
          </div>
        </div>
      </div>
    </div>
  );
}