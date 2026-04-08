import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Download, RefreshCw } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { adminListCashouts, adminExportCashouts } from "@/api/adminFinance";
import { hasPerm } from "@/auth/permissions";
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
  "w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30";

export default function CashoutsList() {
  const nav = useNavigate();
  const canFinance = hasPerm("FINANCE", "ADMIN");

  const [status,     setStatus]     = useState<string>("");
  const [methodType, setMethodType] = useState<string>("");
  const [search,     setSearch]     = useState<string>("");
  const [page,       setPage]       = useState(1);
  const pageSize = 30;

  const [items,   setItems]   = useState<any[]>([]);
  const [total,   setTotal]   = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState<string | null>(null);

  const [exporting,  setExporting]  = useState(false);
  const [exportErr,  setExportErr]  = useState<string | null>(null);

  async function load(p = page) {
    setLoading(true);
    setErr(null);
    try {
      const data = await adminListCashouts({
        page: p, pageSize,
        status: status || undefined,
        methodType: methodType || undefined,
        search: search.trim() || undefined,
      });
      setItems(data.items || []);
      setTotal(data.total || 0);
      setHasMore(!!data.hasMore);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Failed to load cashouts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(page); }, [status, methodType, page]); // eslint-disable-line react-hooks/exhaustive-deps

  function onSearch() {
    if (page !== 1) setPage(1);
    else load(1);
  }

  async function doExport() {
    try {
      setExportErr(null);
      setExporting(true);
      const blob = await adminExportCashouts({
        status: status || undefined,
        methodType: methodType || undefined,
        search: search.trim() || undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "cashouts.xlsx";
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setExportErr(e?.response?.data?.error || e?.message || "Export failed");
    } finally {
      setExporting(false);
    }
  }

  if (!canFinance) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-6 text-center mt-6">
        <p className="font-bold text-red-700 text-lg">Access Denied</p>
        <p className="mt-1 text-sm text-red-600">You don't have FINANCE permission.</p>
        <Link to="/admin/dashboard">
          <Button variant="secondary" size="sm" className="mt-4">← Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Cashouts"
        subtitle="Helper withdrawal requests and payout status."
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="default" className="text-sm px-3 py-1">{total.toLocaleString()} total</Badge>
            <Button variant="secondary" size="sm" onClick={() => load(page)} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={status}
          onChange={(e) => { setPage(1); setStatus(e.target.value); }}
          className={selectCls}
        >
          <option value="">All statuses</option>
          <option value="REQUESTED">Requested</option>
          <option value="PROCESSING">Processing</option>
          <option value="PAID">Paid</option>
          <option value="FAILED">Failed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        <select
          value={methodType}
          onChange={(e) => { setPage(1); setMethodType(e.target.value); }}
          className={selectCls}
        >
          <option value="">All methods</option>
          <option value="UPI">UPI</option>
          <option value="BANK">Bank</option>
        </select>

        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
            placeholder="Search user name or email…"
            className={inputCls}
          />
        </div>

        <Button variant="primary" size="md" onClick={onSearch} disabled={loading}>
          <Search className="h-3.5 w-3.5" /> Search
        </Button>

        <Button variant="secondary" size="md" onClick={doExport} disabled={exporting}>
          <Download className="h-3.5 w-3.5" />
          {exporting ? "Exporting…" : "Export Excel"}
        </Button>
      </div>

      <ErrorMessage message={err}       className="mb-3" />
      <ErrorMessage message={exportErr} className="mb-3" />

      <TableRoot>
        <Table>
          <TableHead>
            <tr>
              <Th>Created</Th>
              <Th>User</Th>
              <Th>Amount</Th>
              <Th>Method</Th>
              <Th>Status</Th>
              <Th></Th>
            </tr>
          </TableHead>
          <TableBody>
            {loading && items.length === 0
              ? <TableSkeleton colSpan={6} />
              : items.length === 0
              ? <TableEmpty colSpan={6} message="No cashouts found." />
              : items.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => nav(`/admin/finance/cashouts/${c.id}`)}
                  >
                    <Td className="text-xs text-gray-500 whitespace-nowrap">
                      {new Date(c.createdAt).toLocaleString()}
                    </Td>
                    <Td>
                      <div className="font-semibold text-gray-900 truncate max-w-[200px]">
                        {c.user?.email || c.userId}
                      </div>
                      {c.user?.name && (
                        <div className="text-xs text-gray-400">{c.user.name}</div>
                      )}
                    </Td>
                    <Td className="font-mono font-bold text-gray-800">
                      {formatINR(c.amountPaise)}
                    </Td>
                    <Td>
                      <Badge variant="default">{String(c.methodType || "—").toUpperCase()}</Badge>
                    </Td>
                    <Td>
                      <StatusBadge status={String(c.status || "—").toUpperCase()} />
                    </Td>
                    <Td onClick={(e) => e.stopPropagation()}>
                      <Link to={`/admin/finance/cashouts/${c.id}`}>
                        <Button variant="ghost" size="sm">View →</Button>
                      </Link>
                    </Td>
                  </TableRow>
                ))
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
