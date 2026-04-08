import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import ConfigListPage from "@/pages/config/ConfigList";
import TaxonomySettings from "./TaxonomySettings";
import { PageHeader } from "@/components/ui/PageHeader";

type SettingsTab = "system" | "taxonomy";

export default function AdminSettingsPage() {
  const [sp, setSp] = useSearchParams();
  const tab = (sp.get("tab") as SettingsTab) || "system";

  const setTab = (t: SettingsTab) => {
    setSp((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", t);
      if (t !== "taxonomy") next.delete("ttab");
      return next;
    });
  };

  const subtitle = useMemo(() => {
    if (tab === "taxonomy") return "Manage categories, skills, and tags used across the platform.";
    return "Admin-only system configuration. Use disable (isActive=false) instead of deleting.";
  }, [tab]);

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle={subtitle}
        actions={
          <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
            <button
              onClick={() => setTab("system")}
              className={[
                "rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors",
                tab === "system"
                  ? "bg-brand text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50",
              ].join(" ")}
            >
              System Configs
            </button>
            <button
              onClick={() => setTab("taxonomy")}
              className={[
                "rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors",
                tab === "taxonomy"
                  ? "bg-brand text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50",
              ].join(" ")}
            >
              Taxonomy
            </button>
          </div>
        }
      />

      {tab === "system" ? <ConfigListPage /> : <TaxonomySettings />}
    </div>
  );
}
