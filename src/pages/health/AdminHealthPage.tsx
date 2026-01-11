import { useEffect, useState } from "react";
import { getAdminHealth, type AdminHealthResponse } from "@/api/adminHealth";

function Pill({ ok, label }: { ok: boolean | null; label: string }) {
  const bg = ok === true ? "#e8fff0" : ok === false ? "#ffecec" : "#f5f5f5";
  const bd = ok === true ? "#1e8e3e" : ok === false ? "#d93025" : "#999";
  const color = ok === true ? "#1e8e3e" : ok === false ? "#d93025" : "#555";

  return (
    <span style={{ padding: "4px 10px", borderRadius: 999, border: `1px solid ${bd}`, background: bg, color, fontWeight: 800, fontSize: 12 }}>
      {label}
    </span>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14, background: "white" }}>
      <div style={{ fontWeight: 900, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

export default function AdminHealthPage() {
  const [data, setData] = useState<AdminHealthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const d = await getAdminHealth();
      setData(d);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Failed to load health");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ maxWidth: 1100, margin: "30px auto", fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h2 style={{ margin: 0 }}>System Health</h2>
        <button onClick={load} disabled={loading} style={{ padding: "8px 12px" }}>
          Refresh
        </button>
      </div>

      {data?.time ? <div style={{ color: "#666", marginTop: 6 }}>Generated: {new Date(data.time).toLocaleString()}</div> : null}
      {err ? <div style={{ color: "crimson", marginTop: 10 }}>{err}</div> : null}
      {loading && !data ? <div style={{ marginTop: 10 }}>Loading…</div> : null}

      {!data ? null : (
        <>
          <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center" }}>
            <Pill ok={data.ok} label={data.ok ? "OK" : "DEGRADED"} />
            <div style={{ color: "#666" }}>{data.service}</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
            <Card title="Database">
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>Status</div>
                <Pill ok={data.checks.db.ok} label={data.checks.db.ok ? "Connected" : "Error"} />
              </div>
              <div style={{ marginTop: 8, color: "#555" }}>Latency: <b>{data.checks.db.ms} ms</b></div>
              {data.checks.db.error ? <div style={{ marginTop: 8, color: "crimson", fontSize: 12 }}>{data.checks.db.error}</div> : null}
            </Card>

            <Card title="S3">
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>Status</div>
                <Pill ok={data.checks.s3.configured ? data.checks.s3.ok : null} label={!data.checks.s3.configured ? "Not configured" : data.checks.s3.ok ? "Signing OK" : "Error"} />
              </div>
              {data.checks.s3.error ? <div style={{ marginTop: 8, color: data.checks.s3.configured ? "crimson" : "#666", fontSize: 12 }}>{data.checks.s3.error}</div> : null}
            </Card>

            <Card title="Build Info">
              <div style={{ color: "#555" }}>NODE_ENV: <b>{data.build.nodeEnv}</b></div>
              <div style={{ color: "#555" }}>Version: <b>{data.build.version ?? "-"}</b></div>
              <div style={{ color: "#555" }}>Git SHA: <b>{data.build.gitSha ?? "-"}</b></div>
              <div style={{ color: "#555" }}>Render Service: <b>{data.build.renderService ?? "-"}</b></div>
            </Card>
          </div>

          <div style={{ marginTop: 12, color: "#666", fontSize: 13 }}>
            This page checks DB connectivity and S3 signing readiness. It does not fetch actual S3 objects (safe by design).
          </div>
        </>
      )}
    </div>
  );
}
