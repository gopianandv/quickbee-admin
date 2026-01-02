import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/api/client';

type Kyc = {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason?: string | null;
  idFrontUrl?: string | null;
  idBackUrl?: string | null;
  selfieUrl?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  user?: { id: string; name: string; email: string; profile?: any };
};

export default function KycDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [kyc, setKyc] = useState<Kyc | null>(null);
  const [reason, setReason] = useState('Documents verified');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const { data } = await api.get(`/admin/kyc/submissions/${id}`);
      setKyc(data);
      if (data?.reason) setReason(data.reason);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function review(action: 'approve' | 'reject') {
    if (!id) return;
    setLoading(true);
    setErr(null);
    try {
      await api.post(`/admin/kyc/submissions/${id}/${action}`, { reason: reason || undefined });
      nav('/kyc');
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || 'Review failed');
    } finally {
      setLoading(false);
    }
  }

  if (loading && !kyc) return <div style={{ padding: 20 }}>Loading…</div>;
  if (err && !kyc) return <div style={{ padding: 20, color: 'crimson' }}>{err}</div>;
  if (!kyc) return <div style={{ padding: 20 }}>Not found</div>;

  return (
    <div style={{ maxWidth: 980, margin: '30px auto', fontFamily: 'system-ui' }}>
      <button onClick={() => nav(-1)}>← Back</button>
      <h2 style={{ marginTop: 10 }}>KYC Detail</h2>

      {err ? <div style={{ color: 'crimson', marginBottom: 10 }}>{err}</div> : null}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
          <div><b>Status:</b> {kyc.status}</div>
          <div><b>User:</b> {kyc.user?.name} ({kyc.user?.email})</div>
          <div><b>Created:</b> {new Date(kyc.createdAt).toLocaleString()}</div>
          {kyc.reviewedAt ? <div><b>Reviewed:</b> {new Date(kyc.reviewedAt).toLocaleString()}</div> : null}

          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Reason</div>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} style={{ width: '100%', padding: 10 }} />
          </div>

          {kyc.status === 'PENDING' ? (
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button onClick={() => review('approve')} disabled={loading}>Approve</button>
              <button onClick={() => review('reject')} disabled={loading}>Reject</button>
            </div>
          ) : (
            <div style={{ marginTop: 12, color: '#555' }}>
              Already {kyc.status.toLowerCase()}.
            </div>
          )}
        </div>

        <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Images</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
            {kyc.idFrontUrl ? <img src={kyc.idFrontUrl} style={{ width: '100%', borderRadius: 8, border: '1px solid #eee' }} /> : <div>ID Front: -</div>}
            {kyc.idBackUrl ? <img src={kyc.idBackUrl} style={{ width: '100%', borderRadius: 8, border: '1px solid #eee' }} /> : <div>ID Back: -</div>}
            {kyc.selfieUrl ? <img src={kyc.selfieUrl} style={{ width: '100%', borderRadius: 8, border: '1px solid #eee' }} /> : <div>Selfie: -</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
