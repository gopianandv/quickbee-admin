import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { adminListAuditLogs, type AuditLogRow } from "@/api/adminAudit";

function pretty(s?: string | null) {
    const v = String(s ?? "").trim();
    if (!v) return "-";
    return v
        .toLowerCase()
        .split("_")
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
}

export default function AdminAuditLog() {
    const [action, setAction] = useState("");
    const [entityType, setEntityType] = useState("");
    const [searchEntityId, setSearchEntityId] = useState("");

    const [page, setPage] = useState(1);
    const pageSize = 30;

    const [items, setItems] = useState<AuditLogRow[]>([]);
    const [total, setTotal] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const ACTION_OPTIONS = useMemo(
        () => [
            { label: "All actions", value: "" },
            { label: "KYC Approved", value: "KYC_APPROVED" },
            { label: "KYC Rejected", value: "KYC_REJECTED" },
            { label: "Task Cancelled", value: "TASK_CANCELLED" },
            { label: "Escrow Refunded", value: "ESCROW_REFUNDED" },
        ],
        []
    );

    const ENTITY_OPTIONS = useMemo(
        () => [
            { label: "All entities", value: "" },
            { label: "Task", value: "Task" },
            { label: "KYC Submission", value: "KycSubmission" },
            { label: "User", value: "User" },
        ],
        []
    );

    async function load(p = page) {
        setLoading(true);
        setErr(null);
        try {
            const data = await adminListAuditLogs({
                action: action || undefined,
                entityType: entityType || undefined,
                entityId: searchEntityId.trim() || undefined,
                page: p,
                pageSize,
            });

            setItems(data.items || []);
            setTotal(data.total || 0);
            setHasMore(!!data.hasMore);
        } catch (e: any) {
            setErr(e?.response?.data?.error || e?.message || "Failed to load audit logs");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load(page);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [action, entityType, page]);

    function onSearch() {
        if (page !== 1) setPage(1);
        else load(1);
    }

    function norm(s?: string | null) {
        return String(s ?? "").trim().toUpperCase();
    }

    function entityLink(row: AuditLogRow) {
        const t = norm(row.entityType);
        const a = norm(row.action);
        const id = row.entityId ? String(row.entityId).trim() : "";

        if (!id) return null;

        // Your DB reality
        if (t === "TASK") return `/admin/tasks/${id}`;
        if (t === "USER") return `/admin/users/${id}`;
        if (t === "KYC_SUBMISSION") return `/admin/kyc/${id}`;

        // Optional fallback based on action prefix
        if (a.startsWith("TASK_")) return `/admin/tasks/${id}`;
        if (a.startsWith("KYC_")) return `/admin/kyc/${id}`;

        return null;
    }


    return (
        <div style={{ maxWidth: 1200, margin: "30px auto", fontFamily: "system-ui" }}>
            <h2>Audit Log</h2>

            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
                <select value={action} onChange={(e) => { setPage(1); setAction(e.target.value); }}>
                    {ACTION_OPTIONS.map((o) => (
                        <option key={o.value || "ALL"} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </select>

                <select value={entityType} onChange={(e) => { setPage(1); setEntityType(e.target.value); }}>
                    {ENTITY_OPTIONS.map((o) => (
                        <option key={o.value || "ALL"} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </select>

                <input
                    value={searchEntityId}
                    onChange={(e) => setSearchEntityId(e.target.value)}
                    placeholder="Entity ID (taskId / userId / etc)"
                    style={{ flex: 1, padding: 8 }}
                    onKeyDown={(e) => e.key === "Enter" && onSearch()}
                />

                <button onClick={onSearch} style={{ padding: "8px 12px" }} disabled={loading}>
                    Search
                </button>
            </div>

            {err && <div style={{ color: "crimson", marginBottom: 10 }}>{err}</div>}
            {loading ? <div>Loading…</div> : null}

            <div style={{ border: "1px solid #ddd", borderRadius: 10, overflow: "hidden" }}>
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "210px 160px 160px 1fr 180px 140px",
                        padding: 10,
                        background: "#f5f5f5",
                        fontWeight: 700,
                    }}
                >
                    <div>When</div>
                    <div>Action</div>
                    <div>Entity</div>
                    <div>Message</div>
                    <div>Actor</div>
                    <div>Open</div>
                </div>

                {items.map((r) => {
                    const link = entityLink(r);
                    return (
                        <div
                            key={r.id}
                            style={{
                                display: "grid",
                                gridTemplateColumns: "210px 160px 160px 1fr 180px 140px",
                                padding: 10,
                                borderTop: "1px solid #eee",
                                alignItems: "center",
                            }}
                        >
                            <div>{new Date(r.createdAt).toLocaleString()}</div>
                            <div>{pretty(r.action)}</div>
                            <div>
                                {r.entityType}
                                {r.entityId ? (
                                    <div style={{ fontSize: 12, color: "#666", wordBreak: "break-all" }}>{r.entityId}</div>
                                ) : null}
                            </div>
                            <div style={{ color: "#333" }}>
                                {r.meta?.reason || r.meta?.message || "-"}
                            </div>

                            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {r.actor?.email || r.actorUserId || "-"}
                            </div>
                            <div>
                                {link ? <Link to={link}>View</Link> : <span style={{ color: "#999" }}>—</span>}
                            </div>
                        </div>
                    );
                })}

                {!loading && items.length === 0 ? (
                    <div style={{ padding: 12, color: "#555" }}>No audit logs found.</div>
                ) : null}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
                <div>Total: {total}</div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <button disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                        Prev
                    </button>
                    <div>Page {page}</div>
                    <button disabled={!hasMore || loading} onClick={() => setPage((p) => p + 1)}>
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
}
