import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminGetFavoriteHelpers, type FavoriteItem } from "@/api/adminAnalytics";

function userLabel(u: any) {
  return u?.name || u?.email || u?.profile?.phoneNumber || "—";
}

export default function AdminFavoriteHelpers() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load(p = page, q = search) {
    setLoading(true); setErr(null);
    try {
      const data = await adminGetFavoriteHelpers({ page: p, pageSize: 20, search: q.trim() || undefined });
      setItems(data.items || []);
      setTotal(data.total || 0);
      setHasMore(!!data.hasMore);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Failed to load");
    } finally { setLoading(false); }
  }

  useEffect(() => { load(page, search); }, [page]); // eslint-disable-line

  return (
    <div style={{ maxWidth: 900, margin: "30px auto", fontFamily: "system-ui" }}>
      <div style={{ marginBottom: 12 }}><Link to="/admin/dashboard">← Dashboard</Link></div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0 }}>Favourite Helpers</h2>
          <div style={{ color: "#6B7280", marginTop: 4 }}>Consumers who have saved specific helpers as favourites.</div>
        </div>
        <span style={{ padding: "4px 10px", borderRadius: 999, background: "#F3F4F6", fontWeight: 800, fontSize: 12 }}>Total: {total}</span>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (setPage(1), load(1, search))}
          placeholder="Search consumer or helper name, email…"
          style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid #E5E7EB" }} />
        <button onClick={() => { setPage(1); load(1, search); }} disabled={loading}
          style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid #111827", background: "#111827", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
          Search
        </button>
      </div>

      {err && <div style={{ color: "crimson", marginBottom: 10 }}>{err}</div>}
      {loading && <div style={{ color: "#6B7280" }}>Loading…</div>}

      <div style={{ border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 160px", padding: "10px 14px", background: "#F9FAFB", fontWeight: 800, fontSize: 13, borderBottom: "1px solid #E5E7EB" }}>
          <div>Consumer</div><div>Favourite Helper</div><div>Saved On</div>
        </div>
        {items.map((f) => (
          <div key={f.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 160px", padding: "10px 14px", borderBottom: "1px solid #F3F4F6", alignItems: "center" }}>
            <div>
              <Link to={`/admin/users/${f.consumer.id}`} style={{ fontWeight: 700 }}>{userLabel(f.consumer)}</Link>
              {(f.consumer.email || f.consumer.profile?.phoneNumber) && (
                <div style={{ fontSize: 12, color: "#6B7280" }}>{f.consumer.email || f.consumer.profile?.phoneNumber}</div>
              )}
            </div>
            <div>
              <Link to={`/admin/users/${f.helper.id}`} style={{ fontWeight: 700, color: "#059669" }}>{userLabel(f.helper)}</Link>
              {(f.helper.email || f.helper.profile?.phoneNumber) && (
                <div style={{ fontSize: 12, color: "#6B7280" }}>{f.helper.email || f.helper.profile?.phoneNumber}</div>
              )}
            </div>
            <div style={{ fontSize: 13, color: "#6B7280" }}>{new Date(f.createdAt).toLocaleDateString()}</div>
          </div>
        ))}
        {!loading && items.length === 0 && <div style={{ padding: 20, color: "#6B7280" }}>No favourites found.</div>}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
        <div style={{ color: "#6B7280" }}>Showing {items.length} of {total}</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}
            style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #E5E7EB", background: "#fff", cursor: "pointer" }}>Prev</button>
          <span style={{ fontWeight: 800, alignSelf: "center" }}>Page {page}</span>
          <button disabled={!hasMore || loading} onClick={() => setPage((p) => p + 1)}
            style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #E5E7EB", background: "#fff", cursor: "pointer" }}>Next</button>
        </div>
      </div>
    </div>
  );
}
