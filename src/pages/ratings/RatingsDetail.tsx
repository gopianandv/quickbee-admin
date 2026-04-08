import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { RefreshCw, Star, User } from "lucide-react";
import { getHelperReviews } from "@/api/adminRatings";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import {
  TableRoot, Table, TableHead, TableBody,
  TableRow, Th, Td, TableEmpty, TableSkeleton,
} from "@/components/ui/Table";

function RatingBadge({ v }: { v: number }) {
  if (v >= 4.5) return <Badge variant="success">{v.toFixed(1)} ★</Badge>;
  if (v >= 3.5) return <Badge variant="warning">{v.toFixed(1)} ★</Badge>;
  return <Badge variant="danger">{v.toFixed(1)} ★</Badge>;
}

export default function RatingsDetail() {
  const { helperId } = useParams<{ helperId: string }>();

  const [items,      setItems]      = useState<any[]>([]);
  const [avgRating,  setAvgRating]  = useState<number | null>(null);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading,    setLoading]    = useState(false);
  const [err,        setErr]        = useState<string | null>(null);

  const pageSize = 20;

  async function load(p = page) {
    if (!helperId) return;
    setLoading(true); setErr(null);
    try {
      const data = await getHelperReviews(helperId, { page: p, pageSize });
      setItems(data.items || []);
      setAvgRating(data.avgRating ?? null);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 0);
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? (e as { message?: string })?.message ?? "Failed to load reviews");
    } finally { setLoading(false); }
  }

  useEffect(() => { load(page); }, [helperId, page]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <PageHeader
        title="Helper Ratings"
        breadcrumbs={[
          { label: "Ratings", to: "/admin/ratings" },
          { label: helperId ?? "…" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {avgRating != null
              ? <Badge variant={avgRating >= 4.5 ? "success" : avgRating >= 3.5 ? "warning" : "danger"} className="text-sm px-3 py-1">
                  Avg {avgRating.toFixed(2)} ★
                </Badge>
              : <Badge variant="default" className="text-sm px-3 py-1">Avg —</Badge>
            }
            <Badge variant="default" className="text-sm px-3 py-1">{total.toLocaleString()} reviews</Badge>
            <Link to={`/admin/users/${helperId}`}>
              <Button variant="secondary" size="sm"><User className="h-3.5 w-3.5" /> Profile</Button>
            </Link>
            <Button variant="secondary" size="sm" onClick={() => load(page)} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        }
      />

      <ErrorMessage message={err} className="mb-4" />

      <TableRoot>
        <Table>
          <TableHead>
            <tr>
              <Th>Date</Th>
              <Th>Rating</Th>
              <Th>Comment</Th>
              <Th>Reviewer</Th>
              <Th>Task</Th>
            </tr>
          </TableHead>
          <TableBody>
            {loading && items.length === 0
              ? <TableSkeleton colSpan={5} />
              : items.length === 0
              ? <TableEmpty   colSpan={5} message="No reviews found." />
              : items.map((r) => (
                  <TableRow key={r.id}>
                    <Td className="text-xs text-gray-500 whitespace-nowrap">
                      {r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}
                    </Td>

                    <Td>
                      <div className="flex items-center gap-1.5">
                        <Star className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        {typeof r.rating === "number"
                          ? <RatingBadge v={r.rating} />
                          : <span className="text-gray-400">—</span>
                        }
                      </div>
                    </Td>

                    <Td className="text-sm text-gray-700 max-w-[300px] whitespace-pre-wrap">
                      {r.comment || <span className="text-gray-400">—</span>}
                    </Td>

                    <Td className="max-w-[180px]">
                      {r.reviewer?.id
                        ? <Link to={`/admin/users/${r.reviewer.id}`} className="font-semibold text-blue-600 hover:underline truncate block">
                            {r.reviewer.name || "User"}
                          </Link>
                        : <span className="text-gray-700 font-semibold">{r.reviewer?.name || "—"}</span>
                      }
                      {r.reviewer?.email && (
                        <div className="text-xs text-gray-400 truncate">{r.reviewer.email}</div>
                      )}
                    </Td>

                    <Td className="max-w-[200px]">
                      {r.task?.id
                        ? <Link to={`/admin/tasks/${r.task.id}`} className="text-sm text-blue-600 hover:underline truncate block font-semibold">
                            {r.task.title || r.task.id}
                          </Link>
                        : <span className="text-gray-400">—</span>
                      }
                    </Td>
                  </TableRow>
                ))
            }
          </TableBody>
        </Table>
      </TableRoot>

      <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
        <span>Page {page} of {Math.max(1, totalPages)}</span>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>← Prev</Button>
          <Button variant="secondary" size="sm" disabled={page >= totalPages || loading} onClick={() => setPage((p) => p + 1)}>Next →</Button>
        </div>
      </div>
    </div>
  );
}
