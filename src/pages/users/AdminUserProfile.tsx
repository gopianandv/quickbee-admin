import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  adminDisableUser,
  adminEnableUser,
  adminGetUserProfile,
  adminGrantPermission,
  adminRevokePermission,
} from "@/api/adminUsers";
import { hasPerm } from "@/auth/permissions";

function isArray(x: any): x is any[] {
  return Array.isArray(x);
}

function joinOrDash(arr: any) {
  if (!isArray(arr) || arr.length === 0) return "-";
  return arr.join(", ");
}

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "https://quickbee-backend.onrender.com";

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

// Keep in UI (no Prisma import in frontend)
const SYSTEM_PERMISSIONS = ["ADMIN", "KYC_REVIEW", "FINANCE", "SUPPORT"] as const;

export default function AdminUserProfile() {
  const { userId } = useParams();
  const id = userId as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  // ✅ Policy: only ADMIN can mutate user state / permissions
  const isAdmin = hasPerm("ADMIN");

  // permission UI state
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
  const languages = data?.helperProfile?.languages || [];
  const serviceAreas = data?.helperProfile?.serviceAreas || [];
  const skills = data?.helperProfile?.skills || [];
  const kyc = data?.kyc || { status: "NOT_STARTED" };
  const perms = user?.permissions || [];
  const stats = data?.stats || {};

  const isDisabled = !!user?.isDisabled;

  const permNames = useMemo(() => {
    const p = Array.isArray(perms) ? perms : [];
    return p
      .map((x: any) => String(x?.permission || "").toUpperCase())
      .filter(Boolean);
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
            {isDisabled ? <StatusBadge status="DISABLED" /> : null}
            {!isAdmin ? (
              <span style={{ fontSize: 12, color: "#666" }}>· Read-only (Support)</span>
            ) : null}
          </div>

          <div style={{ color: "#555", marginBottom: 16 }}>
            User ID: <code>{user?.id}</code>
          </div>
        </div>

        {/* ✅ Enable/Disable actions (ADMIN only) */}
        {isAdmin ? (
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {isDisabled ? (
              <button onClick={onEnable} disabled={saving} style={btnStyle("default")}>
                {saving ? "Saving…" : "Enable"}
              </button>
            ) : (
              <button onClick={onDisable} disabled={saving} style={btnStyle("danger")}>
                {saving ? "Saving…" : "Disable"}
              </button>
            )}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: "#666", paddingTop: 8 }}>
            Admin actions are restricted to ADMIN.
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {/* Identity */}
        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Identity</div>
          <div>
            Email: <b>{user?.email || "-"}</b>
          </div>
          <div>
            Role: <b>{user?.role || "-"}</b>
          </div>
          <div>Created: {user?.createdAt ? new Date(user.createdAt).toLocaleString() : "-"}</div>
          <div>Phone: {profile?.phoneNumber || "-"}</div>
          <div>Display Name: {profile?.displayName || "-"}</div>

          {/* Disabled metadata */}
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed #E5E7EB" }}>
            <div>
              Status: <b>{isDisabled ? "DISABLED" : "ACTIVE"}</b>
            </div>
            {isDisabled ? (
              <>
                <div>
                  Disabled At:{" "}
                  {user?.disabledAt ? new Date(user.disabledAt).toLocaleString() : "-"}
                </div>
                <div>Disabled Reason: {user?.disabledReason || "-"}</div>
                <div>Disabled By: {user?.disabledByUserId || "-"}</div>
              </>
            ) : null}
          </div>
        </div>

        {/* KYC */}
        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>KYC</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div>Status:</div>
            <StatusBadge status={kyc?.status || "NOT_STARTED"} />
          </div>

          {kyc?.id ? (
            <>
              <div style={{ marginTop: 8 }}>
                Submitted:{" "}
                {kyc.createdAt ? new Date(kyc.createdAt).toLocaleString() : "-"}
              </div>
              <div>
                Reviewed:{" "}
                {kyc.reviewedAt ? new Date(kyc.reviewedAt).toLocaleString() : "-"}
              </div>
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

        {/* Profile */}
        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Profile</div>
          <div>Bio: {profile?.bio || "-"}</div>
          <div style={{ marginTop: 8 }}>Languages: {joinOrDash(languages)}</div>
          <div>Service Areas: {joinOrDash(serviceAreas)}</div>
        </div>

        {/* Stats */}
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

        {/* Skills */}
        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: 10,
            padding: 14,
            gridColumn: "1 / -1",
          }}
        >
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

        {/* Permissions */}
        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: 10,
            padding: 14,
            gridColumn: "1 / -1",
          }}
        >
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

            {/* ✅ Add permission UI only for ADMIN */}
            {isAdmin ? (
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
              <div style={{ fontSize: 12, color: "#666" }}>Read-only</div>
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

                  {/* ✅ revoke button only for ADMIN */}
                  {isAdmin ? (
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
