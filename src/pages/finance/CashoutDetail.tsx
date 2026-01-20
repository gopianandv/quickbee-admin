import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  adminGetCashout,
  adminMarkCashoutProcessing,
  adminMarkCashoutPaid,
  adminMarkCashoutFailed,
  adminCancelCashout,
} from "@/api/adminFinance";
import { hasPerm } from "@/auth/permissions";

function moneyRs(paise?: number | null) {
  const n = Number(paise ?? 0);
  return (n / 100).toFixed(2);
}

function norm(s?: any) {
  return String(s ?? "").trim().toUpperCase();
}

export default function CashoutDetail() {
  const { cashoutId } = useParams();
  const id = cashoutId as string;

  const canFinance = hasPerm("FINANCE", "ADMIN");

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [note, setNote] = useState("");
  const [failureReason, setFailureReason] = useState("");

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const d = await adminGetCashout(id);
      setData(d);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Failed to load cashout");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const status = useMemo(() => norm(data?.status), [data]);

  // ✅ Canonical action rules (MVP)
  // REQUESTED -> PROCESSING -> PAID / FAILED
  // REQUESTED can also be CANCELLED
  const isTerminal = status === "PAID" || status === "FAILED" || status === "CANCELLED";

  const canMarkProcessing = status === "REQUESTED";

  // ✅ Mark Paid should be enabled whenever PROCESSING.
  // Backend already prevents duplicates via walletTxnId + idempotencyKey.
  const canMarkPaid = status === "PROCESSING";

  const canMarkFailed = status === "PROCESSING"; // keep strict (MVP)
  const canCancel = status === "REQUESTED";


  if (!canFinance) {
    return (
      <div style={{ maxWidth: 1100, margin: "30px auto", fontFamily: "system-ui" }}>
        <h2>Cashout</h2>
        <div style={{ color: "crimson" }}>You don’t have FINANCE permission.</div>
        <div style={{ marginTop: 10 }}>
          <Link to="/admin/dashboard">Back to dashboard</Link>
        </div>
      </div>
    );
  }

  if (loading) return <div style={{ padding: 20, fontFamily: "system-ui" }}>Loading…</div>;
  if (err) return <div style={{ padding: 20, fontFamily: "system-ui", color: "crimson" }}>{err}</div>;
  if (!data) return null;

  async function doAction(fn: () => Promise<any>) {
    if (saving) return;
    setSaving(true);
    try {
      await fn();
      await load();
    } catch (e: any) {
      console.log("Cashout action error:", e);

      const status = e?.response?.status;
      const payload = e?.response?.data;

      alert(
        [
          "Action failed",
          status ? `HTTP: ${status}` : null,
          payload ? `Payload: ${JSON.stringify(payload)}` : null,
          e?.message ? `Message: ${e.message}` : null,
        ]
          .filter(Boolean)
          .join("\n")
      );
    }
    finally {
      setSaving(false);
    }
  }

  const methodType = norm(data?.methodType);

  return (
    <div style={{ maxWidth: 1100, margin: "30px auto", fontFamily: "system-ui" }}>
      <div style={{ marginBottom: 12 }}>
        <Link to="/admin/finance/cashouts">← Back to Cashouts</Link>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Cashout</h2>
        <StatusBadge status={data.status} />
        {isTerminal ? (
          <span style={{ fontSize: 12, color: "#666" }}>· Terminal</span>
        ) : (
          <span style={{ fontSize: 12, color: "#666" }}>· Active</span>
        )}
      </div>

      <div style={{ color: "#666", marginTop: 6 }}>
        Cashout ID: <code>{data.id}</code>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 12 }}>
        {/* Summary */}
        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Summary</div>
          <div>
            Amount: <b>₹ {moneyRs(data.amountPaise)}</b>
          </div>
          <div>
            Method: <b>{data.methodType}</b>
          </div>
          <div>
            Status: <StatusBadge status={data.status} />
          </div>
          <div>Created: {new Date(data.createdAt).toLocaleString()}</div>
          <div>Processed: {data.processedAt ? new Date(data.processedAt).toLocaleString() : "-"}</div>
          <div>Failure: {data.failureReason || "-"}</div>
        </div>

        {/* User */}
        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>User</div>
          <div>
            {data.user?.id ? (
              <Link to={`/admin/users/${data.user.id}`}>{data.user.email}</Link>
            ) : (
              data.user?.email || data.userId
            )}
          </div>
          {data.user?.name ? <div style={{ color: "#666" }}>{data.user.name}</div> : null}
        </div>

        {/* Payout details */}
        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Payout Details</div>

          {methodType === "UPI" ? (
            <div>
              UPI: <b>{data.upiId || "-"}</b>
            </div>
          ) : (
            <>
              <div>
                Holder: <b>{data.bankHolderName || "-"}</b>
              </div>
              <div>
                IFSC: <b>{data.bankIfsc || "-"}</b>
              </div>
              <div>
                Account: <b>{data.bankAccountLast4 ? `XXXX${data.bankAccountLast4}` : "-"}</b>
              </div>
            </>
          )}
        </div>

        {/* Ledger link */}
        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Ledger Link</div>
          {data.walletTxnId ? (
            <div>
              WalletTxn: <code>{data.walletTxnId}</code>
              <div style={{ marginTop: 6, fontSize: 12, color: "#666" }}>
                (Next: we’ll add Wallet Ledger page and link this properly.)
              </div>
            </div>
          ) : (
            <div style={{ color: "#666" }}>No wallet transaction linked yet.</div>
          )}
        </div>

        {/* Actions */}
        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14, gridColumn: "1 / -1" }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Finance Actions</div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button
              disabled={!canMarkProcessing || saving}
              onClick={() => doAction(() => adminMarkCashoutProcessing(id, note.trim() || undefined))}
              title={!canMarkProcessing ? "Allowed only when status is REQUESTED" : undefined}
            >
              Mark Processing
            </button>

            <button
              disabled={!canMarkPaid || saving}
              onClick={() => doAction(() => adminMarkCashoutPaid(id, note.trim() || undefined))}
              title={
                !canMarkPaid
                  ? status !== "PROCESSING"
                    ? "Mark Paid is allowed only when status is PROCESSING"
                    : data?.walletTxnId
                      ? "Already linked to a wallet transaction"
                      : undefined
                  : undefined
              }
            >
              Mark Paid (creates ledger debit)
            </button>

            <button
              disabled={!canMarkFailed || saving}
              onClick={() => {
                const reason = failureReason.trim() || window.prompt("Failure reason:");
                if (!reason) return;
                setFailureReason(reason);
                doAction(() => adminMarkCashoutFailed(id, reason));
              }}
              title={!canMarkFailed ? "Allowed when status is REQUESTED or PROCESSING" : undefined}
            >
              Mark Failed
            </button>

            <button
              disabled={!canCancel || saving}
              onClick={() => {
                const n = note.trim() || window.prompt("Cancel note (optional):") || undefined;
                doAction(() => adminCancelCashout(id, n));
              }}
              title={!canCancel ? "Allowed only when status is REQUESTED" : undefined}
            >
              Cancel Request
            </button>

            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note (used for audit/memo)"
              style={{ flex: 1, minWidth: 260, padding: 8 }}
            />
          </div>

          <div style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
            Rules: REQUESTED → PROCESSING → PAID/FAILED. REQUESTED → CANCELLED. PAID creates WalletTransaction
            DEBIT_CASHOUT and links it.
          </div>
        </div>
      </div>
    </div>
  );
}
