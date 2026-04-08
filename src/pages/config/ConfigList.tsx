// ConfigListPage.tsx
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, AlertTriangle, Pencil } from "lucide-react";
import { fetchSystemConfigs } from "@/api/config.api";
import ConfigEditModal from "./ConfigEditModal";
import { CONFIG_DEFS, getConfigDef } from "./config.defs";

type Row = {
  id: string;
  key: string;
  value: any;
  description?: string | null;
  updatedAt: string;
  isSecret?: boolean;
};

const GROUP_ORDER = ["Platform Fee", "Cashout", "KYC", "Ratings", "Other"] as const;

function prettyValue(v: any) {
  if (typeof v === "boolean") return v ? "✅ TRUE" : "❌ FALSE";
  if (typeof v === "number")  return String(v);
  if (typeof v === "string")  return v.length > 60 ? v.slice(0, 60) + "…" : v;
  if (Array.isArray(v)) return `[${v.join(", ")}]`;
  try {
    const s = JSON.stringify(v);
    return s.length > 60 ? s.slice(0, 60) + "…" : s;
  } catch {
    return String(v);
  }
}

export default function ConfigListPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-config"],
    queryFn:  fetchSystemConfigs,
  });

  const rows: Row[] = (data ?? []) as any[];

  const [q,        setQ]        = useState("");
  const [selected, setSelected] = useState<Row | null>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const def      = getConfigDef(r.key);
      const label    = def?.label ?? "";
      const desc     = (r.description ?? def?.help ?? "") as string;
      const valueStr = r.isSecret
        ? "[secret]"
        : (() => { try { return JSON.stringify(r.value ?? ""); } catch { return String(r.value ?? ""); } })();
      return (
        r.key.toLowerCase().includes(s) ||
        label.toLowerCase().includes(s) ||
        desc.toLowerCase().includes(s) ||
        valueStr.toLowerCase().includes(s)
      );
    });
  }, [q, rows]);

  const grouped = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const g of GROUP_ORDER) map.set(g, []);
    for (const r of filtered) {
      const def = getConfigDef(r.key);
      const g   = def?.group ?? "Other";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(r);
    }
    const defIndex = new Map(CONFIG_DEFS.map((d, i) => [d.key, i]));
    for (const [g, list] of map.entries()) {
      list.sort((a, b) => {
        const ai = defIndex.has(a.key) ? (defIndex.get(a.key) as number) : 9999;
        const bi = defIndex.has(b.key) ? (defIndex.get(b.key) as number) : 9999;
        if (ai !== bi) return ai - bi;
        return a.key.localeCompare(b.key);
      });
      map.set(g, list);
    }
    return map;
  }, [filtered]);

  if (isLoading) return (
    <div className="flex items-center gap-2 py-8 text-sm text-gray-500">
      <div className="h-4 w-4 rounded-full border-2 border-gray-300 border-t-brand animate-spin" />
      Loading system config…
    </div>
  );
  if (isError) return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      Failed: {(error as any)?.message ?? "Error"}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Search + count */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search key / label / description / value…"
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
          />
        </div>
        <span className="text-xs text-gray-400 font-semibold">
          Click a row to edit · {filtered.length} configs
        </span>
      </div>

      {/* ENV-managed notice */}
      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
        <div>
          Notifications are currently <b>ENV-managed</b> (Render environment variables like <code className="font-mono text-xs bg-amber-100 rounded px-1">NOTIF_*</code>).
          They are intentionally <b>not</b> editable here to avoid mismatches between DB and runtime behavior.
        </div>
      </div>

      {/* Config groups */}
      <div className="flex flex-col gap-4">
        {GROUP_ORDER.map((group) => {
          const list = grouped.get(group) ?? [];
          if (!list.length) return null;

          return (
            <div key={group} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              {/* Group header */}
              <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/60 px-5 py-3">
                <span className="text-sm font-semibold text-gray-700">{group}</span>
                <span className="text-xs text-gray-400">{list.length} item{list.length !== 1 ? "s" : ""}</span>
              </div>

              {/* Rows */}
              <div className="divide-y divide-gray-100">
                {list.map((row) => {
                  const def   = getConfigDef(row.key);
                  const label = def?.label;

                  return (
                    <div
                      key={row.id}
                      onClick={() => setSelected(row)}
                      title="Click to edit"
                      className="group flex items-start gap-4 px-5 py-4 hover:bg-blue-50/30 cursor-pointer transition-colors"
                    >
                      {/* Key + label */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <code className="font-mono text-xs font-bold text-gray-800 bg-gray-100 rounded px-1.5 py-0.5">
                            {row.key}
                          </code>
                          {def?.danger && <span title="Danger config">⚠️</span>}
                          {row.isSecret && <span title="Secret">🔒</span>}
                        </div>
                        {label && (
                          <p className={`mt-0.5 text-xs font-semibold ${def?.danger ? "text-red-600" : "text-gray-500"}`}>
                            {label}
                          </p>
                        )}
                        {(row.description || def?.help) && (
                          <p className="mt-1 text-xs text-gray-400 line-clamp-2">
                            {row.description ?? def?.help}
                          </p>
                        )}
                      </div>

                      {/* Value */}
                      <div className="w-[200px] shrink-0">
                        {row.isSecret ? (
                          <span className="text-sm font-bold text-gray-500">🔒 [SECRET]</span>
                        ) : (
                          <span className="text-sm font-semibold text-gray-800 break-all">
                            {prettyValue(row.value)}
                          </span>
                        )}
                      </div>

                      {/* Updated */}
                      <div className="w-[150px] shrink-0 text-xs text-gray-400">
                        {new Date(row.updatedAt).toLocaleString()}
                      </div>

                      {/* Edit icon */}
                      <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Pencil className="h-4 w-4 text-brand" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {selected && <ConfigEditModal row={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
