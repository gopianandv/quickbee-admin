import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import StatusBadge from "@/components/ui/StatusBadge";
import { adminGetPlatformFee } from "@/api/adminPlatformFeeLedgerApi";
import CopyIdButton from "@/components/ui/CopyIdButton";

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

  const labelStyle: React.CSSProperties = { opacity: 0.7 };
  const mono: React.CSSProperties = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" };
  const valueRow: React.CSSProperties = { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" };

  return (
    <div style={{ padding: 16, fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <h2 style={{ margin: 0 }}>Platform Fee Row</h2>

          <div style={{ opacity: 0.7, marginTop: 6, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              ID: <span style={mono}>{row.id}</span>
            </div>
            <CopyIdButton value={row.id} label="PlatformFee ID" />
          </div>
        </div>

        <div style={mono}>
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
            <div style={labelStyle}>Amount</div>
            <div style={mono}>{formatINR(row.amountPaise)}</div>

            <div style={labelStyle}>Kind</div>
            <div style={mono}>{row.kind}</div>

            <div style={labelStyle}>Via</div>
            <div style={mono}>{row.via ?? "—"}</div>

            <div style={labelStyle}>Created</div>
            <div>{new Date(row.createdAt).toLocaleString()}</div>

            {/* ✅ FIX: add label cells for User + Task */}
            <div style={labelStyle}>User</div>
            <div style={valueRow}>
              <Link to={`/admin/users/${row.userId}`}>
                {row.user?.email ?? <span style={mono}>{row.userId}</span>}
              </Link>
              <CopyIdButton value={row.userId} label="User ID" />
            </div>

            <div style={labelStyle}>Task</div>
            <div style={valueRow}>
              {row.task?.id ? (
                <>
                  <Link to={`/admin/tasks/${row.task.id}`}>
                    {row.task.title ?? <span style={mono}>{row.task.id}</span>}
                  </Link>
                  <CopyIdButton value={row.task.id} label="Task ID" />
                </>
              ) : (
                "—"
              )}
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
