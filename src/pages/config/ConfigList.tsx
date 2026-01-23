import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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

const GROUP_ORDER = ["Platform Fee", "Cashout", "KYC", "Ratings", "Notifications", "Other"] as const;

function prettyValue(v: any) {
  if (typeof v === "boolean") return v ? "✅ TRUE" : "❌ FALSE";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return v.length > 60 ? v.slice(0, 60) + "…" : v;
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
    queryFn: fetchSystemConfigs,
  });

  const rows: Row[] = (data ?? []) as any[];

  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Row | null>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;

    return rows.filter((r) => {
      const def = getConfigDef(r.key);
      const label = def?.label ?? "";
      const desc = (r.description ?? def?.help ?? "") as string;

      // for secrets, don't leak actual value into search string
      const valueStr = r.isSecret
        ? "[secret]"
        : (() => {
            try {
              return JSON.stringify(r.value ?? "");
            } catch {
              return String(r.value ?? "");
            }
          })();

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
      const g = def?.group ?? "Other";
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

  if (isLoading) return <div>Loading system config…</div>;
  if (isError) return <div style={{ color: "crimson" }}>Failed: {(error as any)?.message ?? "Error"}</div>;

  return (
    <div style={{ fontFamily: "system-ui" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h2 style={{ margin: 0 }}>System Configuration</h2>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search key / label / description / value…"
          style={{
            width: 360,
            maxWidth: "50vw",
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #ddd",
            fontWeight: 700,
          }}
        />
      </div>

      <div style={{ marginTop: 8, color: "#6B7280", fontSize: 12, fontWeight: 700 }}>
        Click a row to edit. Total: {filtered.length} configs
      </div>

      <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 18 }}>
        {GROUP_ORDER.map((group) => {
          const list = grouped.get(group) ?? [];
          if (!list.length) return null;

          return (
            <div key={group} style={{ border: "1px solid #eee", borderRadius: 12, background: "#fff" }}>
              <div
                style={{
                  padding: "12px 14px",
                  borderBottom: "1px solid #f0f0f0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ fontWeight: 900 }}>{group}</div>
                <div style={{ color: "#6B7280", fontSize: 12, fontWeight: 800 }}>{list.length} items</div>
              </div>

              <table className="admin-table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th style={{ width: 360 }}>Key</th>
                    <th style={{ width: 220 }}>Value</th>
                    <th>Description</th>
                    <th style={{ width: 180 }}>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((row) => {
                    const def = getConfigDef(row.key);
                    const label = def?.label;

                    const valueCell = row.isSecret ? (
                      <span style={{ fontWeight: 900 }}>🔒 [SECRET]</span>
                    ) : (
                      <span style={{ fontWeight: 800 }}>{prettyValue(row.value)}</span>
                    );

                    return (
                      <tr
                        key={row.id}
                        onClick={() => setSelected(row)}
                        style={{ cursor: "pointer" }}
                        title="Click to edit"
                      >
                        <td>
                          <div style={{ fontWeight: 900 }}>
                            <code>{row.key}</code>
                          </div>
                          {label ? (
                            <div style={{ fontSize: 12, color: "#6B7280", fontWeight: 800, marginTop: 2 }}>
                              {label} {def?.danger ? "⚠️" : ""} {row.isSecret ? "🔒" : ""}
                            </div>
                          ) : row.isSecret ? (
                            <div style={{ fontSize: 12, color: "#6B7280", fontWeight: 800, marginTop: 2 }}>🔒 Secret</div>
                          ) : null}
                        </td>

                        <td>{valueCell}</td>

                        <td style={{ color: "#444" }}>{row.description ?? def?.help ?? ""}</td>
                        <td style={{ color: "#444" }}>{new Date(row.updatedAt).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      {selected ? <ConfigEditModal row={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}
