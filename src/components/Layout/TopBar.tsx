import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, LogOut, Loader2, ShieldCheck } from "lucide-react";
import { clearAdminToken } from "@/auth/tokenStore";
import { adminSearchById } from "@/api/adminSearchApi";
import { cn } from "@/lib/utils";

export default function TopBar() {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSearch() {
    const id = q.trim();
    if (!id) return;
    setBusy(true);
    setErr(null);
    try {
      const hit = await adminSearchById(id);
      nav(hit.route);
      setQ("");
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        (e as { message?: string })?.message ??
        "Not found";
      setErr(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-amber-100/70 bg-white/90 px-5 shadow-sm backdrop-blur-xl">
      <div className="hidden lg:flex min-w-[180px] flex-col">
        <span className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-600">Thenee Ops</span>
        <span className="text-sm font-semibold text-slate-800">Pilot control room</span>
      </div>

      {/* Search */}
      <div className="relative flex-1 max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setErr(null); }}
          onKeyDown={(e) => e.key === "Enter" && onSearch()}
          disabled={busy}
          placeholder="Search by ID - user, task, cashout, payment..."
          className={cn(
            "w-full rounded-xl border bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition-all",
            err
              ? "border-red-400/50 focus:border-red-400 focus:ring-1 focus:ring-red-400/20"
              : "border-amber-100 focus:border-brand/70 focus:ring-2 focus:ring-brand/20"
          )}
        />
      </div>

      <button
        onClick={onSearch}
        disabled={busy || !q.trim()}
        className="shrink-0 flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-surface-dark border-none shadow-sm shadow-brand/20 hover:bg-brand-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
        {busy ? "Searching..." : "Go"}
      </button>

      {err && (
        <p className="text-xs text-red-600 max-w-[200px] truncate">{err}</p>
      )}

      {/* Push logout to the right */}
      <div className="flex-1" />

      <div className="hidden xl:flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
        <ShieldCheck className="h-3.5 w-3.5" />
        Secure admin
      </div>

      <button
        onClick={() => { clearAdminToken(); nav("/login"); }}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm hover:border-brand/50 hover:bg-brand-soft hover:text-slate-900 transition-colors"
      >
        <LogOut className="h-4 w-4" />
        Logout
      </button>
    </header>
  );
}
