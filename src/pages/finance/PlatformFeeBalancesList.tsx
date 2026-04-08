import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, Download, Filter, AlertTriangle } from "lucide-react";
import { adminListPlatformFeeBalances, adminExportPlatformFeeBalances } from "@/api/adminPlatformFeeLedgerApi";
import type { PlatformFeeBalanceItem } from "@/api/adminPlatformFeeLedgerApi";
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

function toPaise(val: string) {
  const n = Number(val);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30";

export default function PlatformFeeBalancesList() {
  const [sp, setSp] = useSearchParams();

  const page     = Math.max(1, Number(sp.get("page")     ?? "1"));
  const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize") ?? "20")));

  // URL is source of truth for applied filters
  const appliedQ              = sp.get("q")              ?? "";
  const appliedMinOutstanding = sp.get("minOutstanding") ?? "";
  const appliedOnlyDue        = (sp.get("onlyDue") ?? "") === "1";

  const [q,              setQ]              = useState(appliedQ);
  const [minOutstanding, setMinOutstanding] = useState(appliedMinOutstanding);
  const [onlyDue,        setOnlyDue]        = useState(appliedOnlyDue);

  const [loading,    setLoading]    = useState(false);
  const [rows,       setRows]       = useState<PlatformFeeBalanceItem[]>([]);
  const [total,      setTotal]      = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [degraded,   setDegraded]   = useState<{ on: boolean; reason?: string }>({ on: false });

  const [exporting, setExporting] = useState(false);
  const [exportErr, setExportErr] = useState<string | null>(null);

  // Keep inputs in sync when URL changes
  useEffect(() => {
    setQ(appliedQ);
    setMinOutstanding(appliedMinOutstanding);
    setOnlyDue(appliedOnlyDue);
  }, [appliedQ, appliedMinOutstanding, appliedOnlyDue]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasFilters = useMemo(
    () => Boolean(appliedQ.trim() || appliedMinOutstanding.trim() || appliedOnlyDue),
    [appliedQ, appliedMinOutstanding, appliedOnlyDue]
  );

  async function loadFromUrl() {
    setLoading(true);
    try {
      const minPaiseFromInput = toPaise(appliedMinOutstanding);
      const minOutstandingPaise = appliedOnlyDue
        ? Math.max(1, minPaiseFromInput || 1)
        : minPaiseFromInput;

      const data = await adminListPlatformFeeBalances({
        page, pageSize,
        q: appliedQ.trim() || undefined,
        minOutstandingPaise,
      });

      setRows(data.data);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setDegraded({ on: Boolean(data.degraded), reason: data.degradedReason });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadFromUrl(); }, [page, pageSize, sp.toString()]); // eslint-disable-line react-hooks/exhaustive-deps

  function apply() {
    setSp((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", "1"); next.set("pageSize", String(pageSize));
      const qTrim   = q.trim();
      const minTrim = minOutstanding.trim();
      if (qTrim)   next.set("q",              qTrim);   else next.delete("q");
      if (minTrim) next.set("minOutstanding", minTrim); else next.delete("minOutstanding");
      if (onlyDue) next.set("onlyDue", "1");            else next.delete("onlyDue");
      next.set("tab", "balances");
      return next;
    });
  }

  function clear() {
    setQ(""); setMinOutstanding(""); setOnlyDue(false);
    setSp(new URLSearchParams({ page: "1", pageSize: String(pageSize), tab: "balances" }));
  }

  function go(p: number) {
    setSp((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", String(p)); next.set("pageSize", String(pageSize));
      next.set("tab", "balances");
      return next;
    });
  }

  function handleOnlyDueChange(checked: boolean) {
    setOnlyDue(checked);
    setSp((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", "1"); next.set("pageSize", String(pageSize));
      next.set("tab", "balances");
      const qTrim   = q.trim();
      const minTrim = minOutstanding.trim();
      if (qTrim)   next.set("q",              qTrim);   else next.delete("q");
      if (minTrim) next.set("minOutstanding", minTrim); else next.delete("minOutstanding");
      if (checked) next.set("onlyDue", "1");            else next.delete("onlyDue");
      return next;
    });
  }

  async function doExport() {
    try {
      setExportErr(null); setExporting(true);
      const minPaiseFromInput = toPaise(appliedMinOutstanding);
      const minOutstandingPaise = appliedOnlyDue ? Math.max(1, minPaiseFromInput || 1) : minPaiseFromInput;
      const blob = await adminExportPlatformFeeBalances({
        q: appliedQ.trim() || undefined,
        minOutstandingPaise,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "platform-fee-balances.xlsx";
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setExportErr(e?.message || "Export failed");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      {/* Degraded banner */}
      {degraded.on && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Platform fee balances are temporarily unavailable (fail-open). {degraded.reason ?? ""}
        </div>
      )}

      {/* Stats + filters */}
      <div className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <Filter className="h-4 w-4 text-gray-400 shrink-0 mb-2" />

        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
          <label className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">Search user</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && apply()}
            placeholder="email / name…"
            className={inputCls}
          />
        </div>

        <div className="flex flex-col gap-1 min-w-[160px]">
          <label className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">Min outstanding (₹)</label>
          <input
            value={minOutstanding}
            onChange={(e) => setMinOutstanding(e.target.value)}
            placeholder="e.g. 50"
            className={inputCls}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-600 pb-1 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={onlyDue}
            onChange={(e) => handleOnlyDueChange(e.target.checked)}
            className="rounded border-gray-300 text-brand focus:ring-brand"
          />
          Only due (outstanding &gt; 0)
        </label>

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
          <Badge variant="default" className="text-sm px-3 py-1">{total.toLocaleString()} helpers</Badge>
        </div>
      </div>

      {onlyDue && (
        <p className="mb-3 text-xs text-amber-600">Showing only helpers with outstanding platform fees.</p>
      )}

      <ErrorMessage message={exportErr} className="mb-3" />

      <TableRoot>
        <Table>
          <TableHead>
            <tr>
              <Th>User</Th>
              <Th>Due</Th>
              <Th>Paid</Th>
              <Th>Outstanding</Th>
              <Th>Actions</Th>
            </tr>
          </TableHead>
          <TableBody>
            {loading && rows.length === 0
              ? <TableSkeleton colSpan={5} />
              : rows.length === 0
              ? <TableEmpty colSpan={5} message="No results." />
              : rows.map((r) => (
                  <TableRow key={r.userId}>
                    <Td>
                      <Link to={`/admin/users/${r.userId}`} className="font-semibold text-blue-600 hover:underline truncate block max-w-[280px]">
                        {r.email}
                      </Link>
                      {r.name && <div className="text-xs text-gray-400">{r.name}</div>}
                      {r.isDisabled && <Badge variant="danger" className="text-[10px] mt-0.5">Disabled</Badge>}
                      {r.lastActivityAt && (
                        <div className="text-xs text-gray-400 mt-0.5">
                          Last active: {new Date(r.lastActivityAt).toLocaleString()}
                        </div>
                      )}
                    </Td>
                    <Td className="font-mono text-gray-700">{formatINR(r.totalDuePaise)}</Td>
                    <Td className="font-mono text-gray-700">{formatINR(r.totalPaidPaise)}</Td>
                    <Td>
                      <span className={`font-mono font-bold ${r.outstandingPaise > 0 ? "text-red-600" : "text-green-600"}`}>
                        {formatINR(r.outstandingPaise)}
                      </span>
                    </Td>
                    <Td>
                      <Link to={`/admin/finance/platform-fees?tab=ledger&userId=${r.userId}`}>
                        <Button variant="ghost" size="sm">Open Ledger →</Button>
                      </Link>
                    </Td>
                  </TableRow>
                ))
            }
          </TableBody>
        </Table>
      </TableRoot>

      {/* Pagination */}
      <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
        <span>Page <b>{page}</b> / {totalPages} · Total <b>{total}</b></span>
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
