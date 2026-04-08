import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Search, RefreshCw, AlertTriangle } from "lucide-react";
import { createRatingRiskIssue, getHelperRatings, type AdminHelperRatingRow, type RatingRiskIssuePayload } from "@/api/adminRatings";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import {
  TableRoot, Table, TableHead, TableBody,
  TableRow, Th, Td, TableEmpty, TableSkeleton,
} from "@/components/ui/Table";
import { cn } from "@/lib/utils";
import { useToast } from "@/lib/toast";

/* ── Rating helpers ──────────────────────────────────────────────── */
type RatingState = "HEALTHY" | "WATCHLIST" | "AT_RISK" | "NO_DATA";

function getRatingState(avg: number | null, count: number): { state: RatingState; label: string } {
  if (count <= 0)                        return { state: "NO_DATA",  label: "No data"   };
  if (avg != null && avg < 3.5)         return { state: "AT_RISK",  label: "At risk"   };
  if (avg != null && avg < 4.2)         return { state: "WATCHLIST",label: "Watchlist" };
  return { state: "HEALTHY", label: "Healthy" };
}

function RatingBadge({ v }: { v: number | null }) {
  if (v == null) return <Badge variant="default">—</Badge>;
  if (v >= 4.5) return <Badge variant="success">{v.toFixed(2)} ★</Badge>;
  if (v >= 3.5) return <Badge variant="warning">{v.toFixed(2)} ★</Badge>;
  return <Badge variant="danger">{v.toFixed(2)} ★</Badge>;
}

function StateBadge({ state, label }: { state: RatingState; label: string }) {
  if (state === "AT_RISK")   return <Badge variant="danger">{label}</Badge>;
  if (state === "WATCHLIST") return <Badge variant="warning">{label}</Badge>;
  if (state === "HEALTHY")   return <Badge variant="success">{label}</Badge>;
  return <Badge variant="default">{label}</Badge>;
}

/* ── Create Issue Modal ──────────────────────────────────────────── */
function CreateIssueModal({
  helper,
  onClose,
  onCreated,
}: {
  helper: AdminHelperRatingRow;
  onClose: () => void;
  onCreated: (issueId: string) => void;
}) {
  const meta     = getRatingState(helper.avgRating, helper.reviewCount);
  const avg      = helper.avgRating == null ? "—" : helper.avgRating.toFixed(2);

  const [severity, setSeverity] = useState<RatingRiskIssuePayload["severity"]>(meta.state === "AT_RISK" ? "HIGH" : "MEDIUM");
  const [reason,   setReason]   = useState<RatingRiskIssuePayload["reason"]>("LOW_RATING_WATCHLIST");
  const [note,     setNote]     = useState(
    `Ratings safety review\n\nHelper: ${helper.name} (${helper.email})\nAvg rating: ${avg}\nReview count: ${helper.reviewCount}\nLast review: ${helper.lastReviewAt ? new Date(helper.lastReviewAt).toLocaleString() : "—"}\n\nAction: Please review recent feedback and decide follow-up (warning/monitor).`
  );
  const [saving, setSaving] = useState(false);
  const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast();

  const selectCls = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30";

  async function submit() {
    if ((note || "").trim().length < 10) { toastWarning("Note too short", "Add a short note (min 10 chars)."); return; }
    setSaving(true);
    try {
      const out = await createRatingRiskIssue(helper.helperId, { severity, reason, note: note.trim() });
      toastSuccess(
        out.created ? "Issue created" : "Issue already exists",
        `Issue ID: ${out.issueId}`
      );
      onCreated(out.issueId);
    } catch (e: unknown) {
      toastError("Failed to create issue", (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? (e as { message?: string })?.message ?? "Unknown error");
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}>
      <Card className="w-[560px] max-w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-4">
          <div className="flex items-center gap-2 font-semibold text-gray-800">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Create Ratings Safety Issue
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>Close</Button>
        </div>

        <div className="p-5 space-y-4">
          {/* Helper info */}
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-gray-900">{helper.name}</p>
              <p className="text-sm text-gray-500">{helper.email}</p>
            </div>
            <div className="text-right space-y-1">
              <StateBadge state={meta.state} label={meta.label} />
              <div><RatingBadge v={helper.avgRating} /></div>
            </div>
          </div>

          {/* Severity + Reason */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Severity</label>
              <select value={severity} onChange={(e) => setSeverity(e.target.value as any)} className={selectCls} disabled={saving}>
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Reason</label>
              <select value={reason} onChange={(e) => setReason(e.target.value as any)} className={selectCls} disabled={saving}>
                <option value="LOW_RATING_WATCHLIST">Low rating watchlist</option>
                <option value="MISBEHAVIOUR">Misbehaviour</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Note</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={7}
              disabled={saving}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30 resize-y"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={submit} disabled={saving || (note || "").trim().length < 10}>
              {saving ? "Creating…" : "Create Issue"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────── */
export default function RatingsList() {
  const nav      = useNavigate();
  const location = useLocation();

  const [search,     setSearch]     = useState("");
  const [page,       setPage]       = useState(1);
  const [onlyAtRisk, setOnlyAtRisk] = useState(false);

  const [items,      setItems]      = useState<AdminHelperRatingRow[]>([]);
  const [total,      setTotal]      = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading,    setLoading]    = useState(false);
  const [err,        setErr]        = useState<string | null>(null);

  const [modalHelper, setModalHelper] = useState<AdminHelperRatingRow | null>(null);

  async function load(p = page) {
    setLoading(true); setErr(null);
    try {
      const data = await getHelperRatings({ page: p, pageSize: 20, search: search.trim() || undefined });
      setItems(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 0);
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? (e as { message?: string })?.message ?? "Failed to load");
    } finally { setLoading(false); }
  }

  useEffect(() => { load(page); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const f = new URLSearchParams(location.search).get("filter") || "";
    setOnlyAtRisk(f.toLowerCase() === "at_risk");
  }, [location.search]);

  function toggleAtRisk() {
    const next = !onlyAtRisk;
    setOnlyAtRisk(next);
    const qs = new URLSearchParams(location.search);
    if (next) qs.set("filter", "at_risk"); else qs.delete("filter");
    nav({ pathname: "/admin/ratings", search: qs.toString() ? `?${qs.toString()}` : "" });
  }

  const displayed = useMemo(() => {
    if (!onlyAtRisk) return items;
    return items.filter((it) => getRatingState(it.avgRating, it.reviewCount).state === "AT_RISK");
  }, [items, onlyAtRisk]);

  return (
    <div>
      <PageHeader
        title="Ratings"
        subtitle="Helper feedback summary — avg rating, review count, risk state."
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="default" className="text-sm px-3 py-1">{total.toLocaleString()} helpers</Badge>
            <Button variant="secondary" size="sm" onClick={() => load(page)} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        }
      />

      {/* Search + At-risk toggle */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { if (page !== 1) setPage(1); else load(1); } }}
            placeholder="Search helper name / email…"
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
          />
        </div>
        <Button variant="primary" size="md" onClick={() => { if (page !== 1) setPage(1); else load(1); }} disabled={loading}>
          <Search className="h-3.5 w-3.5" /> Search
        </Button>
        <button
          onClick={toggleAtRisk}
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors cursor-pointer",
            onlyAtRisk
              ? "border-red-500 bg-red-500 text-white"
              : "border-gray-200 bg-white text-gray-600 hover:border-red-300 hover:text-red-600"
          )}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          At-Risk only
        </button>
      </div>

      <ErrorMessage message={err} className="mb-4" />

      <TableRoot>
        <Table>
          <TableHead>
            <tr>
              <Th>Helper</Th>
              <Th>Avg rating</Th>
              <Th>Reviews</Th>
              <Th>State</Th>
              <Th>Last review</Th>
              <Th>Actions</Th>
            </tr>
          </TableHead>
          <TableBody>
            {loading && displayed.length === 0
              ? <TableSkeleton colSpan={6} />
              : displayed.length === 0
              ? <TableEmpty   colSpan={6} message="No helpers found." />
              : displayed.map((it) => {
                  const meta      = getRatingState(it.avgRating, it.reviewCount);
                  const canCreate = meta.state === "AT_RISK" || meta.state === "WATCHLIST";
                  return (
                    <TableRow key={it.helperId} clickable onClick={() => nav(`/admin/ratings/${it.helperId}`)}>
                      <Td>
                        <div className="font-semibold text-gray-900 truncate max-w-[180px]">{it.name}</div>
                        <div className="text-xs text-gray-400 truncate">{it.email}</div>
                      </Td>
                      <Td><RatingBadge v={it.avgRating} /></Td>
                      <Td className="font-semibold text-gray-800">{it.reviewCount}</Td>
                      <Td><StateBadge state={meta.state} label={meta.label} /></Td>
                      <Td className="text-sm text-gray-500 whitespace-nowrap">
                        {it.lastReviewAt ? new Date(it.lastReviewAt).toLocaleString() : "—"}
                      </Td>
                      <Td>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Link to={`/admin/users/${it.helperId}`}>
                            <Button variant="ghost" size="sm">Profile</Button>
                          </Link>
                          {canCreate && (
                            <Button variant="danger" size="sm" onClick={() => setModalHelper(it)}>
                              <AlertTriangle className="h-3.5 w-3.5" /> Flag
                            </Button>
                          )}
                        </div>
                      </Td>
                    </TableRow>
                  );
                })
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

      {modalHelper && (
        <CreateIssueModal
          helper={modalHelper}
          onClose={() => setModalHelper(null)}
          onCreated={(id) => { setModalHelper(null); nav(`/admin/issues/${id}`); }}
        />
      )}
    </div>
  );
}
