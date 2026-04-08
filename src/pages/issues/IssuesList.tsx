import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Search, RefreshCw, Copy } from "lucide-react";
import {
  getIssues, type IssueListItem, type IssueStatus,
  type IssueSeverity, type IssueCategory, type IssueReason,
} from "@/api/adminIssues";
import StatusBadge from "@/components/ui/StatusBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import {
  TableRoot, Table, TableHead, TableBody,
  TableRow, Th, Td, TableEmpty, TableSkeleton,
} from "@/components/ui/Table";
import { cn } from "@/lib/utils";

/* ── Helpers ─────────────────────────────────────────────────────── */
function relTime(d: Date) {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text); }
  catch { /* fallback */ const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); }
}

function SeverityBadge({ severity }: { severity?: IssueSeverity | string | null }) {
  const s = String(severity || "MEDIUM").toUpperCase();
  if (s === "HIGH")   return <Badge variant="danger">HIGH</Badge>;
  if (s === "LOW")    return <Badge variant="info">LOW</Badge>;
  return <Badge variant="warning">MED</Badge>;
}

type IssueType = "TASK" | "HELPER" | "GENERAL";
function TypeBadge({ type }: { type: IssueType }) {
  if (type === "TASK")   return <Badge variant="success">TASK</Badge>;
  if (type === "HELPER") return <Badge variant="warning">HELPER</Badge>;
  return <Badge variant="purple">GENERAL</Badge>;
}

function UserCell({ user, label = "—" }: { user?: { id?: string; name?: string; email?: string | null } | null; label?: string }) {
  if (!user) return <span className="text-gray-400">{label}</span>;
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <span className="font-medium text-gray-900 truncate">{user.name || "—"}</span>
        {user.id && (
          <Link to={`/admin/users/${user.id}`} onClick={(e) => e.stopPropagation()} className="shrink-0 text-xs text-blue-600 hover:underline">↗</Link>
        )}
      </div>
      {user.email && <div className="text-xs text-gray-400 truncate">{user.email}</div>}
    </div>
  );
}

const STATUS_TABS: { value: IssueStatus | "ALL"; label: string }[] = [
  { value: "OPEN",      label: "Open"      },
  { value: "IN_REVIEW", label: "In Review" },
  { value: "RESOLVED",  label: "Resolved"  },
  { value: "CLOSED",    label: "Closed"    },
  { value: "ALL",       label: "All"       },
];

const PAGE_SIZE = 20;

export default function IssuesList() {
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();

  const [status,     setStatus]     = useState<IssueStatus | "ALL">((sp.get("status") as any) || "OPEN");
  const [category,   setCategory]   = useState<IssueCategory | "ALL">((sp.get("category") as any) || "ALL");
  const [reason,     setReason]     = useState<IssueReason | "ALL">((sp.get("reason") as any) || "ALL");
  const [assignedTo, setAssignedTo] = useState("ALL");
  const [search,     setSearch]     = useState("");
  const [page,       setPage]       = useState(1);

  const [items,   setItems]   = useState<IssueListItem[]>([]);
  const [total,   setTotal]   = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState<string | null>(null);

  async function load(p = page) {
    setLoading(true); setErr(null);
    try {
      const data = await getIssues({
        status:     status     === "ALL" ? undefined : status,
        assignedTo: assignedTo === "ALL" ? undefined : assignedTo,
        category:   category   === "ALL" ? undefined : category,
        reason:     reason     === "ALL" ? undefined : reason,
        search:     search.trim() || undefined,
        page: p, pageSize: PAGE_SIZE,
      });
      setItems(data.items || []);
      setTotal(data.total || 0);
      setHasMore(!!data.hasMore);
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? (e as { message?: string })?.message ?? "Failed to load");
    } finally { setLoading(false); }
  }

  useEffect(() => { load(page); }, [status, assignedTo, category, reason, page]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const next: Record<string, string> = {};
    if (status   !== "ALL") next.status   = status;
    if (category !== "ALL") next.category = category;
    if (reason   !== "ALL") next.reason   = reason;
    if (assignedTo !== "ALL") next.assignedTo = assignedTo;
    if (search.trim()) next.search = search.trim();
    setSp(next, { replace: true });
  }, [status, category, reason, assignedTo, search]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      if (search.trim().length >= 2) { if (page !== 1) setPage(1); else load(1); }
    }, 450);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const stats = useMemo(() => ({
    open:     items.filter((i) => i.status === "OPEN").length,
    inReview: items.filter((i) => i.status === "IN_REVIEW").length,
    resolved: items.filter((i) => i.status === "RESOLVED").length,
    closed:   items.filter((i) => i.status === "CLOSED").length,
  }), [items]);

  const selectCls = "rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30";

  return (
    <div>
      <PageHeader
        title="Issues"
        subtitle="Task disputes + general support reports. Human reviewed."
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="default" className="text-sm px-3 py-1">{total.toLocaleString()} total</Badge>
            <Button variant="secondary" size="sm" onClick={() => load(page)} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        }
      />

      {/* Status tabs */}
      <div className="mb-3 flex gap-1 rounded-xl border border-gray-200 bg-white p-1 w-fit shadow-sm">
        {STATUS_TABS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => { setPage(1); setStatus(value); }}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors border-none",
              status === value ? "bg-surface text-white shadow-sm" : "text-gray-500 hover:text-gray-800 hover:bg-gray-100 bg-transparent"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Stats pills */}
      <div className="mb-3 flex gap-2">
        <Badge variant="success">Open: {stats.open}</Badge>
        <Badge variant="info">In review: {stats.inReview}</Badge>
        <Badge variant="purple">Resolved: {stats.resolved}</Badge>
        <Badge variant="default">Closed: {stats.closed}</Badge>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select value={category} onChange={(e) => { setPage(1); setCategory(e.target.value as any); }} className={selectCls}>
          <option value="ALL">All categories</option>
          <option value="RATINGS_SAFETY">Ratings safety</option>
          <option value="TASK_DISPUTE">Task dispute</option>
          <option value="SUPPORT">Support</option>
        </select>

        <select value={reason} onChange={(e) => { setPage(1); setReason(e.target.value as any); }} className={selectCls}>
          <option value="ALL">All reasons</option>
          <option value="LOW_RATING_WATCHLIST">Low rating watchlist</option>
          <option value="MISBEHAVIOUR">Misbehaviour</option>
          <option value="PAYMENT_PROBLEM">Payment problem</option>
          <option value="OTHER">Other</option>
        </select>

        <select value={assignedTo} onChange={(e) => { setPage(1); setAssignedTo(e.target.value); }} className={selectCls}>
          <option value="ALL">All assignees</option>
          <option value="UNASSIGNED">Unassigned</option>
        </select>

        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search issue / task ID, user name, email…"
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
              <Th>Created</Th>
              <Th>Status</Th>
              <Th>Severity</Th>
              <Th>Type / Task</Th>
              <Th>Reporter</Th>
              <Th>Reported user</Th>
              <Th>Assignee</Th>
              <Th></Th>
            </tr>
          </TableHead>
          <TableBody>
            {loading && items.length === 0
              ? <TableSkeleton colSpan={8} />
              : items.length === 0
              ? <TableEmpty   colSpan={8} message="No issues found." />
              : items.map((it) => {
                  const type: IssueType = it.task?.id ? "TASK" : (it.reportedUser?.id || (it as any).reportedUserId) ? "HELPER" : "GENERAL";
                  const created = new Date(it.createdAt);

                  return (
                    <TableRow key={it.id} clickable onClick={() => nav(`/admin/issues/${it.id}`)}>
                      <Td className="text-xs whitespace-nowrap">
                        <div className="font-medium text-gray-800">{created.toLocaleDateString()}</div>
                        <div className="text-gray-400">{relTime(created)}</div>
                      </Td>

                      <Td><StatusBadge status={it.status as any} size="compact" /></Td>

                      <Td><SeverityBadge severity={it.severity} /></Td>

                      <Td className="max-w-[220px]">
                        <div className="flex items-center gap-2 mb-1">
                          <TypeBadge type={type} />
                          <span className="truncate text-sm font-medium text-gray-800">
                            {type === "TASK" ? (it.task?.title || "Task") : type === "HELPER" ? "Helper report" : "General"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {it.category && <Badge variant="default" className="text-[10px]">{it.category}</Badge>}
                          <button
                            onClick={async (e) => { e.stopPropagation(); await copyText(it.id); }}
                            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium border border-gray-200 bg-white text-gray-500 hover:text-gray-800 hover:border-gray-300 transition-colors cursor-pointer"
                            title="Copy issue ID"
                          >
                            <Copy className="h-2.5 w-2.5" /> ID
                          </button>
                          {type === "TASK" && it.task?.id && (
                            <button
                              onClick={async (e) => { e.stopPropagation(); await copyText(it.task!.id); }}
                              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium border border-gray-200 bg-white text-gray-500 hover:text-gray-800 hover:border-gray-300 transition-colors cursor-pointer"
                              title="Copy task ID"
                            >
                              <Copy className="h-2.5 w-2.5" /> Task
                            </button>
                          )}
                        </div>
                      </Td>

                      <Td className="max-w-[160px]">
                        <UserCell user={it.reporter} />
                      </Td>

                      <Td className="max-w-[160px]">
                        {it.reportedUser
                          ? <UserCell user={it.reportedUser} />
                          : <span className="text-gray-400">{type === "GENERAL" ? "—" : "Unknown"}</span>
                        }
                      </Td>

                      <Td>
                        {it.assignedTo
                          ? <span className="text-sm font-medium text-gray-700">{it.assignedTo.name}</span>
                          : <span className="text-gray-400 text-sm">Unassigned</span>
                        }
                      </Td>

                      <Td>
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); nav(`/admin/issues/${it.id}`); }}>
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
