import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import PlatformFeeLedgerList from "@/pages/finance/PlatformFeeLedgerList";
import PlatformFeeBalancesList from "@/pages/finance/PlatformFeeBalancesList";
import { PageHeader } from "@/components/ui/PageHeader";

type Tab = "balances" | "ledger";

export default function PlatformFeesPage() {
  const [sp, setSp] = useSearchParams();

  const tab: Tab = useMemo(() => {
    const t = (sp.get("tab") ?? "balances") as Tab;
    return t === "ledger" || t === "balances" ? t : "balances";
  }, [sp]);

  function setTab(next: Tab) {
    setSp((prev) => {
      const p = new URLSearchParams(prev);
      p.set("tab", next);
      return p;
    });
  }

  return (
    <div>
      <PageHeader
        title="Platform Fees"
        subtitle="Balances = outstanding per helper. Ledger = full audit trail."
        actions={
          <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
            <button
              onClick={() => setTab("balances")}
              className={[
                "rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors",
                tab === "balances"
                  ? "bg-brand text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50",
              ].join(" ")}
            >
              Balances
            </button>
            <button
              onClick={() => setTab("ledger")}
              className={[
                "rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors",
                tab === "ledger"
                  ? "bg-brand text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50",
              ].join(" ")}
            >
              Ledger
            </button>
          </div>
        }
      />

      {tab === "balances" ? <PlatformFeeBalancesList /> : <PlatformFeeLedgerList />}
    </div>
  );
}
