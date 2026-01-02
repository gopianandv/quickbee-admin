import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { Link } from 'react-router-dom';

type KycItem = {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NOT_STARTED';
  createdAt: string;
  user: { id: string; name: string; email: string; profile?: { phoneNumber?: string | null } | null };
};

export default function KycList() {
  const [status, setStatus] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [items, setItems] = useState<KycItem[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const { data } = await api.get('/admin/kyc/submissions', {
        params: { status, search: search.trim() || undefined, page, pageSize },
      });
      setItems(data.items || []);
      setTotal(data.total || 0);
      setHasMore(!!data.hasMore);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [status, page]);

  return (
    <div style={{ maxWidth: 980, margin: '30px auto', fontFamily: 'system-ui' }}>
      <h2>KYC Submissions</h2>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
        <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value as any); }}>
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

        <button onClick={() => { setPage(1); load(); }} style={{ padding: '8px 12px' }}>
          Search
        </button>
      </div>

      {err && <div style={{ color: 'crimson', marginBottom: 10 }}>{err}</div>}
      {loading ? <div>Loading…</div> : null}

      <div style={{ border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '220px 220px 1fr 120px 120px', padding: 10, background: '#f5f5f5', fontWeight: 600 }}>
          <div>Created</div>
          <div>User</div>
          <div>Email</div>
          <div>Status</div>
          <div>Action</div>
        </div>

        {items.map((k) => (
          <div key={k.id} style={{ display: 'grid', gridTemplateColumns: '220px 220px 1fr 120px 120px', padding: 10, borderTop: '1px solid #eee' }}>
            <div>{new Date(k.createdAt).toLocaleString()}</div>
            <div>{k.user?.name || '-'}</div>
            <div>{k.user?.email || '-'}</div>
            <div>{k.status}</div>
            <div><Link to={`/kyc/${k.id}`}>View</Link></div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
        <div>Total: {total}</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
          <div>Page {page}</div>
          <button disabled={!hasMore} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      </div>
    </div>
  );
}
