import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Mail, Lock, LogIn, AlertCircle } from "lucide-react";
import { setAdminToken, setAdminPermissions } from "@/auth/tokenStore";
import { api } from "@/api/client";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function Login() {
  const [email,    setEmail]    = useState("dev.helper@example.com");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [err,      setErr]      = useState<string | null>(null);

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
      if (!res.ok) throw new Error(data?.error ?? data?.message ?? "Login failed");

      setAdminToken(data.accessToken);

      const permsFromLogin = data?.user?.permissions ?? data?.permissions;
      if (Array.isArray(permsFromLogin) && permsFromLogin.length > 0) {
        setAdminPermissions(permsFromLogin);
      } else {
        try {
          const me = await api.get("/admin/auth/me");
          setAdminPermissions(me.data?.permissions || []);
        } catch {
          setAdminPermissions([]);
        }
      }

      nav(from, { replace: true });
    } catch (e: any) {
      setErr(e?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand shadow-lg mb-4">
            <span className="text-2xl font-black text-white">QB</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">QuickBee Admin</h1>
          <p className="mt-1 text-gray-400 text-sm">Sign in to your admin account</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-2xl px-8 py-8">
          <form onSubmit={onSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/10 py-3 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/40"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/10 py-3 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/40"
                />
              </div>
            </div>

            {/* Error */}
            {err && (
              <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" /> {err}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white shadow-md hover:bg-brand/90 focus:outline-none focus:ring-2 focus:ring-brand/50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" /> Sign In
                </>
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-gray-600">
          QuickBee Admin Portal · Authorised access only
        </p>
      </div>
    </div>
  );
}
