import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ShieldCheck, ShieldX, Clock } from "lucide-react";
import { getKycSubmissions, type KycListItem } from "@/api/kyc";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import {
  TableRoot, Table, TableHead, TableBody,
  TableRow, Th, Td, TableEmpty, TableSkeleton,
} from "@/components/ui/Table";
import { cn } from "@/lib/utils";

type KycStatus = "PENDING" | "APPROVED" | "REJECTED";

const STATUS_TABS: { value: KycStatus; label: string; icon: React.ElementType }[] = [
  { value: "PENDING",  label: "Pending",  icon: Clock      },
  { value: "APPROVED", label: "Approved", icon: ShieldCheck },
  { value: "REJECTED", label: "Rejected", icon: ShieldX    },
];

export default function KycList() {
  const nav = useNavigate();
  const [status,  setStatus]  = useState<KycStatus>("PENDING");
  const [search,  setSearch]  = useState("");
  const [page,    setPage]    = useState(1);

  const [items,   setItems]   = useState<KycListItem[]>([]);
  const [total,   setTotal]   = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState<string | null>(null);

  async function load(p = page) {
    setLoading(true);
    setErr(null);
    try {
      const data = await getKycSubmissions({ status, search: search.trim() || undefined, page: p, pageSize: 20 });
      setItems(data.items   || []);
      setTotal(data.total   || 0);
      setHasMore(!!data.hasMore);
    } catch (e: unknown) {
      setErr(
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        (e as { message?: string })?.message ?? "Failed to load"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(page); }, [status, page]); // eslint-disable-line react-hooks/exhaustive-deps

  function onSearchClick() {
    if (page !== 1) setPage(1);
    else load(1);
  }

  const badgeVariant = status === "APPROVED" ? "approved" : status === "REJECTED" ? "rejected" : "pending";

  return (
    <div>
      <PageHeader
        title="KYC Submissions"
        subtitle="Review helper identity documents before approval."
        actions={<Badge variant={badgeVariant} className="text-sm px-3 py-1">{total.toLocaleString()} {status.toLowerCase()}</Badge>}
      />

      {/* Status tabs */}
      <div className="mb-4 flex gap-1 rounded-xl border border-gray-200 bg-white p-1 w-fit shadow-sm">
        {STATUS_TABS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => { setPage(1); setStatus(value); }}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors border-none",
              status === value
                ? "bg-surface text-white shadow-sm"
                : "text-gray-500 hover:text-gray-800 hover:bg-gray-100 bg-transparent"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4 flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearchClick()}
            placeholder="Search name / email / phone…"
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
          />
        </div>
        <Button variant="primary" size="md" onClick={onSearchClick} disabled={loading}>
          <Search className="h-3.5 w-3.5" /> Search
        </Button>
      </div>

      <ErrorMessage message={err} className="mb-4" />

      <TableRoot>
        <Table>
          <TableHead>
            <tr>
              <Th>Submitted</Th>
              <Th>Name</Th>
              <Th>Email / Phone</Th>
              <Th>Status</Th>
              <Th></Th>
            </tr>
          </TableHead>
          <TableBody>
            {loading && items.length === 0
              ? <TableSkeleton colSpan={5} />
              : items.length === 0
              ? <TableEmpty   colSpan={5} message="No submissions found." />
              : items.map((k) => (
                  <TableRow key={k.id} clickable onClick={() => nav(`/admin/kyc/${k.id}`)}>
                    <Td className="text-xs text-gray-500 whitespace-nowrap">
                      {new Date(k.createdAt).toLocaleString()}
                    </Td>
                    <Td className="font-medium text-gray-900">
                      {k.user?.id
                        ? <Link to={`/admin/users/${k.user.id}`} onClick={(e) => e.stopPropagation()} className="hover:underline text-blue-600">{k.user?.name || "—"}</Link>
                        : k.user?.name || "—"
                      }
                    </Td>
                    <Td className="text-gray-600 max-w-[200px] truncate">
                      {k.user?.email || <span className="text-gray-400">—</span>}
                    </Td>
                    <Td>
                      <Badge variant={k.status === "APPROVED" ? "approved" : k.status === "REJECTED" ? "rejected" : "pending"}>
                        {k.status}
                      </Badge>
                    </Td>
                    <Td>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); nav(`/admin/kyc/${k.id}`); }}>
                        Review →
                      </Button>
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
