import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Star, TrendingUp } from "lucide-react";
import { adminGetHelperPerformance, type HelperPerformanceItem } from "@/api/adminAnalytics";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import {
  TableRoot, Table, TableHead, TableBody,
  TableRow, Th, Td, TableEmpty, TableSkeleton,
} from "@/components/ui/Table";

function userLabel(u: any) {
  return u?.name || u?.email || u?.profile?.phoneNumber || "—";
}

function RatingBadge({ rating }: { rating: number | null }) {
  if (rating === null) return <span className="text-gray-400 text-sm">No reviews</span>;
  const v = rating.toFixed(1);
  if (rating >= 4.5) return <Badge variant="success"><Star className="h-3 w-3 inline mr-0.5" />{v}</Badge>;
  if (rating >= 3.5) return <Badge variant="warning"><Star className="h-3 w-3 inline mr-0.5" />{v}</Badge>;
  return <Badge variant="danger"><Star className="h-3 w-3 inline mr-0.5" />{v}</Badge>;
}

function CompletionBar({ rate }: { rate: number | null }) {
  if (rate === null) return <span className="text-gray-400">—</span>;
  const color = rate >= 80 ? "bg-green-500" : rate >= 60 ? "bg-amber-500" : "bg-red-500";
  const textColor = rate >= 80 ? "text-green-600" : rate >= 60 ? "text-amber-600" : "text-red-600";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(rate, 100)}%` }} />
      </div>
      <span className={`text-xs font-bold ${textColor}`}>{rate}%</span>
    </div>
  );
}

export default function AdminHelperPerformance() {
  const [search,  setSearch]  = useState("");
  const [page,    setPage]    = useState(1);
  const [items,   setItems]   = useState<HelperPerformanceItem[]>([]);
  const [total,   setTotal]   = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState<string | null>(null);

  async function load(p = page, q = search) {
    setLoading(true); setErr(null);
    try {
      const data = await adminGetHelperPerformance({ page: p, pageSize: 20, search: q.trim() || undefined });
      setItems(data.items || []);
      setTotal(data.total || 0);
      setHasMore(!!data.hasMore);
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? (e as { message?: string })?.message ?? "Failed to load");
    } finally { setLoading(false); }
  }

  useEffect(() => { load(page, search); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <PageHeader
        title="Helper Performance"
        subtitle="Completion rates, ratings and task stats for all helpers."
        actions={<Badge variant="default" className="text-sm px-3 py-1">{total.toLocaleString()} helpers</Badge>}
      />

      {/* Search bar */}
      <div className="mb-4 flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { setPage(1); load(1, search); } }}
            placeholder="Search helper name, email, phone…"
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
          />
        </div>
        <Button variant="primary" size="md" onClick={() => { setPage(1); load(1, search); }} disabled={loading}>
          <Search className="h-3.5 w-3.5" /> Search
        </Button>
      </div>

      <ErrorMessage message={err} className="mb-4" />

      <TableRoot>
        <Table>
          <TableHead>
            <tr>
              <Th>Helper</Th>
              <Th>Tasks Taken</Th>
              <Th>Completed</Th>
              <Th>Cancelled</Th>
              <Th>Completion Rate</Th>
              <Th>Avg Rating</Th>
              <Th></Th>
            </tr>
          </TableHead>
          <TableBody>
            {loading && items.length === 0
              ? <TableSkeleton colSpan={7} />
              : items.length === 0
              ? <TableEmpty   colSpan={7} message="No helpers found." />
              : items.map((h) => (
                  <TableRow key={h.id}>
                    <Td>
                      <div className="font-semibold text-gray-900 truncate max-w-[180px]">{userLabel(h)}</div>
                      {(h.email || (h as any).profile?.phoneNumber) && (
                        <div className="text-xs text-gray-400 truncate">{h.email || (h as any).profile?.phoneNumber}</div>
                      )}
                    </Td>
                    <Td className="font-bold text-gray-800">{h.tasksTaken}</Td>
                    <Td>
                      <span className="font-bold text-green-600">{h.tasksCompleted}</span>
                    </Td>
                    <Td>
                      <span className={`font-bold ${h.tasksCancelled > 0 ? "text-red-500" : "text-gray-400"}`}>
                        {h.tasksCancelled}
                      </span>
                    </Td>
                    <Td><CompletionBar rate={h.completionRate} /></Td>
                    <Td><RatingBadge rating={h.avgRating} /></Td>
                    <Td>
                      <Link to={`/admin/users/${h.id}`}>
                        <Button variant="ghost" size="sm">Profile →</Button>
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

// keep linter happy
const _TrendingUp = TrendingUp;
void _TrendingUp;
