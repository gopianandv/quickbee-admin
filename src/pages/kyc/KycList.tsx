import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getKycSubmissions, type KycListItem } from "@/api/kyc";
import StatusBadge from "@/components/ui/StatusBadge";
export default function KycList() {
  const [status, setStatus] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [items, setItems] = useState<KycListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load(p = page) {
    setLoading(true);
    setErr(null);
    try {
      const data = await getKycSubmissions({
        status,
        search: search.trim() || undefined,
        page: p,
        pageSize,
      });
      setItems(data.items || []);
      setTotal(data.total || 0);
      setHasMore(!!data.hasMore);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  // Reload when status/page changes
  useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page]);

  function onSearchClick() {
    // Always reset to page 1 for a new search
    if (page !== 1) setPage(1);
    else load(1);
  }

  return (
    <div style={{ maxWidth: 980, margin: "30px auto", fontFamily: "system-ui" }}>
      <h2>KYC Submissions</h2>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value as any);
          }}
        >
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name/email/phone"
          style={{ flex: 1, padding: 8 }}
        />

        <button onClick={onSearchClick} style={{ padding: "8px 12px" }} disabled={loading}>
          Search
        </button>
      </div>

      {err && <div style={{ color: "crimson", marginBottom: 10 }}>{err}</div>}
      {loading ? <div>Loading…</div> : null}

      <div style={{ border: "1px solid #ddd", borderRadius: 8, overflow: "hidden" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "220px 220px 1fr 160px 120px",
            padding: 10,
            background: "#f5f5f5",
            fontWeight: 600,
          }}
        >
          <div>Created</div>
          <div>User</div>
          <div>Email</div>
          <div>Status</div>
          <div>Action</div>
        </div>

        {items.map((k) => (
          <div
            key={k.id}
            style={{
              display: "grid",
              gridTemplateColumns: "220px 220px 1fr 160px 120px",
              padding: 10,
              borderTop: "1px solid #eee",
            }}
          >
            <div>{new Date(k.createdAt).toLocaleString()}</div>
            <div>
              {k.user?.id ? <Link to={`/admin/users/${k.user.id}`}>{k.user?.name || "-"}</Link> : (k.user?.name || "-")}
            </div>
            <div>{k.user?.email || "-"}</div>
            <div><StatusBadge status={k.status} /></div>
            <div>
              <Link to={`/admin/kyc/${k.id}`}>View</Link>

            </div>
          </div>
        ))}

        {!loading && items.length === 0 ? (
          <div style={{ padding: 12, color: "#555" }}>No submissions found.</div>
        ) : null}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
        <div>Total: {total}</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Prev
          </button>
          <div>Page {page}</div>
          <button disabled={!hasMore || loading} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
