import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { RefreshCw, Download, Search, X } from "lucide-react";
import { adminListUsers, adminExportUsersXlsx, type UserPermissionRow } from "@/api/adminUsers";
import StatusBadge from "@/components/ui/StatusBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import {
  TableRoot, Table, TableHead, TableBody,
  TableRow, Th, Td, TableEmpty, TableSkeleton,
} from "@/components/ui/Table";
import { useToast } from "@/lib/toast";

const SYSTEM_PERMISSIONS = ["ADMIN", "KYC_REVIEW", "FINANCE", "SUPPORT"] as const;
const DELETED_FILTERS    = ["EXCLUDE", "ONLY", "ALL"] as const;
type DeletedFilter = (typeof DELETED_FILTERS)[number];

function deletedLabel(v: DeletedFilter) {
  if (v === "EXCLUDE") return "Active only";
  if (v === "ONLY")    return "Deleted only";
  return "All (incl. deleted)";
}

function PermBadges({ perms }: { perms?: UserPermissionRow[] }) {
  const p = Array.isArray(perms) ? perms : [];
  if (p.length === 0) return <span className="text-gray-400">—</span>;
  const names = p.map((x) => String(x.permission || "").toUpperCase()).filter(Boolean);
  const top   = names.slice(0, 2);
  const extra = names.length - top.length;
  return (
    <div className="flex flex-wrap gap-1">
      {top.map((t)   => <Badge key={t} variant="info">{t}</Badge>)}
      {extra > 0     && <Badge variant="info">+{extra}</Badge>}
    </div>
  );
}

const PAGE_SIZE = 20;

export default function AdminUsersList() {
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const { error: toastError, success: toastSuccess } = useToast();

  const initialRole      = sp.get("role")      || "ALL";
  const initialPerm      = sp.get("permission") || "ALL";
  const initialSearch    = sp.get("search")     || "";
  const initialPage      = Math.max(1, Number(sp.get("page") || 1));
  const rawDeleted       = sp.get("deleted")?.toUpperCase() as DeletedFilter;
  const initialDeleted   = DELETED_FILTERS.includes(rawDeleted) ? rawDeleted : "EXCLUDE";

  const [role,    setRole]    = useState(initialRole);
  const [perm,    setPerm]    = useState(initialPerm);
  const [search,  setSearch]  = useState(initialSearch);
  const [deleted, setDeleted] = useState<DeletedFilter>(initialDeleted);
  const [page,    setPage]    = useState(initialPage);

  const [items,   setItems]   = useState<any[]>([]);
  const [total,   setTotal]   = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState<string | null>(null);

  async function load(p = page) {
    setLoading(true);
    setErr(null);
    try {
      const data = await adminListUsers({
        page: p, pageSize: PAGE_SIZE,
        role:       role       === "ALL" ? undefined : role,
        permission: perm       === "ALL" ? undefined : perm,
        search:     search.trim() || undefined,
        deleted,
      });
      setItems(data.items || []);
      setTotal(data.total || 0);
      setHasMore(!!data.hasMore);
    } catch (e: unknown) {
      setErr(
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        (e as { message?: string })?.message ?? "Failed to load users"
      );
    } finally {
      setLoading(false);
    }
  }

  async function onExport() {
    try {
      const { blob, filename } = await adminExportUsersXlsx({
        role:       role === "ALL" ? undefined : role,
        permission: perm === "ALL" ? undefined : perm,
        search:     search.trim() || undefined,
        deleted,
      });
      const url = URL.createObjectURL(blob);
      const a   = Object.assign(document.createElement("a"), { href: url, download: filename });
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toastSuccess("Export ready", "Users spreadsheet downloaded.");
    } catch (e: unknown) {
      toastError(
        "Export failed",
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        (e as { message?: string })?.message ?? "Export failed"
      );
    }
  }

  // Sync to URL
  useEffect(() => {
    const next: Record<string, string> = {};
    if (role    !== "ALL")      next.role       = role;
    if (perm    !== "ALL")      next.permission = perm;
    if (search.trim())          next.search     = search.trim();
    if (deleted !== "EXCLUDE")  next.deleted    = deleted;
    if (page    !== 1)          next.page       = String(page);
    setSp(next, { replace: true });
  }, [role, perm, search, deleted, page]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload on filter/page change
  useEffect(() => { load(page); }, [role, perm, deleted, page]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Click any row to open the user profile."
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="default" className="text-sm px-3 py-1">{total.toLocaleString()} total</Badge>
            <Button variant="secondary" size="sm" onClick={() => load(page)} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="secondary" size="sm" onClick={onExport} disabled={loading}>
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={role}
          onChange={(e) => { setPage(1); setRole(e.target.value); }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
        >
          <option value="ALL">All roles</option>
          <option value="HELPER">Helper</option>
          <option value="CONSUMER">Consumer</option>
        </select>

        <select
          value={perm}
          onChange={(e) => { setPage(1); setPerm(e.target.value); }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30 min-w-[170px]"
        >
          <option value="ALL">All permissions</option>
          {SYSTEM_PERMISSIONS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>

        <select
          value={deleted}
          onChange={(e) => { setPage(1); setDeleted(e.target.value as DeletedFilter); }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30 min-w-[150px]"
        >
          {DELETED_FILTERS.map((v) => <option key={v} value={v}>{deletedLabel(v)}</option>)}
        </select>

        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { setPage(1); load(1); }}}
            placeholder="Search name / email…"
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
          />
        </div>

        <Button variant="primary" size="md" onClick={() => { setPage(1); load(1); }} disabled={loading}>
          <Search className="h-3.5 w-3.5" />
          Search
        </Button>

        {(role !== "ALL" || perm !== "ALL" || search || deleted !== "EXCLUDE") && (
          <Button
            variant="ghost" size="md"
            onClick={() => { setRole("ALL"); setPerm("ALL"); setSearch(""); setDeleted("EXCLUDE"); setPage(1); }}
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>

      <ErrorMessage message={err} className="mb-4" />

      <TableRoot>
        <Table>
          <TableHead>
            <tr>
              <Th>Created</Th>
              <Th>Name</Th>
              <Th>Email / Phone</Th>
              <Th>Role</Th>
              <Th>Permissions</Th>
              <Th>Tasks</Th>
              <Th></Th>
            </tr>
          </TableHead>
          <TableBody>
            {loading && items.length === 0
              ? <TableSkeleton colSpan={7} />
              : items.length === 0
              ? <TableEmpty  colSpan={7} message="No users found." />
              : items.map((u) => {
                  const posted = u.tasksPosted ?? u._count?.tasksPosted ?? 0;
                  const taken  = u.tasksTaken  ?? u._count?.tasksTaken  ?? 0;

                  return (
                    <TableRow
                      key={u.id}
                      clickable
                      onClick={() => nav(`/admin/users/${u.id}`)}
                      className={u.isDeleted ? "opacity-60" : ""}
                    >
                      <Td className="text-xs text-gray-500 whitespace-nowrap">
                        {new Date(u.createdAt).toLocaleString()}
                      </Td>

                      <Td>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 truncate max-w-[160px]">{u.name}</span>
                          {u.isDeleted  && <StatusBadge status="DELETED"  size="compact" />}
                          {u.isDisabled && <StatusBadge status="DISABLED" size="compact" />}
                        </div>
                        {u.profile?.displayName && (
                          <div className="text-xs text-gray-400 mt-0.5">{u.profile.displayName}</div>
                        )}
                      </Td>

                      <Td className="max-w-[180px] truncate">
                        {u.email
                          ? <span className="text-gray-700">{u.email}</span>
                          : u.profile?.phoneNumber
                          ? <span className="text-amber-700 font-medium">📱 {u.profile.phoneNumber}</span>
                          : <span className="text-gray-400">—</span>
                        }
                      </Td>

                      <Td>
                        <StatusBadge status={String(u.role || "").toUpperCase()} size="compact" />
                      </Td>

                      <Td>
                        <PermBadges perms={u.permissions} />
                      </Td>

                      <Td className="text-sm text-gray-600">
                        <span className="font-medium">{posted}</span>
                        <span className="text-gray-400 mx-1">posted</span>
                        <span className="font-medium">{taken}</span>
                        <span className="text-gray-400 ml-1">taken</span>
                      </Td>

                      <Td>
                        <Button
                          variant="ghost" size="sm"
                          onClick={(e) => { e.stopPropagation(); nav(`/admin/users/${u.id}`); }}
                        >
                          View →
                        </Button>
                      </Td>
                    </TableRow>
                  );
                })
            }
          </TableBody>
        </Table>
      </TableRoot>

      {/* Pagination */}
      <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
        <span>Showing {items.length} of {total.toLocaleString()}</span>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            ← Prev
          </Button>
          <span className="px-2 font-medium text-gray-700">Page {page}</span>
          <Button variant="secondary" size="sm" disabled={!hasMore || loading} onClick={() => setPage((p) => p + 1)}>
            Next →
          </Button>
        </div>
      </div>
    </div>
  );
}
