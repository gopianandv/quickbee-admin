import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { setAdminToken } from "@/auth/tokenStore";

const API_BASE = import.meta.env.VITE_API_BASE_URL; // e.g. http://localhost:3000

export default function Login() {
  const [email, setEmail] = useState("dev.helper@example.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const nav = useNavigate();
  const loc = useLocation() as any;
  const from = loc.state?.from ?? "/admin/dashboard";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/admin/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message ?? "Login failed");

      setAdminToken(data.accessToken);
      nav(from, { replace: true });
    } catch (e: any) {
      setErr(e.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: "40px auto", fontFamily: "system-ui" }}>
      <h2>QuickBee Admin</h2>
      <p>Sign in with your admin account.</p>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          style={{ width: "100%", padding: 12 }}
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          type="password"
          style={{ width: "100%", padding: 12 }}
        />

        {err && <div style={{ color: "crimson" }}>{err}</div>}

        <button disabled={loading} style={{ padding: "10px 14px" }}>
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}
