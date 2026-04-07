import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  adminListChatThreads,
  adminGetChatThread,
  type ChatThreadSummary,
  type ChatMessage,
} from "@/api/adminChat";

/** Show name first → email → phone → short ID. Handles phone-only accounts. */
function userLabel(u: any): string {
  if (!u) return "—";
  return u.name || u.email || u.profile?.phoneNumber || String(u.id || "").slice(0, 8) || "—";
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString();
}

function formatTimeShort(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  if (sameDay) return d.toLocaleTimeString();
  return d.toLocaleDateString();
}

export default function AdminChatModeration() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [threads, setThreads] = useState<ChatThreadSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Selected thread to expand inline
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [msgErr, setMsgErr] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selectedThread, setSelectedThread] = useState<ChatThreadSummary | null>(null);

  async function loadThreads(p = page, q = search) {
    setLoading(true);
    setErr(null);
    try {
      const data = await adminListChatThreads({ page: p, pageSize, search: q.trim() || undefined });
      setThreads(data.items || []);
      setTotal(data.total || 0);
      setHasMore(!!data.hasMore);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Failed to load threads");
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(threadId: string, cursor?: string) {
    setMsgLoading(true);
    setMsgErr(null);
    try {
      const data = await adminGetChatThread(threadId, { limit: 50, cursor });
      if (cursor) {
        // prepend older messages
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

  useEffect(() => {
    loadThreads(page, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function onSearch() {
    setPage(1);
    setSelectedThreadId(null);
    loadThreads(1, search);
  }

  function onSelectThread(thread: ChatThreadSummary) {
    if (selectedThreadId === thread.id) {
      // Collapse
      setSelectedThreadId(null);
      setMessages([]);
      setSelectedThread(null);
      return;
    }
    setSelectedThreadId(thread.id);
    setSelectedThread(thread);
    setMessages([]);
    setNextCursor(null);
    loadMessages(thread.id);
  }

  function pill(text: string) {
    return (
      <span style={{
        display: "inline-flex", padding: "4px 10px", borderRadius: 999,
        fontSize: 12, fontWeight: 800, background: "#F3F4F6",
        border: "1px solid #E5E7EB", color: "#111827",
      }}>
        {text}
      </span>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: "30px auto", fontFamily: "system-ui" }}>
      <div style={{ marginBottom: 12 }}>
        <Link to="/admin/dashboard">← Dashboard</Link>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0 }}>Chat Moderation</h2>
          <div style={{ color: "#6B7280", marginTop: 4 }}>View chat threads between consumers and helpers.</div>
        </div>
        {pill(`Total: ${total}`)}
      </div>

      {/* Search */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSearch()}
          placeholder="Search by task title, user name, email or phone…"
          style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid #E5E7EB" }}
        />
        <button
          onClick={onSearch}
          disabled={loading}
          style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid #111827", background: "#111827", color: "#fff", fontWeight: 700, cursor: "pointer" }}
        >
          Search
        </button>
      </div>

      {err && <div style={{ color: "crimson", marginBottom: 10 }}>{err}</div>}
      {loading && <div style={{ color: "#6B7280" }}>Loading…</div>}

      {/* Thread list */}
      <div style={{ border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
        {/* Header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "2fr 1.2fr 1.2fr 100px 120px 80px",
          padding: "10px 14px", background: "#F9FAFB",
          fontWeight: 800, borderBottom: "1px solid #E5E7EB", fontSize: 13,
        }}>
          <div>Task</div>
          <div>Consumer</div>
          <div>Helper</div>
          <div>Status</div>
          <div>Messages</div>
          <div>Last</div>
        </div>

        {threads.map((t) => {
          const lastMsg = t.messages?.[0];
          const isOpen = selectedThreadId === t.id;

          return (
            <div key={t.id}>
              {/* Thread row */}
              <div
                onClick={() => onSelectThread(t)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1.2fr 1.2fr 100px 120px 80px",
                  padding: "10px 14px", borderBottom: "1px solid #F3F4F6",
                  cursor: "pointer", alignItems: "center",
                  background: isOpen ? "#EFF6FF" : "transparent",
                }}
                title="Click to view messages"
              >
                <div>
                  <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <Link
                      to={`/admin/tasks/${t.task.id}`}
                      onClick={(e) => e.stopPropagation()}
                      style={{ color: "#1D4ED8" }}
                    >
                      {t.task.title}
                    </Link>
                  </div>
                  {lastMsg?.text && (
                    <div style={{ fontSize: 12, color: "#6B7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {lastMsg.text}
                    </div>
                  )}
                </div>

                <div style={{ fontSize: 13 }}>
                  <Link to={`/admin/users/${t.consumer.id}`} onClick={(e) => e.stopPropagation()} style={{ fontWeight: 600 }}>
                    {userLabel(t.consumer)}
                  </Link>
                  {t.consumer.email || t.consumer.profile?.phoneNumber ? (
                    <div style={{ fontSize: 11, color: "#6B7280" }}>
                      {t.consumer.email || t.consumer.profile?.phoneNumber}
                    </div>
                  ) : null}
                </div>

                <div style={{ fontSize: 13 }}>
                  <Link to={`/admin/users/${t.helper.id}`} onClick={(e) => e.stopPropagation()} style={{ fontWeight: 600 }}>
                    {userLabel(t.helper)}
                  </Link>
                  {t.helper.email || t.helper.profile?.phoneNumber ? (
                    <div style={{ fontSize: 11, color: "#6B7280" }}>
                      {t.helper.email || t.helper.profile?.phoneNumber}
                    </div>
                  ) : null}
                </div>

                <div><StatusBadge status={t.task.status} /></div>

                <div style={{ fontSize: 13, color: "#374151" }}>
                  {t._count?.messages ?? 0} msg{t._count?.messages !== 1 ? "s" : ""}
                </div>

                <div style={{ fontSize: 12, color: "#6B7280" }}>
                  {lastMsg ? formatTimeShort(lastMsg.createdAt) : "—"}
                </div>
              </div>

              {/* Inline message viewer */}
              {isOpen && (
                <div style={{ background: "#F8FAFC", borderBottom: "2px solid #BFDBFE", padding: "14px 20px" }}>
                  <div style={{ fontWeight: 700, marginBottom: 10, color: "#1D4ED8" }}>
                    Messages in thread · {selectedThread?.task.title}
                  </div>

                  {msgErr && <div style={{ color: "crimson", marginBottom: 8 }}>{msgErr}</div>}
                  {msgLoading && messages.length === 0 && <div style={{ color: "#6B7280" }}>Loading messages…</div>}

                  {/* Load more (older) */}
                  {nextCursor && (
                    <div style={{ marginBottom: 10 }}>
                      <button
                        onClick={() => loadMessages(t.id, nextCursor)}
                        disabled={msgLoading}
                        style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #E5E7EB", background: "#fff", cursor: "pointer", fontSize: 12 }}
                      >
                        {msgLoading ? "Loading…" : "↑ Load older messages"}
                      </button>
                    </div>
                  )}

                  {messages.length === 0 && !msgLoading ? (
                    <div style={{ color: "#6B7280", fontSize: 13 }}>No messages yet.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {messages.map((m) => {
                        const isConsumer = m.senderUserId === t.consumer.id;
                        return (
                          <div key={m.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                            {/* Avatar bubble */}
                            <div style={{
                              width: 28, height: 28, borderRadius: "50%",
                              background: isConsumer ? "#DBEAFE" : "#D1FAE5",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 11, fontWeight: 800, flexShrink: 0, color: isConsumer ? "#1D4ED8" : "#065F46",
                            }}>
                              {isConsumer ? "C" : "H"}
                            </div>

                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 2 }}>
                                <Link
                                  to={`/admin/users/${m.sender.id}`}
                                  style={{ fontWeight: 700, fontSize: 13, color: isConsumer ? "#1D4ED8" : "#065F46" }}
                                >
                                  {userLabel(m.sender)}
                                </Link>
                                <span style={{ fontSize: 11, color: "#9CA3AF" }}>{formatTime(m.createdAt)}</span>
                                <span style={{ fontSize: 11, color: "#9CA3AF" }}>· {m.status}</span>
                              </div>

                              {m.text && (
                                <div style={{
                                  background: isConsumer ? "#EFF6FF" : "#ECFDF5",
                                  border: `1px solid ${isConsumer ? "#BFDBFE" : "#A7F3D0"}`,
                                  borderRadius: 8, padding: "6px 10px", fontSize: 14, color: "#111827",
                                  display: "inline-block", maxWidth: "80%",
                                }}>
                                  {m.text}
                                </div>
                              )}

                              {/* Attachments */}
                              {m.attachments?.length > 0 && (
                                <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                                  {m.attachments.map((att) => (
                                    <a
                                      key={att.id}
                                      href={att.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      style={{ display: "block" }}
                                    >
                                      {att.kind === "image" ? (
                                        <img
                                          src={att.url}
                                          alt="attachment"
                                          style={{ maxWidth: 160, maxHeight: 120, borderRadius: 6, border: "1px solid #E5E7EB", display: "block" }}
                                        />
                                      ) : (
                                        <div style={{ padding: "6px 10px", background: "#F3F4F6", borderRadius: 6, fontSize: 12, border: "1px solid #E5E7EB" }}>
                                          📎 {att.mimeType} {att.size ? `(${Math.round(att.size / 1024)}KB)` : ""}
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
                  )}
                </div>
              )}
            </div>
          );
        })}

        {!loading && threads.length === 0 && (
          <div style={{ padding: 20, color: "#6B7280" }}>No chat threads found.</div>
        )}
      </div>

      {/* Pagination */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
        <div style={{ color: "#6B7280" }}>Showing {threads.length} of {total}</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #E5E7EB", background: "#fff", cursor: "pointer" }}
          >
            Prev
          </button>
          <span style={{ fontWeight: 800, alignSelf: "center" }}>Page {page}</span>
          <button
            disabled={!hasMore || loading}
            onClick={() => setPage((p) => p + 1)}
            style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #E5E7EB", background: "#fff", cursor: "pointer" }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
