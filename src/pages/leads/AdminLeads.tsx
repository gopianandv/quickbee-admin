import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, Copy, Users, UserPlus, Download, StickyNote } from "lucide-react";
import {
  exportAdminLeadsCsv,
  getAdminLeads,
  updateAdminLead,
  type AdminLead,
  type AdminLeadFollowUpStatus,
  type AdminLeadType,
} from "@/api/adminLeads";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Card, CardContent } from "@/components/ui/Card";
import {
  TableRoot, Table, TableHead, TableBody,
  TableRow, Th, Td, TableEmpty, TableSkeleton,
} from "@/components/ui/Table";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;

const TYPE_TABS: { value: AdminLeadType | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "consumer-waitlist", label: "Consumers" },
  { value: "helper-signup", label: "Helpers" },
];

const FOLLOW_UP_STATUSES: { value: AdminLeadFollowUpStatus; label: string }[] = [
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "INTERESTED", label: "Interested" },
  { value: "NOT_INTERESTED", label: "Not interested" },
  { value: "CONVERTED", label: "Converted" },
];

function asText(value: AdminLead[keyof AdminLead] | undefined) {
  if (typeof value === "string" && value.trim()) return value.trim();
  return "-";
}

function relTime(d: Date) {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
}

function LeadTypeBadge({ type }: { type: AdminLeadType }) {
  return type === "helper-signup"
    ? <Badge variant="purple">Helper</Badge>
    : <Badge variant="info">Consumer</Badge>;
}

export default function AdminLeads() {
  const [type, setType] = useState<AdminLeadType | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminLead[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ all: 0, consumers: 0, helpers: 0 });
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load(p = page) {
    setLoading(true);
    setErr(null);
    try {
      const data = await getAdminLeads({
        type,
        search: search.trim() || undefined,
        page: p,
        pageSize: PAGE_SIZE,
      });
      setItems(data.items || []);
      setTotal(data.total || 0);
      setStats(data.stats || { all: 0, consumers: 0, helpers: 0 });
      setHasMore(Boolean(data.hasMore));
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? (e as { message?: string })?.message ?? "Failed to load leads");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(page); }, [type, page]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => {
      if (page !== 1) setPage(1);
      else load(1);
    }, 450);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const visibleStats = useMemo(() => [
    { label: "Total leads", value: stats.all, icon: Users },
    { label: "Consumers", value: stats.consumers, icon: Users },
    { label: "Helpers", value: stats.helpers, icon: UserPlus },
  ], [stats]);

  async function doExport() {
    setExporting(true);
    setErr(null);
    try {
      const { blob, filename } = await exportAdminLeadsCsv({
        type,
        search: search.trim() || undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), { href: url, download: filename });
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? (e as { message?: string })?.message ?? "Export failed");
    } finally {
      setExporting(false);
    }
  }

  async function saveLeadFollowUp(lead: AdminLead, leadStatus: AdminLeadFollowUpStatus, note?: string) {
    setUpdatingId(lead.id);
    setErr(null);
    try {
      await updateAdminLead(lead.id, {
        leadStatus,
        note: note ?? lead.followUpNote ?? "",
      });
      setItems((prev) => prev.map((item) => item.id === lead.id ? {
        ...item,
        leadStatus,
        followUpNote: note ?? item.followUpNote ?? "",
        followedUpAt: new Date().toISOString(),
      } : item));
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? (e as { message?: string })?.message ?? "Failed to update lead");
    } finally {
      setUpdatingId(null);
    }
  }

  async function promptLeadNote(lead: AdminLead) {
    const note = window.prompt("Follow-up note", lead.followUpNote || "");
    if (note === null) return;
    await saveLeadFollowUp(lead, lead.leadStatus || "NEW", note);
  }

  return (
    <div>
      <PageHeader
        title="Website Leads"
        subtitle="Consumer waitlist and helper signup leads from thenee.app."
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={doExport} disabled={exporting || loading}>
              <Download className="h-3.5 w-3.5" /> {exporting ? "Exporting..." : "Export CSV"}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => load(page)} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </>
        }
      />

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        {visibleStats.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center justify-between py-3">
              <div>
                <div className="text-xs font-medium text-gray-500">{label}</div>
                <div className="mt-1 text-2xl font-bold text-gray-900">{value.toLocaleString()}</div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
                <Icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
          {TYPE_TABS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => { setPage(1); setType(value); }}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-colors border-none",
                type === value ? "bg-surface text-white shadow-sm" : "bg-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[260px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, area, phone, email, skills..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
          />
        </div>
      </div>

      <ErrorMessage message={err} className="mb-4" />

      <TableRoot>
        <Table>
          <TableHead>
            <tr>
              <Th>Created</Th>
              <Th>Type</Th>
              <Th>Name</Th>
              <Th>Area</Th>
              <Th>Contact</Th>
              <Th>Interest</Th>
              <Th>Follow-up</Th>
              <Th>WhatsApp Consent</Th>
              <Th></Th>
            </tr>
          </TableHead>
          <TableBody>
            {loading && items.length === 0
              ? <TableSkeleton colSpan={9} />
              : items.length === 0
              ? <TableEmpty colSpan={9} message="No website leads found." />
              : items.map((lead) => {
                  const created = new Date(lead.createdAt);
                  const contact = lead.phone || lead.contact || lead.email;
                  const interest = lead.type === "helper-signup"
                    ? [asText(lead.skills), asText(lead.availability)].filter((v) => v !== "-").join(" / ") || "-"
                    : "-";

                  return (
                    <TableRow key={lead.id}>
                      <Td className="whitespace-nowrap text-xs">
                        <div className="font-medium text-gray-800">{created.toLocaleDateString()}</div>
                        <div className="text-gray-400">{relTime(created)}</div>
                      </Td>
                      <Td><LeadTypeBadge type={lead.type} /></Td>
                      <Td>
                        <div className="font-medium text-gray-900">{asText(lead.name)}</div>
                        <div className="text-xs text-gray-400">{lead.id.slice(0, 8)}</div>
                      </Td>
                      <Td className="max-w-[180px] truncate">{asText(lead.area)}</Td>
                      <Td className="max-w-[220px]">
                        <div className="truncate text-sm text-gray-800">{asText(contact)}</div>
                        {lead.email && lead.email !== contact && (
                          <div className="truncate text-xs text-gray-400">{asText(lead.email)}</div>
                        )}
                      </Td>
                      <Td className="max-w-[240px] truncate">{interest}</Td>
                      <Td className="min-w-[190px]">
                        <select
                          value={lead.leadStatus || "NEW"}
                          disabled={updatingId === lead.id}
                          onChange={(e) => saveLeadFollowUp(lead, e.target.value as AdminLeadFollowUpStatus)}
                          className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-medium text-gray-800 shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
                        >
                          {FOLLOW_UP_STATUSES.map((status) => (
                            <option key={status.value} value={status.value}>{status.label}</option>
                          ))}
                        </select>
                        {lead.followUpNote ? (
                          <button
                            type="button"
                            onClick={() => promptLeadNote(lead)}
                            className="mt-1 block max-w-[180px] truncate border-none bg-transparent p-0 text-left text-xs text-gray-500 hover:text-gray-900"
                          >
                            {lead.followUpNote}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => promptLeadNote(lead)}
                            className="mt-1 flex items-center gap-1 border-none bg-transparent p-0 text-xs font-medium text-brand hover:text-brand-dark"
                          >
                            <StickyNote className="h-3 w-3" /> Add note
                          </button>
                        )}
                      </Td>
                      <Td>
                        {lead.type === "helper-signup"
                          ? lead.consent ? <Badge variant="success">Yes</Badge> : <Badge variant="default">No</Badge>
                          : <span className="text-gray-400">-</span>
                        }
                      </Td>
                      <Td>
                        <Button variant="ghost" size="sm" onClick={() => copyText(lead.raw || lead.note || lead.id)}>
                          <Copy className="h-3.5 w-3.5" /> Copy
                        </Button>
                      </Td>
                    </TableRow>
                  );
                })
            }
          </TableBody>
        </Table>
      </TableRoot>

      <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
        <span>Showing {items.length} of {total.toLocaleString()}</span>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
          <span className="px-2 font-medium text-gray-700">Page {page}</span>
          <Button variant="secondary" size="sm" disabled={!hasMore || loading} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}
