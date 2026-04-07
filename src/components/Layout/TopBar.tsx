import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, LogOut, Loader2 } from "lucide-react";
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
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/[0.08] bg-surface px-4">
      {/* Search */}
      <div className="relative flex-1 max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setErr(null); }}
          onKeyDown={(e) => e.key === "Enter" && onSearch()}
          disabled={busy}
          placeholder="Search by ID — user, task, cashout, payment…"
          className={cn(
            "w-full rounded-lg border bg-white/[0.07] py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 outline-none transition-all",
            err
              ? "border-red-400/50 focus:border-red-400 focus:ring-1 focus:ring-red-400/20"
              : "border-white/[0.1] focus:border-brand/60 focus:ring-1 focus:ring-brand/20"
          )}
        />
      </div>

      <button
        onClick={onSearch}
        disabled={busy || !q.trim()}
        className="shrink-0 flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-surface-dark border-none hover:bg-brand-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
        {busy ? "Searching…" : "Go"}
      </button>

      {err && (
        <p className="text-xs text-red-300 max-w-[200px] truncate">{err}</p>
      )}

      {/* Push logout to the right */}
      <div className="flex-1" />

      <button
        onClick={() => { clearAdminToken(); nav("/login"); }}
        className="flex items-center gap-2 rounded-lg border border-white/[0.1] bg-transparent px-3 py-2 text-sm font-medium text-slate-400 hover:bg-white/[0.06] hover:text-white hover:border-white/20 transition-colors"
      >
        <LogOut className="h-4 w-4" />
        Logout
      </button>
    </header>
  );
}
