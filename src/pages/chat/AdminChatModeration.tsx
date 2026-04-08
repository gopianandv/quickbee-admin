import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search, MessageSquare, ChevronDown, ChevronUp,
  Paperclip, Loader2, User, ArrowUpCircle,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  adminListChatThreads,
  adminGetChatThread,
  type ChatThreadSummary,
  type ChatMessage,
} from "@/api/adminChat";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import {
  TableRoot, Table, TableHead, TableBody,
  TableRow, Th, Td, TableEmpty, TableSkeleton,
} from "@/components/ui/Table";

/* ── Helpers ──────────────────────────────────────────────────────── */
function userLabel(u: any): string {
  if (!u) return "—";
  return u.name || u.email || u.profile?.phoneNumber || String(u.id || "").slice(0, 8) || "—";
}

function userSub(u: any): string | null {
  return u?.email || u?.profile?.phoneNumber || null;
}

function formatTimeFull(iso: string) {
  return new Date(iso).toLocaleString();
}

function formatTimeShort(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth()    === today.getMonth()    &&
    d.getDate()     === today.getDate();
  return sameDay ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : d.toLocaleDateString();
}

function initials(u: any): string {
  const label = userLabel(u);
  return label.charAt(0).toUpperCase();
}

/* ── Component ────────────────────────────────────────────────────── */
export default function AdminChatModeration() {
  const [search,   setSearch]   = useState("");
  const [page,     setPage]     = useState(1);
  const pageSize = 20;

  const [threads,  setThreads]  = useState<ChatThreadSummary[]>([]);
  const [total,    setTotal]    = useState(0);
  const [hasMore,  setHasMore]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [err,      setErr]      = useState<string | null>(null);

  // Selected thread state
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedThread,   setSelectedThread]   = useState<ChatThreadSummary | null>(null);
  const [messages,         setMessages]         = useState<ChatMessage[]>([]);
  const [msgLoading,       setMsgLoading]       = useState(false);
  const [msgErr,           setMsgErr]           = useState<string | null>(null);
  const [nextCursor,       setNextCursor]       = useState<string | null>(null);

  async function loadThreads(p = page, q = search) {
    setLoading(true); setErr(null);
    try {
      const data = await adminListChatThreads({ page: p, pageSize, search: q.trim() || undefined });
      setThreads(data.items || []);
      setTotal(data.total   || 0);
      setHasMore(!!data.hasMore);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Failed to load threads");
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(threadId: string, cursor?: string) {
    setMsgLoading(true); setMsgErr(null);
    try {
      const data = await adminGetChatThread(threadId, { limit: 50, cursor });
      if (cursor) {
        setMessages((prev) => [...(data.messages || []), ...prev]);
      } else {
        setMessages(data.messages || []);
      }
      setNextCursor(data.nextCursor);
    } catch (e: any) {
      setMsgErr(e?.response?.data?.error || e?.message || "Failed to load messages");
    } finally {
      setMsgLoading(false);
    }
  }

  useEffect(() => { loadThreads(page, search); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  function onSearch() {
    setPage(1);
    setSelectedThreadId(null);
    loadThreads(1, search);
  }

  function onSelectThread(thread: ChatThreadSummary) {
    if (selectedThreadId === thread.id) {
      setSelectedThreadId(null);
      setSelectedThread(null);
      setMessages([]);
      setNextCursor(null);
      return;
    }
    setSelectedThreadId(thread.id);
    setSelectedThread(thread);
    setMessages([]);
    setNextCursor(null);
    loadMessages(thread.id);
  }

  return (
    <div>
      <PageHeader
        title="Chat Moderation"
        subtitle="View and inspect chat threads between consumers and helpers."
        actions={<Badge variant="default" className="text-sm px-3 py-1">{total.toLocaleString()} threads</Badge>}
      />

      {/* Search */}
      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
            placeholder="Search task title, user name, email or phone…"
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
          />
        </div>
        <Button variant="primary" size="md" onClick={onSearch} disabled={loading}>
          <Search className="h-3.5 w-3.5" /> Search
        </Button>
      </div>

      <ErrorMessage message={err} className="mb-4" />

      {/* Thread table */}
      <TableRoot>
        <Table>
          <TableHead>
            <tr>
              <Th>Task</Th>
              <Th>Consumer</Th>
              <Th>Helper</Th>
              <Th>Status</Th>
              <Th>Messages</Th>
              <Th>Last Activity</Th>
              <Th></Th>
            </tr>
          </TableHead>
          <TableBody>
            {loading && threads.length === 0
              ? <TableSkeleton colSpan={7} />
              : threads.length === 0
              ? <TableEmpty colSpan={7} message="No chat threads found." />
              : threads.map((t) => {
                  const lastMsg = t.messages?.[0];
                  const isOpen  = selectedThreadId === t.id;

                  return (
                    <>
                      {/* Thread row */}
                      <TableRow
                        key={t.id}
                        onClick={() => onSelectThread(t)}
                        className={`cursor-pointer transition-colors ${isOpen ? "bg-blue-50 hover:bg-blue-50" : ""}`}
                      >
                        <Td className="max-w-[260px]">
                          <Link
                            to={`/admin/tasks/${t.task.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-semibold text-blue-600 hover:underline truncate block"
                          >
                            {t.task.title}
                          </Link>
                          {lastMsg?.text && (
                            <p className="text-xs text-gray-400 truncate mt-0.5">{lastMsg.text}</p>
                          )}
                        </Td>

                        <Td>
                          <Link
                            to={`/admin/users/${t.consumer.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-semibold text-blue-600 hover:underline truncate block max-w-[160px]"
                          >
                            {userLabel(t.consumer)}
                          </Link>
                          {userSub(t.consumer) && (
                            <div className="text-xs text-gray-400 truncate">{userSub(t.consumer)}</div>
                          )}
                        </Td>

                        <Td>
                          <Link
                            to={`/admin/users/${t.helper.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-semibold text-green-700 hover:underline truncate block max-w-[160px]"
                          >
                            {userLabel(t.helper)}
                          </Link>
                          {userSub(t.helper) && (
                            <div className="text-xs text-gray-400 truncate">{userSub(t.helper)}</div>
                          )}
                        </Td>

                        <Td>
                          <StatusBadge status={t.task.status} />
                        </Td>

                        <Td>
                          <div className="flex items-center gap-1.5 text-sm text-gray-700">
                            <MessageSquare className="h-3.5 w-3.5 text-gray-400" />
                            <span className="font-semibold">{t._count?.messages ?? 0}</span>
                          </div>
                        </Td>

                        <Td className="text-xs text-gray-500 whitespace-nowrap">
                          {lastMsg ? formatTimeShort(lastMsg.createdAt) : "—"}
                        </Td>

                        <Td onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" onClick={() => onSelectThread(t)}>
                            {isOpen
                              ? <><ChevronUp   className="h-3.5 w-3.5" /> Hide</>
                              : <><ChevronDown className="h-3.5 w-3.5" /> View</>
                            }
                          </Button>
                        </Td>
                      </TableRow>

                      {/* Inline message viewer */}
                      {isOpen && (
                        <tr key={`${t.id}-messages`}>
                          <td colSpan={7} className="p-0 border-b border-blue-200">
                            <MessageViewer
                              thread={selectedThread!}
                              messages={messages}
                              loading={msgLoading}
                              err={msgErr}
                              nextCursor={nextCursor}
                              onLoadMore={() => loadMessages(t.id, nextCursor!)}
                            />
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
            }
          </TableBody>
        </Table>
      </TableRoot>

      {/* Pagination */}
      <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
        <span>Showing {threads.length} of {total.toLocaleString()}</span>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>← Prev</Button>
          <span className="px-2 font-medium text-gray-700">Page {page}</span>
          <Button variant="secondary" size="sm" disabled={!hasMore || loading} onClick={() => setPage((p) => p + 1)}>Next →</Button>
        </div>
      </div>
    </div>
  );
}

/* ── MessageViewer ────────────────────────────────────────────────── */
function MessageViewer({
  thread, messages, loading, err, nextCursor, onLoadMore,
}: {
  thread: ChatThreadSummary;
  messages: ChatMessage[];
  loading: boolean;
  err: string | null;
  nextCursor: string | null;
  onLoadMore: () => void;
}) {
  return (
    <div className="border-t-2 border-blue-200 bg-gray-50/70">
      {/* Viewer header */}
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-5 py-3">
        <div className="flex items-center gap-2 text-sm">
          <MessageSquare className="h-4 w-4 text-blue-500" />
          <span className="font-bold text-gray-800">{thread.task.title}</span>
          <span className="text-gray-400">·</span>
          <span className="text-gray-500">{messages.length} messages loaded</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-400 inline-block" />
            Consumer = {userLabel(thread.consumer)}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500 inline-block" />
            Helper = {userLabel(thread.helper)}
          </span>
        </div>
      </div>

      <div className="px-5 py-4 space-y-3 max-h-[520px] overflow-y-auto">
        {/* Load older button */}
        {nextCursor && (
          <div className="flex justify-center">
            <Button variant="secondary" size="sm" onClick={onLoadMore} disabled={loading}>
              {loading
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…</>
                : <><ArrowUpCircle className="h-3.5 w-3.5" /> Load older messages</>
              }
            </Button>
          </div>
        )}

        {err && <ErrorMessage message={err} />}

        {loading && messages.length === 0 && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading messages…
          </div>
        )}

        {!loading && messages.length === 0 && !err && (
          <p className="py-6 text-center text-sm text-gray-400">No messages in this thread yet.</p>
        )}

        {/* Messages */}
        {messages.map((m) => {
          const isConsumer = m.senderUserId === thread.consumer.id;
          const isHelper   = m.senderUserId === thread.helper.id;

          return (
            <div key={m.id} className={`flex gap-3 ${isConsumer ? "" : "flex-row-reverse"}`}>
              {/* Avatar */}
              <div className={[
                "h-8 w-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5",
                isConsumer ? "bg-blue-100 text-blue-700" : isHelper ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500",
              ].join(" ")}>
                {isConsumer || isHelper ? initials(isConsumer ? thread.consumer : thread.helper) : <User className="h-3.5 w-3.5" />}
              </div>

              {/* Bubble */}
              <div className={`flex flex-col max-w-[72%] ${isConsumer ? "items-start" : "items-end"}`}>
                {/* Sender + time */}
                <div className={`flex items-baseline gap-2 mb-1 ${isConsumer ? "" : "flex-row-reverse"}`}>
                  <Link
                    to={`/admin/users/${m.sender?.id}`}
                    className={`text-xs font-bold hover:underline ${isConsumer ? "text-blue-600" : "text-green-700"}`}
                  >
                    {userLabel(m.sender)}
                  </Link>
                  <span className="text-[10px] text-gray-400">{formatTimeFull(m.createdAt)}</span>
                  {m.status && m.status !== "SENT" && (
                    <span className="text-[10px] text-gray-400">· {m.status}</span>
                  )}
                </div>

                {/* Text bubble */}
                {m.text && (
                  <div className={[
                    "rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm",
                    isConsumer
                      ? "rounded-tl-sm bg-white border border-blue-100 text-gray-800"
                      : "rounded-tr-sm bg-green-600 text-white",
                  ].join(" ")}>
                    {m.text}
                  </div>
                )}

                {/* Attachments */}
                {m.attachments?.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {m.attachments.map((att) => (
                      <a
                        key={att.id}
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block"
                      >
                        {att.kind === "image" ? (
                          <img
                            src={att.url}
                            alt="attachment"
                            className="max-w-[180px] max-h-[140px] rounded-xl border border-gray-200 object-cover shadow-sm hover:opacity-90 transition-opacity"
                          />
                        ) : (
                          <div className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 transition-colors shadow-sm">
                            <Paperclip className="h-3.5 w-3.5 text-gray-400" />
                            <span>{att.mimeType}</span>
                            {att.size ? <span className="text-gray-400">({Math.round(att.size / 1024)} KB)</span> : null}
                          </div>
                        )}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
