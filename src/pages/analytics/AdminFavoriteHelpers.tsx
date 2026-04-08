import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Heart } from "lucide-react";
import { adminGetFavoriteHelpers, type FavoriteItem } from "@/api/adminAnalytics";
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

export default function AdminFavoriteHelpers() {
  const [search,  setSearch]  = useState("");
  const [page,    setPage]    = useState(1);
  const [items,   setItems]   = useState<FavoriteItem[]>([]);
  const [total,   setTotal]   = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState<string | null>(null);

  async function load(p = page, q = search) {
    setLoading(true); setErr(null);
    try {
      const data = await adminGetFavoriteHelpers({ page: p, pageSize: 20, search: q.trim() || undefined });
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
        title="Favourite Helpers"
        subtitle="Consumers who have saved specific helpers as favourites."
        actions={<Badge variant="default" className="text-sm px-3 py-1">{total.toLocaleString()} saved</Badge>}
      />

      {/* Search */}
      <div className="mb-4 flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { setPage(1); load(1, search); } }}
            placeholder="Search consumer or helper name, email…"
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
              <Th>Consumer</Th>
              <Th>
                <div className="flex items-center gap-1.5">
                  <Heart className="h-3.5 w-3.5 text-pink-400" /> Favourite Helper
                </div>
              </Th>
              <Th>Saved On</Th>
            </tr>
          </TableHead>
          <TableBody>
            {loading && items.length === 0
              ? <TableSkeleton colSpan={3} />
              : items.length === 0
              ? <TableEmpty   colSpan={3} message="No favourites found." />
              : items.map((f) => (
                  <TableRow key={f.id}>
                    <Td>
                      <Link to={`/admin/users/${f.consumer.id}`} className="font-semibold text-blue-600 hover:underline truncate block">
                        {userLabel(f.consumer)}
                      </Link>
                      {(f.consumer.email || f.consumer.profile?.phoneNumber) && (
                        <div className="text-xs text-gray-400 truncate">
                          {f.consumer.email || f.consumer.profile?.phoneNumber}
                        </div>
                      )}
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1.5">
                        <Heart className="h-3.5 w-3.5 text-pink-400 shrink-0" />
                        <Link to={`/admin/users/${f.helper.id}`} className="font-semibold text-green-600 hover:underline truncate">
                          {userLabel(f.helper)}
                        </Link>
                      </div>
                      {(f.helper.email || f.helper.profile?.phoneNumber) && (
                        <div className="text-xs text-gray-400 truncate pl-5">
                          {f.helper.email || f.helper.profile?.phoneNumber}
                        </div>
                      )}
                    </Td>
                    <Td className="text-sm text-gray-500 whitespace-nowrap">
                      {new Date(f.createdAt).toLocaleDateString()}
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
