import { api } from "@/api/client";
import { setAdminPermissions, setAdminToken } from "@/auth/tokenStore";
import { AlertCircle, Lock, LogIn, Mail } from "lucide-react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "https://api.thenee.app";
const beeLogo = "/bee-logo.png";
const wordmarkLight = new URL("../assets/thenee-wordmark-light.svg", import.meta.url).href;

export default function Login() {
  const [email, setEmail] = useState("");
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#101820] p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(243,171,37,0.22),transparent_30%),radial-gradient(circle_at_85%_12%,rgba(255,255,255,0.10),transparent_26%),linear-gradient(135deg,#101820_0%,#263238_58%,#171f22_100%)]" />
      <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(30deg,#f3ab25_12%,transparent_12.5%,transparent_87%,#f3ab25_87.5%,#f3ab25),linear-gradient(150deg,#f3ab25_12%,transparent_12.5%,transparent_87%,#f3ab25_87.5%,#f3ab25),linear-gradient(30deg,#f3ab25_12%,transparent_12.5%,transparent_87%,#f3ab25_87.5%,#f3ab25),linear-gradient(150deg,#f3ab25_12%,transparent_12.5%,transparent_87%,#f3ab25_87.5%,#f3ab25)] [background-size:56px_98px] [background-position:0_0,0_0,28px_49px,28px_49px]" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.06] shadow-2xl backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr]">
        <div className="hidden min-h-[560px] flex-col justify-between border-r border-white/10 p-10 lg:flex">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-lg ring-1 ring-brand/30">
                <img src={beeLogo} alt="Thenee" className="h-11 w-11 object-contain" />
              </div>
              <img src={wordmarkLight} alt="Thenee" className="h-10 w-36 object-contain" />
            </div>

            <div className="mt-14 max-w-md">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-300">Operations console</p>
              <h1 className="mt-4 text-4xl font-black leading-tight text-white">
                Run the local helper marketplace with confidence.
              </h1>
              <p className="mt-5 text-base leading-7 text-slate-300">
                Review users, tasks, KYC, payments, leads, and support activity from one branded Thenee workspace.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {["Trust", "Finance", "Support"].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-amber-200/80">{item}</div>
                <div className="mt-2 h-1 rounded-full bg-brand/80" />
              </div>
            ))}
          </div>
        </div>

        <div className="w-full px-6 py-8 sm:px-10 lg:px-12 lg:py-14">
          <div className="mb-8 text-center lg:text-left">
            <div className="mb-5 inline-flex items-center gap-3 lg:hidden">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-lg ring-1 ring-brand/30">
                <img src={beeLogo} alt="Thenee" className="h-11 w-11 object-contain" />
              </div>
              <img src={wordmarkLight} alt="Thenee" className="h-10 w-36 object-contain" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">Thenee Admin</h1>
            <p className="mt-2 text-sm text-gray-300">Sign in to manage the pilot workspace.</p>
          </div>

          <div className="rounded-3xl border border-white/15 bg-white/95 px-6 py-7 shadow-2xl sm:px-8">
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 shadow-sm placeholder-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 shadow-sm placeholder-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                </div>
              </div>

              {err && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {err}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border-none bg-brand px-4 py-3 text-sm font-black text-surface-dark shadow-lg shadow-brand/20 transition-colors hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand/50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-surface-dark/25 border-t-surface-dark animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" /> Sign In
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            Thenee Admin Portal - authorised access only
          </p>
        </div>
      </div>
    </div>
  );
}
