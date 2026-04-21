import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, Download, Filter } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { adminListLedger, adminExportLedger } from "@/api/adminFinanceLedgerApi";
import type { LedgerTxnRow } from "@/api/adminFinanceLedgerApi";
import { PageHeader } from "@/components/ui/PageHeader";
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

const TYPE_OPTIONS = [
  "CREDIT_ESCROW_RELEASE",
  "CREDIT_TOPUP",
  "CREDIT_REFUND_TO_WALLET",
  "DEBIT_CASHOUT",
  "DEBIT_SPEND",
  "ADJUSTMENT_CREDIT",
  "ADJUSTMENT_DEBIT",
] as const;

export default function LedgerList() {
  const [sp, setSp] = useSearchParams();

  const page     = Math.max(1, Number(sp.get("page")     ?? "1"));
  const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize") ?? "20")));

  const [status,      setStatus]      = useState(sp.get("status")      ?? "");
  const [type,        setType]        = useState(sp.get("type")         ?? "");
  const [search,      setSearch]      = useState(sp.get("search")       ?? "");
  const [walletTxnId, setWalletTxnId] = useState(sp.get("walletTxnId") ?? "");

  const [loading,    setLoading]    = useState(false);
  const [rows,       setRows]       = useState<LedgerTxnRow[]>([]);
  const [total,      setTotal]      = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [exporting, setExporting] = useState(false);
  const [exportErr, setExportErr] = useState<string | null>(null);

  const statusOptions = Array.from(new Set(rows.map((r) => r.status))).sort();
  const typeOptions   = Array.from(new Set(rows.map((r) => r.type))).sort();
  const hasFilters = Boolean(status || type || search || walletTxnId);

  async function load() {
    setLoading(true);
    try {
      const data = await adminListLedger({
        page, pageSize,
        status:      status      || undefined,
        type:        type        || undefined,
        search:      search      || undefined,
        walletTxnId: walletTxnId || undefined,
      });
      setRows(data.data);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [page, pageSize, sp.toString()]); // eslint-disable-line react-hooks/exhaustive-deps

  function apply() {
    setSp((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", "1"); next.set("pageSize", String(pageSize));
      if (status)      next.set("status",      status);      else next.delete("status");
      if (type)        next.set("type",         type);        else next.delete("type");
      if (search)      next.set("search",       search);      else next.delete("search");
      if (walletTxnId) next.set("walletTxnId",  walletTxnId); else next.delete("walletTxnId");
      return next;
    });
  }

  function go(p: number) {
    setSp((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", String(p)); next.set("pageSize", String(pageSize));
      return next;
    });
  }

  async function doExport() {
    try {
      setExportErr(null); setExporting(true);
      const blob = await adminExportLedger({
        status:      sp.get("status")      || undefined,
        type:        sp.get("type")        || undefined,
        search:      sp.get("search")      || undefined,
        from:        sp.get("from")        || undefined,
        to:          sp.get("to")          || undefined,
        walletTxnId: sp.get("walletTxnId") || undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "wallet-ledger.xlsx";
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
      <PageHeader
        title="Wallet Ledger"
        subtitle="All wallet movements — escrow credits, cashout debits, adjustments, and more."
        actions={<Badge variant="default" className="text-sm px-3 py-1">{total.toLocaleString()} total</Badge>}
      />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <Filter className="h-4 w-4 text-gray-400 shrink-0 mb-2" />

        <div className="flex flex-col gap-1 min-w-[160px]">
          <label className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls}>
            <option value="">All</option>
            {(["PENDING", "POSTED", "REVERSED"] as const)
              .filter((s) => statusOptions.includes(s) || statusOptions.length === 0)
              .map((s) => <option key={s} value={s}>{s}</option>)}
            {statusOptions.filter((s) => !["PENDING", "POSTED", "REVERSED"].includes(s)).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1 min-w-[220px]">
          <label className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className={selectCls}>
            <option value="">All</option>
            {TYPE_OPTIONS
              .filter((t) => typeOptions.includes(t) || typeOptions.length === 0)
              .map((t) => <option key={t} value={t}>{t}</option>)}
            {typeOptions.filter((t) => !(TYPE_OPTIONS as readonly string[]).includes(t)).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
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

        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
          <label className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">Wallet Txn ID</label>
          <input
            value={walletTxnId}
            onChange={(e) => setWalletTxnId(e.target.value)}
            placeholder="Paste wallet transaction id…"
            className={inputCls}
          />
        </div>

        <div className="flex items-center gap-2 pb-0.5">
          <Button variant="primary" size="md" onClick={apply} disabled={loading}>
            <Search className="h-3.5 w-3.5" /> Apply
          </Button>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={() => {
              setStatus(""); setType(""); setSearch(""); setWalletTxnId("");
              setSp(new URLSearchParams({ page: "1", pageSize: String(pageSize) }));
            }}>
              Clear
            </Button>
          )}
          <Button variant="secondary" size="md" onClick={doExport} disabled={exporting}>
            <Download className="h-3.5 w-3.5" />
            {exporting ? "Exporting…" : "Export"}
          </Button>
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
              <Th>Type</Th>
              <Th>Status</Th>
              <Th>Links</Th>
            </tr>
          </TableHead>
          <TableBody>
            {loading && rows.length === 0
              ? <TableSkeleton colSpan={6} />
              : rows.length === 0
              ? <TableEmpty colSpan={6} message="No transactions found." />
              : rows.map((r) => (
                  <TableRow key={r.id}>
                    <Td className="text-xs text-gray-500 whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleString()}
                      <div className="mt-0.5">
                        <Link to={`/admin/finance/ledger/${r.id}`} className="text-blue-600 hover:underline text-xs">
                          View
                        </Link>
                      </div>
                    </Td>
                    <Td>
                      <Link to={`/admin/users/${r.userId}`} className="font-semibold text-blue-600 hover:underline truncate block max-w-[180px]">
                        {r.user?.email ?? r.userId}
                      </Link>
                      {r.user?.name && <div className="text-xs text-gray-400">{r.user.name}</div>}
                    </Td>
                    <Td className="font-mono font-semibold text-gray-800">{formatINR(r.amountPaise)}</Td>
                    <Td>
                      <Badge variant="default" className="text-xs font-mono">{r.type}</Badge>
                    </Td>
                    <Td><StatusBadge status={r.status} /></Td>
                    <Td>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {r.task?.id && <Link to={`/admin/tasks/${r.task.id}`} className="text-blue-600 hover:underline">Task</Link>}
                        {/*
                          Previously linked to `/admin/escrows/:id` which has
                          no route defined → dead-ends at the dashboard. Each
                          Escrow belongs to exactly one Task, so the Task link
                          above already covers the escrow row. Keep the label
                          for discoverability; point it to the task detail
                          page with an #escrow anchor that can be wired up
                          when a dedicated EscrowDetail page is built.
                        */}
                        {r.escrow?.id && r.task?.id && (
                          <Link
                            to={`/admin/tasks/${r.task.id}#escrow`}
                            className="text-blue-600 hover:underline"
                            title={`Escrow ${r.escrow.id}`}
                          >
                            Escrow
                          </Link>
                        )}
                        {r.links?.cashoutId && (
                          <Link to={`/admin/finance/cashouts/${r.links.cashoutId}`} className="text-blue-600 hover:underline">Cashout</Link>
                        )}
                        {r.links?.paymentIntentId && (
                          <Link to={`/admin/finance/payment-intents/${r.links.paymentIntentId}`} className="text-blue-600 hover:underline">Payment</Link>
                        )}
                      </div>
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
