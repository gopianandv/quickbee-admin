// src/pages/jobs/JobMonitorPage.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listAdminJobs, type AdminJobHeartbeat } from "@/api/adminJobs";

function StatusPill({ status }: { status: string }) {
  const s = (status || "").toUpperCase();

  const style: React.CSSProperties = {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 999,
    fontWeight: 900,
    fontSize: 12,
    border: "1px solid #ddd",
    background: "#f7f7f7",
  };

  if (s === "SUCCESS") return <span style={{ ...style, borderColor: "#b7e4c7", background: "#ecfdf3" }}>SUCCESS</span>;
  if (s === "FAILED") return <span style={{ ...style, borderColor: "#ffb3b3", background: "#ffe6e6" }}>FAILED</span>;
  if (s === "RUNNING") return <span style={{ ...style, borderColor: "#ffe0a3", background: "#fff7e6" }}>RUNNING</span>;

  return <span style={style}>{s || "-"}</span>;
}

function fmtMs(ms?: number | null) {
  if (!ms && ms !== 0) return "-";
  if (ms < 1000) return `${ms} ms`;
  const sec = ms / 1000;
  if (sec < 60) return `${sec.toFixed(1)} s`;
  const min = sec / 60;
  return `${min.toFixed(1)} min`;
}

export default function JobMonitorPage() {
  const [items, setItems] = useState<AdminJobHeartbeat[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const data = await listAdminJobs();
      setItems(data);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const sorted = useMemo(() => {
    // failed first, then running, then success; within each sort by name
    const rank = (s: string) => {
      const v = (s || "").toUpperCase();
      if (v === "FAILED") return 0;
      if (v === "RUNNING") return 1;
      if (v === "SUCCESS") return 2;
      return 3;
    };
    return [...items].sort((a, b) => {
      const ra = rank(a.status);
      const rb = rank(b.status);
      if (ra !== rb) return ra - rb;
      return a.jobName.localeCompare(b.jobName);
    });
  }, [items]);

  return (
    <div style={{ maxWidth: 1100, margin: "30px auto", fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Job Monitor</h2>
          <div style={{ marginTop: 6, color: "#666", fontSize: 13 }}>
            Tracks background job health via <code>AdminJobHeartbeat</code>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Link to="/admin/dashboard">← Back to Dashboard</Link>
          <button onClick={load} disabled={loading} style={{ padding: "8px 12px" }}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {err && <div style={{ color: "crimson", marginBottom: 12 }}>{err}</div>}

      <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14, background: "white" }}>
        {!sorted.length ? (
          <div style={{ color: "#666" }}>
            No jobs tracked yet. Once a job posts heartbeat, it will appear here.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "10px 8px", borderBottom: "1px solid #eee" }}>Job</th>
                  <th style={{ textAlign: "left", padding: "10px 8px", borderBottom: "1px solid #eee" }}>Status</th>
                  <th style={{ textAlign: "left", padding: "10px 8px", borderBottom: "1px solid #eee" }}>Last Run</th>
                  <th style={{ textAlign: "left", padding: "10px 8px", borderBottom: "1px solid #eee" }}>Duration</th>
                  <th style={{ textAlign: "left", padding: "10px 8px", borderBottom: "1px solid #eee" }}>Error</th>
                  <th style={{ textAlign: "left", padding: "10px 8px", borderBottom: "1px solid #eee" }}>Meta</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((j) => (
                  <tr key={j.jobName}>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f2f2f2", fontWeight: 900 }}>
                      {j.jobName}
                    </td>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f2f2f2" }}>
                      <StatusPill status={j.status} />
                    </td>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f2f2f2", color: "#333" }}>
                      {j.lastRunAt ? new Date(j.lastRunAt).toLocaleString() : "-"}
                    </td>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f2f2f2" }}>
                      {fmtMs(j.durationMs)}
                    </td>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f2f2f2", color: j.error ? "crimson" : "#999" }}>
                      {j.error || "—"}
                    </td>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f2f2f2" }}>
                      {j.meta ? (
                        <details>
                          <summary style={{ cursor: "pointer" }}>View</summary>
                          <pre style={{ margin: "8px 0 0", fontSize: 12, background: "#f7f7f7", padding: 10, borderRadius: 8 }}>
                            {JSON.stringify(j.meta, null, 2)}
                          </pre>
                        </details>
                      ) : (
                        <span style={{ color: "#999" }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ marginTop: 12, color: "#666", fontSize: 12 }}>
        Tip: “FAILED” jobs should have an <code>error</code> string populated from your heartbeat writer.
      </div>
    </div>
  );
}
