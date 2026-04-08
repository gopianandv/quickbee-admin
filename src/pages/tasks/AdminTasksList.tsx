import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, Download, X } from "lucide-react";
import { adminListTasks, adminExportTasks, type TaskListItem } from "@/api/adminTasks";
import StatusBadge from "@/components/ui/StatusBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import {
  TableRoot, Table, TableHead, TableBody,
  TableRow, Th, Td, TableEmpty, TableSkeleton,
} from "@/components/ui/Table";
import {
  adminListCategories,
  adminListSkills,
  type AdminCategory,
  type AdminSkill,
} from "@/api/adminTaxonomyApi";

type StatusOption = { label: string; value: string };

const PAGE_SIZE = 20;

const STATUS_OPTIONS: StatusOption[] = [
  { label: "All statuses",                  value: "" },
  { label: "New",                           value: "NEW" },
  { label: "Accepted",                      value: "ACCEPTED" },
  { label: "In Progress",                   value: "IN_PROGRESS" },
  { label: "Pending Consumer Confirm",      value: "PENDING_CONSUMER_CONFIRM" },
  { label: "Completed",                     value: "COMPLETED" },
  { label: "Cancelled",                     value: "CANCELLED" },
  { label: "Expired",                       value: "EXPIRED" },
];

function moneyRs(paise?: number | null) {
  return ((Number(paise ?? 0)) / 100).toFixed(2);
}

function selectCls(extra = "") {
  return `rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30 ${extra}`;
}

export default function AdminTasksList() {
  const [sp, setSp] = useSearchParams();

  const appliedOpen          = sp.get("open")           === "1";
  const appliedStatus        = sp.get("status")         ?? "";
  const appliedSearch        = sp.get("search")         ?? "";
  const appliedCategoryId    = sp.get("categoryId")     ?? "";
  const appliedSkillId       = sp.get("skillId")        ?? "";
  const appliedPaymentMode   = sp.get("paymentMode")    ?? "";
  const appliedPostedByQuery = sp.get("postedByQuery")  ?? "";
  const appliedAssignedQuery = sp.get("assignedToQuery")?? "";
  const page                 = Math.max(1, Number(sp.get("page") ?? "1"));

  // Draft filter state (local before Apply)
  const [status,        setStatus]        = useState(appliedStatus);
  const [search,        setSearch]        = useState(appliedSearch);
  const [paymentMode,   setPaymentMode]   = useState(appliedPaymentMode);
  const [postedByQuery, setPostedByQuery] = useState(appliedPostedByQuery);
  const [assignedQuery, setAssignedQuery] = useState(appliedAssignedQuery);

  // Taxonomy
  const [cats,        setCats]        = useState<AdminCategory[]>([]);
  const [skills,      setSkills]      = useState<AdminSkill[]>([]);
  const [taxoLoading, setTaxoLoading] = useState(false);

  // Data
  const [items,   setItems]   = useState<TaskListItem[]>([]);
  const [total,   setTotal]   = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState<string | null>(null);

  // Keep local drafts in sync with URL (back/forward)
  useEffect(() => {
    setStatus(appliedStatus);
    setSearch(appliedSearch);
    setPaymentMode(appliedPaymentMode);
    setPostedByQuery(appliedPostedByQuery);
    setAssignedQuery(appliedAssignedQuery);
  }, [appliedStatus, appliedSearch, appliedPaymentMode, appliedPostedByQuery, appliedAssignedQuery]);

  // Load taxonomy
  async function loadTaxonomy() {
    setTaxoLoading(true);
    try {
      const [cdata, sdata] = await Promise.all([
        adminListCategories({ page: 1, pageSize: 500, q: undefined, isActive: true }),
        adminListSkills({    page: 1, pageSize: 1000, q: undefined, isActive: true, categoryId: appliedCategoryId || undefined }),
      ]);
      setCats(cdata.data   || []);
      setSkills(sdata.data || []);
    } catch {
      setCats([]);
      setSkills([]);
    } finally {
      setTaxoLoading(false);
    }
  }

  useEffect(() => { loadTaxonomy(); }, [appliedCategoryId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load tasks whenever URL changes
  async function loadFromUrl() {
    setLoading(true);
    setErr(null);
    try {
      const data = await adminListTasks({
        status:          appliedStatus        || undefined,
        search:          appliedSearch.trim() || undefined,
        page, pageSize:  PAGE_SIZE,
        categoryId:      appliedCategoryId    || undefined,
        skillId:         appliedSkillId       || undefined,
        open:            appliedOpen ? "1"    : undefined,
        paymentMode:     (appliedPaymentMode as any) || undefined,
        postedByQuery:   appliedPostedByQuery || undefined,
        assignedToQuery: appliedAssignedQuery || undefined,
      } as any);
      setItems(data.items || []);
      setTotal(data.total || 0);
      setHasMore(!!data.hasMore);
    } catch (e: unknown) {
      setErr(
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        (e as { message?: string })?.message ?? "Failed to load tasks"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadFromUrl(); }, [sp.toString()]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onExport() {
    try {
      const res = await adminExportTasks({
        status:          appliedStatus     || undefined,
        search:          appliedSearch.trim() || undefined,
        categoryId:      appliedCategoryId || undefined,
        skillId:         appliedSkillId    || undefined,
        postedById:      appliedPostedByQuery || undefined,
        assignedToId:    appliedAssignedQuery || undefined,
        paymentMode:     (appliedPaymentMode as any) || undefined,
        open:            appliedOpen ? "1" : undefined,
        fromDate:        sp.get("fromDate") ?? undefined,
        toDate:          sp.get("toDate")   ?? undefined,
      });
      const cd       = res.headers?.["content-disposition"] ?? "";
      const match    = typeof cd === "string" ? cd.match(/filename="?([^"]+)"?/i) : null;
      const filename = match?.[1] || `tasks_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
      const url      = URL.createObjectURL(res.data);
      const a        = Object.assign(document.createElement("a"), { href: url, download: filename });
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      alert(
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        (e as { message?: string })?.message ?? "Export failed"
      );
    }
  }

  // URL helpers
  function setUrlParam(key: string, value?: string | null) {
    setSp((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", "1");
      if (value?.trim()) next.set(key, value.trim()); else next.delete(key);
      return next;
    });
  }

  function applyFilters() {
    setSp((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", "1");
      if (search.trim())        next.set("search",        search.trim()); else next.delete("search");
      if (status)               next.set("status",        status);        else next.delete("status");
      if (paymentMode.trim())   next.set("paymentMode",   paymentMode);   else next.delete("paymentMode");
      if (postedByQuery.trim()) next.set("postedByQuery", postedByQuery); else next.delete("postedByQuery");
      if (assignedQuery.trim()) next.set("assignedToQuery", assignedQuery); else next.delete("assignedToQuery");
      return next;
    });
  }

  function toggleOpen(next: boolean) {
    setSp((prev) => {
      const n = new URLSearchParams(prev);
      n.set("page", "1");
      if (next) { n.set("open", "1"); n.delete("status"); setStatus(""); }
      else       { n.delete("open"); }
      return n;
    });
  }

  function clearFilters() {
    setStatus(""); setSearch(""); setPaymentMode(""); setPostedByQuery(""); setAssignedQuery("");
    setSp((prev) => {
      const n = new URLSearchParams(prev);
      ["status","search","categoryId","skillId","open","paymentMode","postedByQuery","assignedToQuery"].forEach((k) => n.delete(k));
      n.set("page", "1");
      return n;
    });
  }

  function goToPage(p: number) {
    setSp((prev) => { const n = new URLSearchParams(prev); n.set("page", String(Math.max(1, p))); return n; });
  }

  const isFiltered  = Boolean(appliedCategoryId || appliedSkillId || appliedOpen || appliedStatus || appliedSearch || appliedPaymentMode || appliedPostedByQuery || appliedAssignedQuery);
  const sortedCats  = useMemo(() => cats.slice().sort((a, b) => a.name.localeCompare(b.name)), [cats]);
  const sortedSkills = useMemo(() => skills.slice().sort((a, b) => a.name.localeCompare(b.name)), [skills]);

  return (
    <div>
      <PageHeader
        title="Tasks"
        subtitle={isFiltered ? "Filters applied — showing a subset." : "All tasks on the platform."}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="default" className="text-sm px-3 py-1">{total.toLocaleString()} total</Badge>
            <Button variant="secondary" size="sm" onClick={onExport} disabled={loading}>
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {/* Status */}
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setSp((prev) => {
              const n = new URLSearchParams(prev);
              n.set("page", "1");
              if (e.target.value) n.set("status", e.target.value); else n.delete("status");
              n.delete("open");
              return n;
            });
          }}
          className={selectCls("min-w-[170px]")}
          disabled={appliedOpen}
        >
          {STATUS_OPTIONS.map((o) => <option key={o.value || "_all"} value={o.value}>{o.label}</option>)}
        </select>

        {/* Open only toggle */}
        <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm cursor-pointer select-none shadow-sm">
          <input type="checkbox" checked={appliedOpen} onChange={(e) => toggleOpen(e.target.checked)} className="accent-amber-500" />
          Open only
        </label>

        {/* Category */}
        <select
          value={appliedCategoryId}
          onChange={(e) => {
            setSp((prev) => {
              const n = new URLSearchParams(prev);
              n.set("page", "1");
              if (e.target.value) n.set("categoryId", e.target.value); else n.delete("categoryId");
              n.delete("skillId");
              return n;
            });
          }}
          className={selectCls("min-w-[200px]")}
          disabled={taxoLoading}
        >
          <option value="">All categories</option>
          {sortedCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {/* Skill */}
        <select
          value={appliedSkillId}
          onChange={(e) => setUrlParam("skillId", e.target.value)}
          className={selectCls("min-w-[200px]")}
          disabled={taxoLoading || sortedSkills.length === 0}
        >
          <option value="">All skills</option>
          {sortedSkills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        {/* Payment mode */}
        <select
          value={paymentMode}
          onChange={(e) => {
            setPaymentMode(e.target.value);
            setSp((prev) => {
              const n = new URLSearchParams(prev);
              n.set("page", "1");
              if (e.target.value) n.set("paymentMode", e.target.value); else n.delete("paymentMode");
              return n;
            });
          }}
          className={selectCls()}
        >
          <option value="">All payments</option>
          <option value="APP">APP</option>
          <option value="CASH">CASH</option>
        </select>

        {/* Poster */}
        <input
          value={postedByQuery}
          onChange={(e) => setPostedByQuery(e.target.value)}
          placeholder="Poster name / email"
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30 w-44"
        />

        {/* Helper */}
        <input
          value={assignedQuery}
          onChange={(e) => setAssignedQuery(e.target.value)}
          placeholder="Helper name / email"
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30 w-44"
        />

        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            placeholder="Search by title…"
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
          />
        </div>

        <Button variant="primary" size="md" onClick={applyFilters} disabled={loading}>
          <Search className="h-3.5 w-3.5" />
          Search
        </Button>

        {isFiltered && (
          <Button variant="ghost" size="md" onClick={clearFilters}>
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
              <Th>Title</Th>
              <Th>Status</Th>
              <Th>Payment</Th>
              <Th>Escrow</Th>
              <Th>Poster</Th>
              <Th></Th>
            </tr>
          </TableHead>
          <TableBody>
            {loading && items.length === 0
              ? <TableSkeleton colSpan={7} />
              : items.length === 0
              ? <TableEmpty   colSpan={7} message="No tasks found." />
              : items.map((t) => {
                  const payment     = String((t as any).paymentMode || "—").toUpperCase();
                  const escrowStatus = (t as any).escrow?.status ? String((t as any).escrow.status) : null;
                  const escrowAmt    = (t as any).escrow?.amountPaise ?? null;
                  const poster       = (t as any).postedBy;

                  return (
                    <TableRow key={t.id}>
                      <Td className="text-xs text-gray-500 whitespace-nowrap">
                        {new Date((t as any).createdAt).toLocaleString()}
                      </Td>

                      <Td className="max-w-[240px]">
                        <span className="block truncate font-medium text-gray-900">{(t as any).title}</span>
                      </Td>

                      <Td>
                        <StatusBadge status={(t as any).status} size="compact" />
                      </Td>

                      <Td>
                        <StatusBadge status={payment} label={payment} size="compact" />
                      </Td>

                      <Td>
                        <div className="flex items-center gap-2">
                          {escrowStatus
                            ? <StatusBadge status={escrowStatus} size="compact" />
                            : <span className="text-gray-400">—</span>
                          }
                          {escrowAmt != null && (
                            <span className="text-sm text-gray-700">₹{moneyRs(escrowAmt)}</span>
                          )}
                        </div>
                      </Td>

                      <Td className="max-w-[160px]">
                        {poster
                          ? <div className="flex items-center gap-1 truncate">
                              <span className="truncate text-sm">
                                {poster.name || poster.email || poster.profile?.phoneNumber || "—"}
                              </span>
                              {poster.name && !poster.email && poster.profile?.phoneNumber && (
                                <span className="text-amber-600 text-xs">📱</span>
                              )}
                            </div>
                          : <span className="text-gray-400">—</span>
                        }
                      </Td>

                      <Td>
                        <Link to={`/admin/tasks/${t.id}`}>
                          <Button variant="ghost" size="sm">View →</Button>
                        </Link>
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
          <Button variant="secondary" size="sm" disabled={page <= 1 || loading} onClick={() => goToPage(page - 1)}>
            ← Prev
          </Button>
          <span className="px-2 font-medium text-gray-700">Page {page}</span>
          <Button variant="secondary" size="sm" disabled={!hasMore || loading} onClick={() => goToPage(page + 1)}>
            Next →
          </Button>
        </div>
      </div>
    </div>
  );
}
