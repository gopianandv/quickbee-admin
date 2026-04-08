import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, Download, Filter, X } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { adminListPlatformFees, adminExportPlatformFees } from "@/api/adminPlatformFeeLedgerApi";
import type { PlatformFeeRow } from "@/api/adminPlatformFeeLedgerApi";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import {
  TableRoot, Table, TableHead, TableBody,
  TableRow, Th, Td, TableEmpty, TableSkeleton,
} from "@/components/ui/Table";

function formatINR(paise: number) {
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  return `${sign}₹${(abs / 100).toFixed(2)}`;
}

const selectCls =
  "rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30";
const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30";

export default function PlatformFeeLedgerList() {
  const [sp, setSp] = useSearchParams();

  const page     = Math.max(1, Number(sp.get("page")     ?? "1"));
  const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize") ?? "20")));

  const [kind,   setKind]   = useState(sp.get("kind")   ?? "");
  const [via,    setVia]    = useState(sp.get("via")     ?? "");
  const [search, setSearch] = useState(sp.get("search")  ?? "");
  const [userId, setUserId] = useState(sp.get("userId")  ?? "");

  const [loading,    setLoading]    = useState(false);
  const [rows,       setRows]       = useState<PlatformFeeRow[]>([]);
  const [total,      setTotal]      = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [exporting,  setExporting]  = useState(false);
  const [exportErr,  setExportErr]  = useState<string | null>(null);

  const hasFilters = Boolean(userId || kind || via || search);

  async function load() {
    setLoading(true);
    try {
      const data = await adminListPlatformFees({
        page, pageSize,
        userId: userId || undefined,
        kind:   kind   || undefined,
        via:    via    || undefined,
        search: search || undefined,
      });
      setRows(data.data);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setKind(sp.get("kind")   ?? "");
    setVia(sp.get("via")     ?? "");
    setSearch(sp.get("search") ?? "");
    setUserId(sp.get("userId") ?? "");
    load();
  }, [page, pageSize, sp.toString()]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setExportErr(null); }, [kind, via, search, userId]);

  function apply() {
    setSp((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", "1"); next.set("pageSize", String(pageSize));
      if (userId) next.set("userId", userId); else next.delete("userId");
      if (kind)   next.set("kind",   kind);   else next.delete("kind");
      if (via)    next.set("via",    via);    else next.delete("via");
      if (search) next.set("search", search); else next.delete("search");
      return next;
    });
  }

  function clear() {
    setKind(""); setVia(""); setSearch(""); setUserId("");
    setSp(new URLSearchParams({ page: "1", pageSize: String(pageSize) }));
  }

  function go(p: number) {
    setSp((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", String(p)); next.set("pageSize", String(pageSize));
      if (userId) next.set("userId", userId); else next.delete("userId");
      if (kind)   next.set("kind",   kind);   else next.delete("kind");
      if (via)    next.set("via",    via);    else next.delete("via");
      if (search) next.set("search", search); else next.delete("search");
      return next;
    });
  }

  function clearUserId() {
    setUserId("");
    setSp((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("userId"); next.set("page", "1");
      return next;
    });
  }

  async function doExport() {
    try {
      setExportErr(null); setExporting(true);
      const blob = await adminExportPlatformFees({
        userId: sp.get("userId") || undefined,
        from:   sp.get("from")   || undefined,
        to:     sp.get("to")     || undefined,
        kind:   sp.get("kind")   || undefined,
        via:    sp.get("via")    || undefined,
        search: sp.get("search") || undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "platform-fee-ledger.xlsx";
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setExportErr(e?.response?.data?.error || e?.message || "Export failed");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      {/* userId filter banner */}
      {userId && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-sm text-blue-700">
          <span>
            Filtering by user ID:{" "}
            <span className="font-mono">{userId}</span>
          </span>
          <Button variant="ghost" size="sm" onClick={clearUserId}>
            <X className="h-3.5 w-3.5" /> Clear user filter
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <Filter className="h-4 w-4 text-gray-400 shrink-0 mb-2" />

        <div className="flex flex-col gap-1 min-w-[200px]">
          <label className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">Kind</label>
          <select value={kind} onChange={(e) => setKind(e.target.value)} className={selectCls}>
            <option value="">All</option>
            <option value="DUE">DUE</option>
            <option value="PAYMENT">PAYMENT</option>
            <option value="ADJUSTMENT_CREDIT">ADJUSTMENT_CREDIT</option>
            <option value="ADJUSTMENT_DEBIT">ADJUSTMENT_DEBIT</option>
          </select>
        </div>

        <div className="flex flex-col gap-1 min-w-[140px]">
          <label className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">Via</label>
          <select value={via} onChange={(e) => setVia(e.target.value)} className={selectCls}>
            <option value="">All</option>
            <option value="APP">APP</option>
            <option value="CASH">CASH</option>
          </select>
        </div>

        <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
          <label className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">Search user</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && apply()}
            placeholder="email / name…"
            className={inputCls}
          />
        </div>

        <div className="flex items-center gap-2 pb-0.5">
          <Button variant="primary" size="md" onClick={apply} disabled={loading}>
            <Search className="h-3.5 w-3.5" /> Apply
          </Button>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clear}>Clear</Button>
          )}
          <Button variant="secondary" size="md" onClick={doExport} disabled={exporting}>
            <Download className="h-3.5 w-3.5" />
            {exporting ? "Exporting…" : "Export"}
          </Button>
        </div>

        <div className="ml-auto">
          <Badge variant="default" className="text-sm px-3 py-1">{total.toLocaleString()} rows</Badge>
        </div>
      </div>

      <ErrorMessage message={exportErr} className="mb-3" />

      <TableRoot>
        <Table>
          <TableHead>
            <tr>
              <Th>Created</Th>
              <Th>User</Th>
              <Th>Amount</Th>
              <Th>Kind</Th>
              <Th>Via</Th>
              <Th>Links</Th>
            </tr>
          </TableHead>
          <TableBody>
            {loading && rows.length === 0
              ? <TableSkeleton colSpan={6} />
              : rows.length === 0
              ? <TableEmpty colSpan={6} message="No platform fee rows found." />
              : rows.map((r) => (
                  <TableRow key={r.id}>
                    <Td className="text-xs text-gray-500 whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleString()}
                      <div className="mt-0.5">
                        <Link to={`/admin/finance/platform-fees/${r.id}`} className="text-blue-600 hover:underline text-xs">
                          View
                        </Link>
                      </div>
                    </Td>
                    <Td>
                      <Link to={`/admin/users/${r.userId}`} className="font-semibold text-blue-600 hover:underline truncate block max-w-[200px]">
                        {r.user?.email ?? r.userId}
                      </Link>
                      {r.user?.name && <div className="text-xs text-gray-400">{r.user.name}</div>}
                    </Td>
                    <Td className="font-mono font-semibold text-gray-800">{formatINR(r.amountPaise)}</Td>
                    <Td>
                      <Badge variant="default" className="text-xs font-mono">{r.kind}</Badge>
                    </Td>
                    <Td>
                      {r.via ? <StatusBadge status={r.via} /> : <span className="text-gray-400">—</span>}
                    </Td>
                    <Td>
                      {r.task?.id ? (
                        <Link to={`/admin/tasks/${r.task.id}`} className="text-blue-600 hover:underline text-xs">
                          Task
                        </Link>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </Td>
                  </TableRow>
                ))
            }
          </TableBody>
        </Table>
      </TableRoot>

      {/* Pagination */}
      <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
        <span>Page <b>{page}</b> / {totalPages}</span>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => go(1)}>First</Button>
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => go(page - 1)}>← Prev</Button>
          <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => go(page + 1)}>Next →</Button>
          <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => go(totalPages)}>Last</Button>
        </div>
      </div>
    </div>
  );
}
