import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { adminListUsers, type UserPermissionRow } from "@/api/adminUsers";
import StatusBadge from "@/components/ui/StatusBadge";

function pill(text: string) {
  return (
    <span
      style={{
        display: "inline-flex",
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 800,
        background: "#F3F4F6",
        border: "1px solid #E5E7EB",
        color: "#111827",
        lineHeight: "16px",
      }}
    >
      {text}
    </span>
  );
}

function permPill(text: string) {
  return (
    <span
      style={{
        display: "inline-flex",
        padding: "3px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 900,
        background: "#EAF2FF",
        color: "#0B3A88",
        border: "1px solid #BFD6FF",
        lineHeight: "16px",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

const SYSTEM_PERMISSIONS = ["ADMIN", "KYC_REVIEW", "FINANCE", "SUPPORT"] as const;

export default function AdminUsersList() {
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();

  const initialRole = sp.get("role") || "ALL";
  const initialPermission = sp.get("permission") || "ALL";
  const initialSearch = sp.get("search") || "";
  const initialPage = Math.max(1, Number(sp.get("page") || 1));

  const [role, setRole] = useState<string>(initialRole);
  const [permission, setPermission] = useState<string>(initialPermission);
  const [search, setSearch] = useState<string>(initialSearch);
  const [page, setPage] = useState<number>(initialPage);
  const pageSize = 20;

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load(p = page) {
    setLoading(true);
    setErr(null);
    try {
      const data = await adminListUsers({
        page: p,
        pageSize,
        role: role === "ALL" ? undefined : role,
        permission: permission === "ALL" ? undefined : permission,
        search: search.trim() || undefined,
      });
      setItems(data.items || []);
      setTotal(data.total || 0);
      setHasMore(!!data.hasMore);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, permission, page]);

  useEffect(() => {
    const next: any = {};
    if (role && role !== "ALL") next.role = role;
    if (permission && permission !== "ALL") next.permission = permission;
    if (search.trim()) next.search = search.trim();
    if (page !== 1) next.page = String(page);
    setSp(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, permission, search, page]);

  function renderPermissions(perms?: UserPermissionRow[]) {
    const p = Array.isArray(perms) ? perms : [];
    if (p.length === 0) return <span style={{ color: "#6B7280" }}>—</span>;

    const names = p.map((x) => String(x.permission || "").toUpperCase()).filter(Boolean);
    const top = names.slice(0, 2);
    const extra = names.length - top.length;

    return (
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        {top.map((t) => (
          <span key={t}>{permPill(t)}</span>
        ))}
        {extra > 0 ? <span>{permPill(`+${extra}`)}</span> : null}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: "30px auto", fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Users</h2>
          <div style={{ color: "#6B7280", marginTop: 6 }}>
            Browse users. Click a row to open profile details.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {pill(`Total: ${total}`)}
          <button
            onClick={() => load(page)}
            disabled={loading}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E7EB", background: "#fff", cursor: "pointer" }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 16 }}>
        <select
          value={role}
          onChange={(e) => {
            setPage(1);
            setRole(e.target.value);
          }}
          style={{ padding: 10, borderRadius: 10, border: "1px solid #E5E7EB", background: "#fff" }}
        >
          <option value="ALL">All roles</option>
          <option value="HELPER">Helper</option>
          <option value="CONSUMER">Consumer</option>
        </select>

        {/* Permission filter */}
        <select
          value={permission}
          onChange={(e) => {
            setPage(1);
            setPermission(e.target.value);
          }}
          style={{ padding: 10, borderRadius: 10, border: "1px solid #E5E7EB", background: "#fff", minWidth: 180 }}
        >
          <option value="ALL">All permissions</option>
          {SYSTEM_PERMISSIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name/email…"
          style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid #E5E7EB", background: "#fff" }}
        />

        <button
          onClick={() => {
            setPage(1);
            load(1);
          }}
          disabled={loading}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #111827",
            background: "#111827",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Search
        </button>
      </div>

      {err && <div style={{ color: "crimson", marginTop: 12 }}>{err}</div>}
      {loading ? <div style={{ marginTop: 12 }}>Loading…</div> : null}

      {/* Table */}
      <div style={{ marginTop: 14, border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "200px 1.2fr 1.2fr 140px 220px 160px 120px",
            padding: 12,
            background: "#F9FAFB",
            fontWeight: 800,
            color: "#111827",
            borderBottom: "1px solid #E5E7EB",
          }}
        >
          <div>Created</div>
          <div>Name</div>
          <div>Email</div>
          <div>Role</div>
          <div>Permissions</div>
          <div>Tasks</div>
          <div></div>
        </div>

        {items.map((u) => {
          const posted = u.tasksPosted ?? u._count?.tasksPosted ?? 0;
          const taken = u.tasksTaken ?? u._count?.tasksTaken ?? 0;

          return (
            <div
              key={u.id}
              style={{
                display: "grid",
                gridTemplateColumns: "200px 1.2fr 1.2fr 140px 220px 160px 120px",
                padding: 12,
                borderBottom: "1px solid #F3F4F6",
                alignItems: "center",
                cursor: "pointer",
              }}
              onClick={() => nav(`/admin/users/${u.id}`)}
              title="Open user profile"
            >
              <div style={{ fontWeight: 600 }}>{new Date(u.createdAt).toLocaleString()}</div>

              <div style={{ fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</span>
                  {u.isDisabled ? <StatusBadge status="DISABLED" /> : null}
                </div>
                {u.profile?.displayName ? (
                  <div style={{ fontSize: 12, color: "#6B7280" }}>{u.profile.displayName}</div>
                ) : null}
              </div>

              <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#111827" }}>
                {u.email}
              </div>

              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                <StatusBadge status={String(u.role || "-").toUpperCase()} />
              </div>

              <div>{renderPermissions(u.permissions)}</div>

              <div style={{ color: "#374151", fontWeight: 700 }}>
                Posted: {posted} · Taken: {taken}
              </div>

              <div style={{ textAlign: "right" }}>
                <Link
                  to={`/admin/users/${u.id}`}
                  onClick={(e) => e.stopPropagation()}
                  style={{ fontWeight: 800, textDecoration: "none" }}
                >
                  View →
                </Link>
              </div>
            </div>
          );
        })}

        {!loading && items.length === 0 ? <div style={{ padding: 16, color: "#6B7280" }}>No users found.</div> : null}
      </div>

      {/* Pagination */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
        <div style={{ color: "#6B7280" }}>
          Showing {items.length} of {total}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #E5E7EB", background: "#fff", cursor: "pointer" }}
          >
            Prev
          </button>
          <div style={{ fontWeight: 800 }}>Page {page}</div>
          <button
            disabled={!hasMore || loading}
            onClick={() => setPage((p) => p + 1)}
            style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #E5E7EB", background: "#fff", cursor: "pointer" }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
