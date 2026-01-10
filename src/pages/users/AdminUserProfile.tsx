import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import StatusBadge from "@/components/ui/StatusBadge";
import { adminGetUserProfile } from "@/api/adminUsers";

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

    // already absolute (S3 signed URL etc.)
    if (s.startsWith("http://") || s.startsWith("https://")) return s;

    // protocol-relative
    if (s.startsWith("//")) return `https:${s}`;

    // relative path -> backend base (only works if backend actually serves it)
    if (s.startsWith("/")) return `${API_BASE}${s}`;

    // fallback
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



export default function AdminUserProfile() {
    const { userId } = useParams();
    const id = userId as string;

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

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

    if (loading) return <div style={{ padding: 20, fontFamily: "system-ui" }}>Loading…</div>;
    if (err) return <div style={{ padding: 20, fontFamily: "system-ui", color: "crimson" }}>{err}</div>;
    if (!data) return null;

    return (
        <div style={{ maxWidth: 1100, margin: "30px auto", fontFamily: "system-ui" }}>
            <div style={{ marginBottom: 12 }}>
                <Link to="/admin/dashboard">← Back to Dashboard</Link>
            </div>

            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
                <h2 style={{ margin: 0 }}>{user?.name || "User"}</h2>
                <StatusBadge status={role || "UNKNOWN"} />
            </div>

            <div style={{ color: "#555", marginBottom: 16 }}>
                User ID: <code>{user?.id}</code>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {/* Identity */}
                <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
                    <div style={{ fontWeight: 800, marginBottom: 10 }}>Identity</div>
                    <div>Email: <b>{user?.email || "-"}</b></div>
                    <div>Role: <b>{user?.role || "-"}</b></div>
                    <div>Created: {user?.createdAt ? new Date(user.createdAt).toLocaleString() : "-"}</div>
                    <div>Phone: {profile?.phoneNumber || "-"}</div>
                    <div>Display Name: {profile?.displayName || "-"}</div>
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
                            <div style={{ marginTop: 8 }}>Submitted: {kyc.createdAt ? new Date(kyc.createdAt).toLocaleString() : "-"}</div>
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

                {/* Profile */}
                <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
                    <div style={{ fontWeight: 800, marginBottom: 10 }}>Profile</div>
                    <div>Bio: {profile?.bio || "-"}</div>
                    <div style={{ marginTop: 8 }}>Languages: {joinOrDash(languages)}</div>
                    <div>Service Areas: {joinOrDash(serviceAreas)}</div>
                </div>

                {/* Helper stats */}
                <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
                    <div style={{ fontWeight: 800, marginBottom: 10 }}>Stats</div>
                    <div>Tasks Posted: <b>{stats?.tasksPosted ?? 0}</b></div>
                    <div>Tasks Taken: <b>{stats?.tasksTaken ?? 0}</b></div>
                    <div>Completed (as helper): <b>{stats?.tasksCompletedAsHelper ?? 0}</b></div>
                    <div>Cancelled (as helper): <b>{stats?.tasksCancelledAsHelper ?? 0}</b></div>
                </div>

                {/* Skills (helper only) */}
                <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14, gridColumn: "1 / -1" }}>
                    <div style={{ fontWeight: 800, marginBottom: 10 }}>
                        Skills {isHelper ? "" : <span style={{ fontWeight: 500, color: "#666" }}>(hidden for non-helper)</span>}
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
                                    {s.name}{s.category?.name ? ` · ${s.category.name}` : ""}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Permissions */}
                <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14, gridColumn: "1 / -1" }}>
                    <div style={{ fontWeight: 800, marginBottom: 10 }}>Permissions</div>
                    {perms.length === 0 ? (
                        <div style={{ color: "#666" }}>No permissions granted.</div>
                    ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            {perms.map((p: any, idx: number) => (
                                <span
                                    key={`${p.permission}-${idx}`}
                                    style={{
                                        display: "inline-block",
                                        padding: "6px 10px",
                                        borderRadius: 999,
                                        fontSize: 12,
                                        fontWeight: 800,
                                        background: "#EAF2FF",
                                        color: "#0B3A88",
                                        border: "1px solid #BFD6FF",
                                    }}
                                >
                                    {p.permission}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
