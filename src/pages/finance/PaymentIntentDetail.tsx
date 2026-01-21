import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import StatusBadge from "@/components/ui/StatusBadge";
import { adminGetPaymentIntent } from "@/api/adminPaymentIntentsApi";

function formatINR(paise: number) {
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  return `${sign}₹${(abs / 100).toFixed(2)}`;
}

export default function PaymentIntentDetail() {
  const { paymentIntentId } = useParams();
  const [loading, setLoading] = useState(false);
  const [row, setRow] = useState<any>(null);

  async function load() {
    if (!paymentIntentId) return;
    setLoading(true);
    try {
      const data = await adminGetPaymentIntent(paymentIntentId);
      setRow(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentIntentId]);

  if (loading) return <div style={{ padding: 16, fontFamily: "system-ui" }}>Loading…</div>;
  if (!row) return <div style={{ padding: 16, fontFamily: "system-ui" }}>Not found.</div>;

  return (
    <div style={{ padding: 16, fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <h2 style={{ margin: 0 }}>Payment Intent</h2>
          <div style={{ opacity: 0.7, marginTop: 4 }}>
            ID: <span style={{ fontFamily: "ui-monospace" }}>{row.id}</span>
          </div>
        </div>
        <div style={{ fontFamily: "ui-monospace" }}>
          {formatINR(row.amountPaise)}{" "}
          <span style={{ marginLeft: 8 }}>
            <StatusBadge status={row.status} />
          </span>
        </div>
      </div>

      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ border: "1px solid #e5e5e5", borderRadius: 8, padding: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Summary</div>

          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", rowGap: 8, columnGap: 10, fontSize: 13 }}>
            <div style={{ opacity: 0.7 }}>Amount</div>
            <div style={{ fontFamily: "ui-monospace" }}>{formatINR(row.amountPaise)}</div>

            <div style={{ opacity: 0.7 }}>Provider</div>
            <div style={{ fontFamily: "ui-monospace" }}>{row.provider}</div>

            <div style={{ opacity: 0.7 }}>Provider Ref</div>
            <div style={{ fontFamily: "ui-monospace" }}>{row.providerRef ?? "—"}</div>

            <div style={{ opacity: 0.7 }}>Status</div>
            <div><StatusBadge status={row.status} /></div>

            <div style={{ opacity: 0.7 }}>User</div>
            <div>
              <Link to={`/admin/users/${row.userId}`}>{row.user?.email ?? row.userId}</Link>
            </div>

            <div style={{ opacity: 0.7 }}>Created</div>
            <div>{new Date(row.createdAt).toLocaleString()}</div>

            <div style={{ opacity: 0.7 }}>Updated</div>
            <div>{new Date(row.updatedAt).toLocaleString()}</div>

            <div style={{ opacity: 0.7 }}>Posted Wallet Txn</div>
            <div>
              {row.postedWalletTxnId ? (
                <Link to={`/admin/finance/ledger/${row.postedWalletTxnId}`}>{row.postedWalletTxnId}</Link>
              ) : (
                "—"
              )}
            </div>
          </div>
        </div>

        <div style={{ border: "1px solid #e5e5e5", borderRadius: 8, padding: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Posted Wallet Txn Snapshot</div>
          {row.postedWalletTxn ? (
            <div style={{ fontSize: 13, display: "grid", gridTemplateColumns: "160px 1fr", rowGap: 8, columnGap: 10 }}>
              <div style={{ opacity: 0.7 }}>Txn ID</div>
              <div><Link to={`/admin/finance/ledger/${row.postedWalletTxn.id}`}>{row.postedWalletTxn.id}</Link></div>

              <div style={{ opacity: 0.7 }}>Amount</div>
              <div style={{ fontFamily: "ui-monospace" }}>{formatINR(row.postedWalletTxn.amountPaise)}</div>

              <div style={{ opacity: 0.7 }}>Type</div>
              <div style={{ fontFamily: "ui-monospace" }}>{row.postedWalletTxn.type}</div>

              <div style={{ opacity: 0.7 }}>Status</div>
              <div><StatusBadge status={row.postedWalletTxn.status} /></div>
            </div>
          ) : (
            <div style={{ opacity: 0.7, fontSize: 13 }}>Not posted yet.</div>
          )}
        </div>
      </div>

      <details style={{ marginTop: 16 }}>
        <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 13, opacity: 0.8 }}>
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
