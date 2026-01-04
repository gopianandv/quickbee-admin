import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setAdminToken } from '@/auth/tokenStore';

export default function Login() {
  const [token, setToken] = useState('');
  const nav = useNavigate();

  return (
    <div style={{ maxWidth: 520, margin: '40px auto', fontFamily: 'system-ui' }}>
      <h2>QuickBee Admin</h2>
      <p>Paste your Admin JWT (we’ll replace this with proper login later).</p>

      <textarea
        value={token}
        onChange={(e) => setToken(e.target.value)}
        rows={6}
        style={{ width: '100%', padding: 12 }}
        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
      />

      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <button
          onClick={() => {
            const t = token.trim();
            if (!t) return;
            setAdminToken(t);
            nav('/admin/kyc');
          }}
          style={{ padding: '10px 14px' }}
        >
          Save Token & Continue
        </button>
      </div>
    </div>
  );
}
