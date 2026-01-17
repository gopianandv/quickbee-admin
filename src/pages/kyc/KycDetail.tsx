import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  getKycSubmissionById,
  approveKyc,
  rejectKyc,
  type KycDetailResponse,
} from "@/api/kyc";
import ImageViewerModal from "@/components/ui/ImageViewerModal";

export default function KycDetail() {
  const { id } = useParams();
  const nav = useNavigate();

  const [kyc, setKyc] = useState<KycDetailResponse | null>(null);
  const [reason, setReason] = useState("Documents verified");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Image viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerTitle, setViewerTitle] = useState("");
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);

  const API_BASE =
    import.meta.env.VITE_API_BASE_URL || "https://quickbee-backend.onrender.com";

  function toAbsoluteUrl(u?: string | null) {
    if (!u) return null;
    const s = String(u).trim();
    if (!s) return null;

    if (s.startsWith("http://") || s.startsWith("https://")) return s;
    if (s.startsWith("//")) return `https:${s}`;
    if (s.startsWith("/")) return `${API_BASE}${s}`;
    return `${API_BASE}/${s}`;
  }

  function openViewer(title: string, url?: string | null) {
    const abs = toAbsoluteUrl(url);
    if (!abs) return;
    setViewerTitle(title);
    setViewerUrl(abs);
    setViewerOpen(true);
  }

  async function load() {
    if (!id) return;
    setLoading(true);
    setErr(null);
    try {
      const data = await getKycSubmissionById(id);
      setKyc(data);
      if (data?.reason) setReason(data.reason);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function onApprove() {
    if (!id) return;
    setLoading(true);
    setErr(null);
    try {
      await approveKyc(id, reason || undefined);
      nav("/admin/kyc");
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Approve failed");
    } finally {
      setLoading(false);
    }
  }

  async function onReject() {
    if (!id) return;

    const r = (reason || "").trim();
    if (!r) {
      setErr("Rejection reason is required.");
      return;
    }

    if (!confirm("Reject this KYC submission?")) return;

    setLoading(true);
    setErr(null);
    try {
      await rejectKyc(id, r);
      nav("/admin/kyc");
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Reject failed");
    } finally {
      setLoading(false);
    }
  }

  function Img({ label, url }: { label: string; url?: string | null }) {
    const abs = toAbsoluteUrl(url);
    const [broken, setBroken] = useState(false);

    if (!abs) return <div>{label}: -</div>;

    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
          <div style={{ fontWeight: 800 }}>{label}</div>
          <a
            href={abs}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: 12, color: "#0a58ca", textDecoration: "underline" }}
          >
            Open
          </a>
        </div>

        {!broken ? (
          <img
            src={abs}
            alt={label}
            onClick={() => openViewer(label, abs)}
            onError={() => setBroken(true)}
            style={{
              width: "100%",
              borderRadius: 10,
              border: "1px solid #eee",
              cursor: "pointer",
              background: "#fff",
            }}
          />
        ) : (
          <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 10, background: "#fff" }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Image failed to load</div>
            <div style={{ fontSize: 12, color: "#555", wordBreak: "break-all" }}>{abs}</div>
          </div>
        )}

        <div style={{ fontSize: 12, color: "#555", marginTop: 6 }}>
          Click image to view in modal
        </div>
      </div>
    );
  }

  if (loading && !kyc) return <div style={{ padding: 20 }}>Loading…</div>;
  if (err && !kyc) return <div style={{ padding: 20, color: "crimson" }}>{err}</div>;
  if (!kyc) return <div style={{ padding: 20 }}>Not found</div>;

  return (
    <div style={{ maxWidth: 980, margin: "30px auto", fontFamily: "system-ui", color: "#111" }}>
      <button onClick={() => nav(-1)} style={{ cursor: "pointer" }}>
        ← Back
      </button>

      <h2 style={{ marginTop: 10 }}>KYC Detail</h2>

      {err ? <div style={{ color: "crimson", marginBottom: 10 }}>{err}</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, background: "#fff" }}>
          <div>
            <b>Status:</b> {kyc.status}
          </div>

          <div style={{ marginTop: 6 }}>
            <b>User:</b>{" "}
            {kyc.user?.id ? (
              <>
                <Link to={`/admin/users/${kyc.user.id}`} style={{ fontWeight: 900 }}>
                  {kyc.user?.name}
                </Link>{" "}
                ({kyc.user?.email})
              </>
            ) : (
              <>
                {kyc.user?.name} ({kyc.user?.email})
              </>
            )}
          </div>

          <div style={{ marginTop: 6 }}>
            <b>Created:</b> {new Date(kyc.createdAt).toLocaleString()}
          </div>

          {kyc.reviewedAt ? (
            <div style={{ marginTop: 6 }}>
              <b>Reviewed:</b> {new Date(kyc.reviewedAt).toLocaleString()}
            </div>
          ) : null}

          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>
              {kyc.status === "REJECTED" ? "Rejection reason" : "Reason / Notes"}
            </div>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              style={{ width: "100%", padding: 10 }}
            />
          </div>

          {kyc.status === "PENDING" ? (
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button onClick={onApprove} disabled={loading} style={{ cursor: "pointer" }}>
                Approve
              </button>
              <button onClick={onReject} disabled={loading} style={{ cursor: "pointer" }}>
                Reject
              </button>
            </div>
          ) : (
            <div style={{ marginTop: 12, color: "#555" }}>
              Already {String(kyc.status).toLowerCase()}.
            </div>
          )}
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, background: "#fff" }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Images</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
            <Img label="ID Front" url={kyc.idFrontUrl} />
            <Img label="ID Back" url={kyc.idBackUrl} />
            <Img label="Selfie" url={kyc.selfieUrl} />
          </div>
        </div>
      </div>

      <ImageViewerModal
        open={viewerOpen}
        title={viewerTitle}
        url={viewerUrl}
        onClose={() => setViewerOpen(false)}
      />
    </div>
  );
}
