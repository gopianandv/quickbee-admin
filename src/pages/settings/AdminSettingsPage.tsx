import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ConfigListPage from "@/pages/config/ConfigList";
import TaxonomySettings from "./TaxonomySettings";

type SettingsTab = "system" | "taxonomy";

const tabBtn = (active: boolean) => ({
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid #e5e5e5",
  background: active ? "#111" : "#fff",
  color: active ? "#fff" : "#111",
  cursor: "pointer",
  fontWeight: 700,
});

export default function AdminSettingsPage() {
  const [sp, setSp] = useSearchParams();
  const tab = (sp.get("tab") as SettingsTab) || "system";

  const setTab = (t: SettingsTab) => {
    setSp((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", t);
      // reset nested tab when switching
      if (t !== "taxonomy") next.delete("ttab");
      return next;
    });
  };

  const title = useMemo(() => {
    if (tab === "taxonomy") return "Settings • Taxonomy";
    return "Settings • System Configs";
  }, [tab]);

  return (
    <div style={{ padding: 16, fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <h2 style={{ margin: 0 }}>{title}</h2>
          <div style={{ opacity: 0.7, marginTop: 4 }}>
            Admin-only configuration. Use disable (isActive=false) instead of deleting.
          </div>
        </div>
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button style={tabBtn(tab === "system")} onClick={() => setTab("system")}>
          System Configs
        </button>
        <button style={tabBtn(tab === "taxonomy")} onClick={() => setTab("taxonomy")}>
          Taxonomy (Categories / Skills / Tags)
        </button>
      </div>

      <div style={{ marginTop: 14 }}>
        {tab === "system" ? <ConfigListPage /> : <TaxonomySettings />}
      </div>
    </div>
  );
}
