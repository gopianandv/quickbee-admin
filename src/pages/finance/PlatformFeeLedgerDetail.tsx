import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import StatusBadge from "@/components/ui/StatusBadge";
import { adminGetPlatformFee } from "@/api/adminPlatformFeeLedgerApi";

function formatINR(paise: number) {
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  return `${sign}₹${(abs / 100).toFixed(2)}`;
}

export default function PlatformFeeLedgerDetail() {
  const { feeId } = useParams();
  const [loading, setLoading] = useState(false);
  const [row, setRow] = useState<any>(null);

  async function load() {
    if (!feeId) return;
    setLoading(true);
    try {
      const data = await adminGetPlatformFee(feeId);
      setRow(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feeId]);

  if (loading) return <div style={{ padding: 16, fontFamily: "system-ui" }}>Loading…</div>;
  if (!row) return <div style={{ padding: 16, fontFamily: "system-ui" }}>Not found.</div>;

  return (
    <div style={{ padding: 16, fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <h2 style={{ margin: 0 }}>Platform Fee Row</h2>
          <div style={{ opacity: 0.7, marginTop: 4 }}>
            ID: <span style={{ fontFamily: "ui-monospace" }}>{row.id}</span>
          </div>
        </div>
        <div style={{ fontFamily: "ui-monospace" }}>
          {formatINR(row.amountPaise)}{" "}
          <span style={{ marginLeft: 8 }}>
            <StatusBadge status={row.kind} />
          </span>
        </div>
      </div>

      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ border: "1px solid #e5e5e5", borderRadius: 8, padding: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Summary</div>

          <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", rowGap: 8, columnGap: 10, fontSize: 13 }}>
            <div style={{ opacity: 0.7 }}>Amount</div>
            <div style={{ fontFamily: "ui-monospace" }}>{formatINR(row.amountPaise)}</div>

            <div style={{ opacity: 0.7 }}>Kind</div>
            <div style={{ fontFamily: "ui-monospace" }}>{row.kind}</div>

            <div style={{ opacity: 0.7 }}>Via</div>
            <div style={{ fontFamily: "ui-monospace" }}>{row.via ?? "—"}</div>

            <div style={{ opacity: 0.7 }}>Created</div>
            <div>{new Date(row.createdAt).toLocaleString()}</div>

            <div style={{ opacity: 0.7 }}>User</div>
            <div>
              <Link to={`/admin/users/${row.userId}`}>{row.user?.email ?? row.userId}</Link>
            </div>

            <div style={{ opacity: 0.7 }}>Task</div>
            <div>
              {row.task?.id ? <Link to={`/admin/tasks/${row.task.id}`}>{row.task.title ?? "Task"}</Link> : "—"}
            </div>
          </div>
        </div>

        <div style={{ border: "1px solid #e5e5e5", borderRadius: 8, padding: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Note</div>
          <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{row.note ?? "—"}</div>
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
