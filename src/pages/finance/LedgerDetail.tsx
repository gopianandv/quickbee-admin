import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import StatusBadge from "@/components/ui/StatusBadge";
import { adminGetLedgerTxn } from "@/api/adminFinanceLedgerApi";
import CopyIdButton from "@/components/ui/CopyIdButton";

function formatINR(paise: number) {
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  return `${sign}₹${(abs / 100).toFixed(2)}`;
}

export default function LedgerDetail() {
  const { walletTxnId } = useParams();
  const [loading, setLoading] = useState(false);
  const [row, setRow] = useState<any>(null);

  async function load() {
    if (!walletTxnId) return;
    setLoading(true);
    try {
      const data = await adminGetLedgerTxn(walletTxnId);
      setRow(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletTxnId]);

  if (loading) return <div style={{ padding: 16 }}>Loading…</div>;
  if (!row) return <div style={{ padding: 16 }}>Not found.</div>;

  return (
    <div style={{ padding: 16, fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <h2 style={{ margin: 0 }}>Wallet Transaction</h2>
          <div style={{ marginTop: 6, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ opacity: 0.7, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
              {row.id}
            </div>
            <CopyIdButton value={row.id} label="Wallet Txn ID" />
          </div>

        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <StatusBadge status={row.status} />
          <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontWeight: 800 }}>
            {formatINR(row.amountPaise)}
          </div>
        </div>
      </div>

      {/* Deep links */}
      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", fontSize: 13, alignItems: "center" }}>
        {row.user?.id ? (
          <>
            <Link to={`/admin/users/${row.user.id}`}>User</Link>
            <CopyIdButton value={row.user.id} label="User ID" />
          </>
        ) : null}

        {row.task?.id ? (
          <>
            <Link to={`/admin/tasks/${row.task.id}`}>Task</Link>
            <CopyIdButton value={row.task.id} label="Task ID" />
          </>
        ) : null}

        {row.links?.cashoutId ? (
          <>
            <Link to={`/admin/finance/cashouts/${row.links.cashoutId}`}>Cashout</Link>
            <CopyIdButton value={row.links.cashoutId} label="Cashout ID" />
          </>
        ) : null}

        {row.links?.paymentIntentId ? (
          <>
            <Link to={`/admin/finance/payment-intents/${row.links.paymentIntentId}`}>Payment Intent</Link>
            <CopyIdButton value={row.links.paymentIntentId} label="PaymentIntent ID" />
          </>
        ) : null}
      </div>



      {/* Computed */}
      <div style={{ marginTop: 16, border: "1px solid #e5e5e5", borderRadius: 8, padding: 12 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Computed</div>
        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 8, fontSize: 13 }}>
          <div style={{ opacity: 0.7 }}>Direction</div>
          <div>{row.computed?.direction ?? (row.amountPaise < 0 ? "DEBIT" : "CREDIT")}</div>

          <div style={{ opacity: 0.7 }}>Abs Amount</div>
          <div>{formatINR(row.computed?.absAmountPaise ?? Math.abs(row.amountPaise))}</div>
        </div>
      </div>

      {/* Raw payload */}
      <details style={{ marginTop: 16 }}>
        <summary
          style={{
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13,
            opacity: 0.8,
          }}
        >
          Technical details (raw payload)
        </summary>

        <pre
          style={{
            marginTop: 8,
            padding: 12,
            background: "#fafafa",
            border: "1px solid #e5e5e5",
            borderRadius: 6,
            fontSize: 12,
            overflowX: "auto",
          }}
        >
          {JSON.stringify(row, null, 2)}
        </pre>
      </details>

    </div>
  );
}
