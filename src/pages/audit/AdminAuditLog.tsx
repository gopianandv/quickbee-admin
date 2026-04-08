import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Search, ScrollText } from "lucide-react";
import { adminListAuditLogs, type AuditLogRow } from "@/api/adminAudit";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import {
  TableRoot, Table, TableHead, TableBody,
  TableRow, Th, Td, TableEmpty, TableSkeleton,
} from "@/components/ui/Table";

function pretty(s?: string | null) {
  const v = String(s ?? "").trim();
  if (!v) return "—";
  return v.toLowerCase().split("_").filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function norm(s?: string | null) {
  return String(s ?? "").trim().toUpperCase();
}

function entityLink(row: AuditLogRow) {
  const t  = norm(row.entityType);
  const a  = norm(row.action);
  const id = row.entityId ? String(row.entityId).trim() : "";
  if (!id) return null;
  if (t === "TASK"           || a.startsWith("TASK_")) return `/admin/tasks/${id}`;
  if (t === "USER")                                     return `/admin/users/${id}`;
  if (t === "KYC_SUBMISSION" || a.startsWith("KYC_"))  return `/admin/kyc/${id}`;
  return null;
}

const PAGE_SIZE = 30;

export default function AdminAuditLog() {
  const [action,         setAction]         = useState("");
  const [entityType,     setEntityType]     = useState("");
  const [searchEntityId, setSearchEntityId] = useState("");
  const [page,           setPage]           = useState(1);

  const [items,   setItems]   = useState<AuditLogRow[]>([]);
  const [total,   setTotal]   = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState<string | null>(null);

  // Dynamic dropdowns — accumulated from API results (never shrink)
  const discoveredActionsRef  = useRef<Set<string>>(new Set());
  const discoveredEntitiesRef = useRef<Set<string>>(new Set());
  const [actionsTick,   setActionsTick]   = useState(0);
  const [entitiesTick,  setEntitiesTick]  = useState(0);

  async function load(p = page) {
    setLoading(true); setErr(null);
    try {
      const data = await adminListAuditLogs({
        action:     action     || undefined,
        entityType: entityType || undefined,
        entityId:   searchEntityId.trim() || undefined,
        page: p, pageSize: PAGE_SIZE,
      });

      const rows = (data.items || []) as AuditLogRow[];
      let addedA = false, addedE = false;

      for (const r of rows) {
        const a = norm(r.action);
        const t = String(r.entityType ?? "").trim();
        if (a && !discoveredActionsRef.current.has(a))  { discoveredActionsRef.current.add(a);  addedA = true; }
        if (t && !discoveredEntitiesRef.current.has(t)) { discoveredEntitiesRef.current.add(t); addedE = true; }
      }

      if (addedA) setActionsTick((x)  => x + 1);
      if (addedE) setEntitiesTick((x) => x + 1);

      setItems(rows);
      setTotal(data.total || 0);
      setHasMore(!!data.hasMore);
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? (e as { message?: string })?.message ?? "Failed to load audit logs");
    } finally { setLoading(false); }
  }

  useEffect(() => { load(page); }, [action, entityType, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const ACTION_OPTIONS = useMemo(() => {
    void actionsTick;
    return [{ label: "All actions", value: "" }].concat(
      Array.from(discoveredActionsRef.current).sort((a, b) => a.localeCompare(b)).map((v) => ({ label: pretty(v), value: v }))
    );
  }, [actionsTick]);

  const ENTITY_OPTIONS = useMemo(() => {
    void entitiesTick;
    return [{ label: "All entities", value: "" }].concat(
      Array.from(discoveredEntitiesRef.current).sort((a, b) => a.localeCompare(b)).map((v) => ({ label: v, value: v }))
    );
  }, [entitiesTick]);

  const selectCls = "rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30";

  return (
    <div>
      <PageHeader
        title="Audit Log"
        subtitle="All sensitive admin actions are logged here."
        actions={<Badge variant="default" className="text-sm px-3 py-1">{total.toLocaleString()} entries</Badge>}
      />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select value={action} onChange={(e) => { setPage(1); setAction(e.target.value); }} className={selectCls}>
          {ACTION_OPTIONS.map((o) => <option key={o.value || "_all"} value={o.value}>{o.label}</option>)}
        </select>

        <select value={entityType} onChange={(e) => { setPage(1); setEntityType(e.target.value); }} className={selectCls}>
          {ENTITY_OPTIONS.map((o) => <option key={o.value || "_all"} value={o.value}>{o.label}</option>)}
        </select>

        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            value={searchEntityId}
            onChange={(e) => setSearchEntityId(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { if (page !== 1) setPage(1); else load(1); } }}
            placeholder="Entity ID (taskId / userId / etc.)"
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
          />
        </div>

        <Button variant="primary" size="md" onClick={() => { if (page !== 1) setPage(1); else load(1); }} disabled={loading}>
          <Search className="h-3.5 w-3.5" /> Search
        </Button>
      </div>

      <ErrorMessage message={err} className="mb-4" />

      <TableRoot>
        <Table>
          <TableHead>
            <tr>
              <Th>When</Th>
              <Th>Action</Th>
              <Th>Entity</Th>
              <Th>Message</Th>
              <Th>Actor</Th>
              <Th></Th>
            </tr>
          </TableHead>
          <TableBody>
            {loading && items.length === 0
              ? <TableSkeleton colSpan={6} />
              : items.length === 0
              ? <TableEmpty   colSpan={6} message="No audit logs found." />
              : items.map((r) => {
                  const link    = entityLink(r);
                  const actor   = (r as any)?.actor;
                  const message = (r as any)?.meta?.reason || (r as any)?.meta?.message;

                  return (
                    <TableRow key={r.id}>
                      <Td className="text-xs text-gray-500 whitespace-nowrap">
                        {new Date(r.createdAt).toLocaleString()}
                      </Td>

                      <Td>
                        <div className="flex items-center gap-2">
                          <ScrollText className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          <span className="font-medium text-gray-800">{pretty(r.action)}</span>
                        </div>
                      </Td>

                      <Td>
                        {r.entityType && <Badge variant="default" className="mb-1">{r.entityType}</Badge>}
                        {r.entityId && (
                          <div className="text-xs text-gray-400 font-mono mt-0.5 truncate max-w-[140px]" title={r.entityId}>
                            {r.entityId}
                          </div>
                        )}
                      </Td>

                      <Td className="text-sm text-gray-600 max-w-[200px]">
                        {message || <span className="text-gray-400">—</span>}
                      </Td>

                      <Td className="max-w-[160px]">
                        {actor?.id
                          ? <Link to={`/admin/users/${actor.id}`} className="text-sm text-blue-600 hover:underline truncate block">
                              {actor.email || actor.name || r.actorUserId}
                            </Link>
                          : <span className="text-sm text-gray-500 truncate block">{r.actorUserId || "—"}</span>
                        }
                      </Td>

                      <Td>
                        {link
                          ? <Link to={link}><Button variant="ghost" size="sm">View →</Button></Link>
                          : <span className="text-gray-400">—</span>
                        }
                      </Td>
                    </TableRow>
                  );
                })
            }
          </TableBody>
        </Table>
      </TableRoot>

      <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
        <span>Showing {items.length} of {total.toLocaleString()}</span>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>← Prev</Button>
          <span className="px-2 font-medium text-gray-700">Page {page}</span>
          <Button variant="secondary" size="sm" disabled={!hasMore || loading} onClick={() => setPage((p) => p + 1)}>Next →</Button>
        </div>
      </div>
    </div>
  );
}
