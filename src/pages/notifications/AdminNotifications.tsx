import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminListNotifications, adminSendNotification, adminGetNotificationStats, type AdminNotificationItem } from "@/api/adminNotifications";

function userLabel(u: any) {
  return u?.name || u?.email || u?.profile?.phoneNumber || "—";
}

export default function AdminNotifications() {
  const [search, setSearch] = useState("");
  const [filterRead, setFilterRead] = useState<"" | "true" | "false">("");
  const [page, setPage] = useState(1);

  const [items, setItems] = useState<AdminNotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [stats, setStats] = useState<{ total: number; unread: number; last24h: number } | null>(null);

  // Send notification form
  const [sendUserId, setSendUserId] = useState("");
  const [sendTitle, setSendTitle] = useState("");
  const [sendMessage, setSendMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState<string | null>(null);
  const [sendOk, setSendOk] = useState(false);

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
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Failed to load");
    } finally { setLoading(false); }
  }

  useEffect(() => { load(page, search, filterRead); loadStats(); }, [page]); // eslint-disable-line

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    if (!sendUserId.trim() || !sendTitle.trim() || !sendMessage.trim()) {
      setSendErr("User ID, title and message are all required.");
      return;
    }
    setSending(true); setSendErr(null); setSendOk(false);
    try {
      await adminSendNotification({ userId: sendUserId.trim(), title: sendTitle.trim(), message: sendMessage.trim() });
      setSendOk(true);
      setSendUserId(""); setSendTitle(""); setSendMessage("");
      await load(1, search, filterRead);
      await loadStats();
    } catch (e: any) {
      setSendErr(e?.response?.data?.error || e?.message || "Failed to send");
    } finally { setSending(false); }
  }

  return (
    <div style={{ maxWidth: 1100, margin: "30px auto", fontFamily: "system-ui" }}>
      <div style={{ marginBottom: 12 }}><Link to="/admin/dashboard">← Dashboard</Link></div>
      <h2 style={{ margin: "0 0 4px" }}>Notification Management</h2>
      <div style={{ color: "#6B7280", marginBottom: 20 }}>View all in-app notifications and send custom messages to users.</div>

      {/* Stats bar */}
      {stats && (
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          {[
            { label: "Total", value: stats.total, color: "#111827" },
            { label: "Unread", value: stats.unread, color: "#DC2626" },
            { label: "Last 24h", value: stats.last24h, color: "#2563EB" },
          ].map((s) => (
            <div key={s.label} style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid #E5E7EB", background: "#fff", textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "#6B7280" }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16, alignItems: "flex-start" }}>
        {/* Left: list */}
        <div>
          <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (setPage(1), load(1, search, filterRead))}
              placeholder="Search title, message, user…"
              style={{ flex: 1, minWidth: 200, padding: 9, borderRadius: 10, border: "1px solid #E5E7EB" }} />
            <select value={filterRead} onChange={(e) => { setFilterRead(e.target.value as any); setPage(1); load(1, search, e.target.value as any); }}
              style={{ padding: 9, borderRadius: 10, border: "1px solid #E5E7EB", background: "#fff" }}>
              <option value="">All</option>
              <option value="false">Unread only</option>
              <option value="true">Read only</option>
            </select>
            <button onClick={() => { setPage(1); load(1, search, filterRead); }} disabled={loading}
              style={{ padding: "9px 16px", borderRadius: 10, border: "1px solid #111827", background: "#111827", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
              Search
            </button>
          </div>

          {err && <div style={{ color: "crimson", marginBottom: 10 }}>{err}</div>}
          {loading && <div style={{ color: "#6B7280" }}>Loading…</div>}

          <div style={{ border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr 120px 80px", padding: "10px 14px", background: "#F9FAFB", fontWeight: 800, fontSize: 12, borderBottom: "1px solid #E5E7EB" }}>
              <div>User</div><div>Notification</div><div>Sent</div><div>Read?</div>
            </div>
            {items.map((n) => (
              <div key={n.id} style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr 120px 80px", padding: "9px 14px", borderBottom: "1px solid #F3F4F6", alignItems: "flex-start" }}>
                <div>
                  <Link to={`/admin/users/${n.userId}`} style={{ fontWeight: 700, fontSize: 13 }}>{userLabel(n.user)}</Link>
                  {(n.user?.email || n.user?.profile?.phoneNumber) && (
                    <div style={{ fontSize: 11, color: "#6B7280" }}>{n.user.email || n.user.profile?.phoneNumber}</div>
                  )}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{n.title}</div>
                  <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{n.message}</div>
                  {n.type && <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>type: {n.type}</div>}
                </div>
                <div style={{ fontSize: 12, color: "#6B7280" }}>{new Date(n.createdAt).toLocaleString()}</div>
                <div>
                  {n.isRead
                    ? <span style={{ color: "#059669", fontSize: 12, fontWeight: 700 }}>✓ Read</span>
                    : <span style={{ color: "#DC2626", fontSize: 12, fontWeight: 700 }}>● Unread</span>}
                </div>
              </div>
            ))}
            {!loading && items.length === 0 && <div style={{ padding: 20, color: "#6B7280" }}>No notifications found.</div>}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
            <div style={{ color: "#6B7280", fontSize: 13 }}>Showing {items.length} of {total}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{ padding: "7px 12px", borderRadius: 9, border: "1px solid #E5E7EB", background: "#fff", cursor: "pointer" }}>Prev</button>
              <span style={{ fontWeight: 800, alignSelf: "center", fontSize: 13 }}>Page {page}</span>
              <button disabled={!hasMore || loading} onClick={() => setPage((p) => p + 1)}
                style={{ padding: "7px 12px", borderRadius: 9, border: "1px solid #E5E7EB", background: "#fff", cursor: "pointer" }}>Next</button>
            </div>
          </div>
        </div>

        {/* Right: send form */}
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
          <div style={{ fontWeight: 800, marginBottom: 14, fontSize: 15 }}>Send Notification</div>
          <form onSubmit={onSend}>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12, color: "#6B7280", display: "block", marginBottom: 4 }}>User ID *</label>
              <input value={sendUserId} onChange={(e) => setSendUserId(e.target.value)} placeholder="Paste user UUID…"
                style={{ width: "100%", padding: 9, borderRadius: 8, border: "1px solid #E5E7EB", boxSizing: "border-box" }} />
              <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 3 }}>Open any user profile and copy the ID from the URL.</div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12, color: "#6B7280", display: "block", marginBottom: 4 }}>Title *</label>
              <input value={sendTitle} onChange={(e) => setSendTitle(e.target.value)} placeholder="Notification title…"
                style={{ width: "100%", padding: 9, borderRadius: 8, border: "1px solid #E5E7EB", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: "#6B7280", display: "block", marginBottom: 4 }}>Message *</label>
              <textarea value={sendMessage} onChange={(e) => setSendMessage(e.target.value)} placeholder="Notification body…" rows={3}
                style={{ width: "100%", padding: 9, borderRadius: 8, border: "1px solid #E5E7EB", boxSizing: "border-box", resize: "vertical" }} />
            </div>
            {sendErr && <div style={{ color: "crimson", fontSize: 13, marginBottom: 10 }}>{sendErr}</div>}
            {sendOk && <div style={{ color: "#059669", fontSize: 13, marginBottom: 10, fontWeight: 700 }}>✓ Notification sent successfully.</div>}
            <button type="submit" disabled={sending}
              style={{ width: "100%", padding: "10px", borderRadius: 10, border: "none", background: "#111827", color: "#fff", fontWeight: 800, cursor: sending ? "not-allowed" : "pointer", opacity: sending ? 0.7 : 1 }}>
              {sending ? "Sending…" : "Send Notification"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
