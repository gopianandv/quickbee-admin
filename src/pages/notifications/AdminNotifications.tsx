import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, BellOff, Search, Send, CheckCircle } from "lucide-react";
import {
  adminListNotifications,
  adminSendNotification,
  adminGetNotificationStats,
  type AdminNotificationItem,
} from "@/api/adminNotifications";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import {
  TableRoot, Table, TableHead, TableBody,
  TableRow, Th, Td, TableEmpty, TableSkeleton,
} from "@/components/ui/Table";

function userLabel(u: any) {
  return u?.name || u?.email || u?.profile?.phoneNumber || "—";
}

const selectCls = "rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30";
const inputCls  = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30";

export default function AdminNotifications() {
  const [search,     setSearch]     = useState("");
  const [filterRead, setFilterRead] = useState<"" | "true" | "false">("");
  const [page,       setPage]       = useState(1);

  const [items,   setItems]   = useState<AdminNotificationItem[]>([]);
  const [total,   setTotal]   = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState<string | null>(null);

  const [stats, setStats] = useState<{ total: number; unread: number; last24h: number } | null>(null);

  // Send form
  const [sendUserId,  setSendUserId]  = useState("");
  const [sendTitle,   setSendTitle]   = useState("");
  const [sendMessage, setSendMessage] = useState("");
  const [sending,     setSending]     = useState(false);
  const [sendErr,     setSendErr]     = useState<string | null>(null);
  const [sendOk,      setSendOk]      = useState(false);

  async function loadStats() {
    try { setStats(await adminGetNotificationStats()); } catch { /* ignore */ }
  }

  async function load(p = page, q = search, read = filterRead) {
    setLoading(true); setErr(null);
    try {
      const data = await adminListNotifications({
        page: p, pageSize: 30,
        search: q.trim() || undefined,
        isRead: read === "true" ? true : read === "false" ? false : undefined,
      });
      setItems(data.items || []);
      setTotal(data.total || 0);
      setHasMore(!!data.hasMore);
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? (e as { message?: string })?.message ?? "Failed to load");
    } finally { setLoading(false); }
  }

  useEffect(() => { load(page, search, filterRead); loadStats(); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    if (!sendUserId.trim() || !sendTitle.trim() || !sendMessage.trim()) {
      setSendErr("User ID, title and message are all required."); return;
    }
    setSending(true); setSendErr(null); setSendOk(false);
    try {
      await adminSendNotification({ userId: sendUserId.trim(), title: sendTitle.trim(), message: sendMessage.trim() });
      setSendOk(true);
      setSendUserId(""); setSendTitle(""); setSendMessage("");
      await load(1, search, filterRead);
      await loadStats();
    } catch (e: unknown) {
      setSendErr((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? (e as { message?: string })?.message ?? "Failed to send");
    } finally { setSending(false); }
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="View all in-app notifications and send custom messages to users."
        actions={<Badge variant="default" className="text-sm px-3 py-1">{total.toLocaleString()} total</Badge>}
      />

      {/* Stats bar */}
      {stats && (
        <div className="mb-5 flex gap-3 flex-wrap">
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total</p>
          </div>
          <div className="rounded-xl border border-red-100 bg-red-50 px-5 py-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-red-600">{stats.unread}</p>
            <p className="text-xs text-red-400 mt-0.5">Unread</p>
          </div>
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-blue-600">{stats.last24h}</p>
            <p className="text-xs text-blue-400 mt-0.5">Last 24h</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4 items-start">
        {/* Left: notification list */}
        <div>
          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { setPage(1); load(1, search, filterRead); } }}
                placeholder="Search title, message, user…"
                className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
              />
            </div>
            <select
              value={filterRead}
              onChange={(e) => {
                const v = e.target.value as "" | "true" | "false";
                setFilterRead(v); setPage(1); load(1, search, v);
              }}
              className={selectCls}
            >
              <option value="">All</option>
              <option value="false">Unread only</option>
              <option value="true">Read only</option>
            </select>
            <Button variant="primary" size="md" onClick={() => { setPage(1); load(1, search, filterRead); }} disabled={loading}>
              <Search className="h-3.5 w-3.5" /> Search
            </Button>
          </div>

          <ErrorMessage message={err} className="mb-4" />

          <TableRoot>
            <Table>
              <TableHead>
                <tr>
                  <Th>User</Th>
                  <Th>Notification</Th>
                  <Th>Sent</Th>
                  <Th>Status</Th>
                </tr>
              </TableHead>
              <TableBody>
                {loading && items.length === 0
                  ? <TableSkeleton colSpan={4} />
                  : items.length === 0
                  ? <TableEmpty   colSpan={4} message="No notifications found." />
                  : items.map((n) => (
                      <TableRow key={n.id}>
                        <Td className="max-w-[160px]">
                          <Link to={`/admin/users/${n.userId}`} className="font-semibold text-blue-600 hover:underline truncate block">
                            {userLabel(n.user)}
                          </Link>
                          {(n.user?.email || n.user?.profile?.phoneNumber) && (
                            <div className="text-xs text-gray-400 truncate">
                              {n.user.email || n.user.profile?.phoneNumber}
                            </div>
                          )}
                        </Td>
                        <Td className="max-w-[280px]">
                          <p className="font-semibold text-gray-800 text-sm">{n.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                          {n.type && <Badge variant="default" className="mt-1 text-[10px]">{n.type}</Badge>}
                        </Td>
                        <Td className="text-xs text-gray-500 whitespace-nowrap">
                          {new Date(n.createdAt).toLocaleString()}
                        </Td>
                        <Td>
                          {n.isRead
                            ? <Badge variant="success"><CheckCircle className="h-3 w-3 mr-0.5 inline" />Read</Badge>
                            : <Badge variant="danger"><BellOff className="h-3 w-3 mr-0.5 inline" />Unread</Badge>
                          }
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

        {/* Right: send notification form */}
        <Card className="sticky top-4">
          <CardHeader>
            <div className="flex items-center gap-2"><Send className="h-4 w-4 text-brand" /> Send Notification</div>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSend} className="space-y-4">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-400">User ID *</label>
                <input value={sendUserId} onChange={(e) => setSendUserId(e.target.value)} placeholder="Paste user UUID…" className={inputCls} />
                <p className="mt-1 text-[11px] text-gray-400">Open any user profile and copy the ID from the URL.</p>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-400">Title *</label>
                <input value={sendTitle} onChange={(e) => setSendTitle(e.target.value)} placeholder="Notification title…" className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-400">Message *</label>
                <textarea
                  value={sendMessage}
                  onChange={(e) => setSendMessage(e.target.value)}
                  placeholder="Notification body…"
                  rows={4}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30 resize-y"
                />
              </div>

              {sendErr && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                  <Bell className="h-4 w-4 shrink-0" /> {sendErr}
                </div>
              )}
              {sendOk && (
                <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700 font-semibold">
                  <CheckCircle className="h-4 w-4 shrink-0" /> Notification sent successfully.
                </div>
              )}

              <Button
                variant="primary"
                size="md"
                type="submit"
                disabled={sending}
                className="w-full"
              >
                <Send className="h-3.5 w-3.5" />
                {sending ? "Sending…" : "Send Notification"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
