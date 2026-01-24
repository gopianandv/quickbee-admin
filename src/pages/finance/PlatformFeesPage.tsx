import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import PlatformFeeLedgerList from "@/pages/finance/PlatformFeeLedgerList";
import PlatformFeeBalancesList from "@/pages/finance/PlatformFeeBalancesList";

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
      // keep other query params (like userId) so "Open ledger" works nicely
      return p;
    });
  }

  return (
    <div style={{ padding: 0 }}>
      <div style={{ padding: 16, fontFamily: "system-ui", borderBottom: "1px solid #eee", background: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div>
            <h2 style={{ margin: 0 }}>Platform Fees</h2>
            <div style={{ opacity: 0.7, marginTop: 4 }}>
              Balances = outstanding per helper. Ledger = audit trail.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setTab("balances")}
              style={{ padding: "9px 12px", fontWeight: tab === "balances" ? 800 : 600 }}
            >
              Balances
            </button>
            <button
              onClick={() => setTab("ledger")}
              style={{ padding: "9px 12px", fontWeight: tab === "ledger" ? 800 : 600 }}
            >
              Ledger
            </button>
          </div>
        </div>
      </div>

      {tab === "balances" ? <PlatformFeeBalancesList /> : <PlatformFeeLedgerList />}
    </div>
  );
}
