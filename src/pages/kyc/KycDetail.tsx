import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { RefreshCw, ShieldCheck, ShieldX, ExternalLink, User } from "lucide-react";
import {
  getKycSubmissionById,
  approveKyc,
  rejectKyc,
  type KycDetailResponse,
} from "@/api/kyc";
import ImageViewerModal from "@/components/ui/ImageViewerModal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { useConfirm } from "@/lib/confirm";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://quickbee-backend.onrender.com";

function toAbsoluteUrl(u?: string | null) {
  if (!u) return null;
  const s = String(u).trim();
  if (!s) return null;
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("//")) return `https:${s}`;
  if (s.startsWith("/")) return `${API_BASE}${s}`;
  return `${API_BASE}/${s}`;
}

function DocImage({
  label,
  url,
  onView,
}: {
  label: string;
  url?: string | null;
  onView: (title: string, url: string) => void;
}) {
  const abs = toAbsoluteUrl(url);
  const [broken, setBroken] = useState(false);

  if (!abs) {
    return (
      <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-400">
        {label}: not provided
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50">
        <span className="text-sm font-semibold text-gray-700">{label}</span>
        <a href={abs} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium">
          Open <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      {!broken ? (
        <img
          src={abs}
          alt={label}
          onClick={() => onView(label, abs)}
          onError={() => setBroken(true)}
          className="w-full object-cover cursor-pointer hover:opacity-90 transition-opacity max-h-64"
        />
      ) : (
        <div className="p-4">
          <p className="text-sm font-semibold text-gray-500 mb-1">Image failed to load</p>
          <p className="text-xs text-gray-400 break-all">{abs}</p>
        </div>
      )}
      <p className="text-center text-xs text-gray-400 py-1.5 bg-gray-50 border-t border-gray-100">
        Click image to expand
      </p>
    </div>
  );
}

export default function KycDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const confirm = useConfirm();

  const [kyc,     setKyc]     = useState<KycDetailResponse | null>(null);
  const [reason,  setReason]  = useState("Documents verified");
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState<string | null>(null);

  const [viewerOpen,  setViewerOpen]  = useState(false);
  const [viewerTitle, setViewerTitle] = useState("");
  const [viewerUrl,   setViewerUrl]   = useState<string | null>(null);

  function openViewer(title: string, url: string) {
    setViewerTitle(title); setViewerUrl(url); setViewerOpen(true);
  }

  async function load() {
    if (!id) return;
    setLoading(true); setErr(null);
    try {
      const data = await getKycSubmissionById(id);
      setKyc(data);
      if (data?.reason) setReason(data.reason);
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? (e as { message?: string })?.message ?? "Failed to load");
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onApprove() {
    if (!id) return;
    setLoading(true); setErr(null);
    try {
      await approveKyc(id, reason || undefined);
      nav("/admin/kyc");
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? (e as { message?: string })?.message ?? "Approve failed");
    } finally { setLoading(false); }
  }

  async function onReject() {
    if (!id) return;
    const r = (reason || "").trim();
    if (!r) { setErr("Rejection reason is required."); return; }
    const ok = await confirm({
      title: "Reject this KYC submission?",
      message: `Reason: "${r}"`,
      variant: "danger",
      confirmLabel: "Reject",
    });
    if (!ok) return;
    setLoading(true); setErr(null);
    try {
      await rejectKyc(id, r);
      nav("/admin/kyc");
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? (e as { message?: string })?.message ?? "Reject failed");
    } finally { setLoading(false); }
  }

  const statusVariant = kyc?.status === "APPROVED" ? "approved" : kyc?.status === "REJECTED" ? "rejected" : "pending";

  return (
    <div>
      <PageHeader
        title="KYC Review"
        breadcrumbs={[
          { label: "KYC", href: "/admin/kyc" },
          { label: id ?? "…" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {kyc && <Badge variant={statusVariant} className="text-sm px-3 py-1">{kyc.status}</Badge>}
            <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        }
      />

      <ErrorMessage message={err} className="mb-4" />

      {loading && !kyc && (
        <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Loading…</div>
      )}

      {kyc && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: info + review actions */}
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2"><User className="h-4 w-4 text-gray-400" /> Applicant</div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                  <div className="h-11 w-11 rounded-full bg-surface flex items-center justify-center text-white font-bold text-lg shrink-0">
                    {String(kyc.user?.name || "?")[0].toUpperCase()}
                  </div>
                  <div>
                    {kyc.user?.id
                      ? <Link to={`/admin/users/${kyc.user.id}`} className="font-bold text-blue-600 hover:underline text-base">{kyc.user.name || "—"}</Link>
                      : <span className="font-bold text-gray-900 text-base">{kyc.user?.name || "—"}</span>
                    }
                    <p className="text-sm text-gray-500">{kyc.user?.email || "—"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Status</p>
                    <Badge variant={statusVariant}>{kyc.status}</Badge>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Submitted</p>
                    <p className="font-semibold text-gray-800">{new Date(kyc.createdAt).toLocaleString()}</p>
                  </div>
                  {kyc.reviewedAt && (
                    <div className="col-span-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Reviewed at</p>
                      <p className="font-semibold text-gray-800">{new Date(kyc.reviewedAt).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                {kyc.status === "REJECTED" ? "Rejection Reason" : "Review Notes"}
              </CardHeader>
              <CardContent className="space-y-4">
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  placeholder="Reason / notes for this decision…"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30 resize-y"
                />

                {kyc.status === "PENDING" ? (
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="md"
                      onClick={onApprove}
                      disabled={loading}
                      className="flex-1"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      {loading ? "Saving…" : "Approve"}
                    </Button>
                    <Button
                      variant="danger"
                      size="md"
                      onClick={onReject}
                      disabled={loading || !reason.trim()}
                      className="flex-1"
                    >
                      <ShieldX className="h-4 w-4" />
                      {loading ? "Saving…" : "Reject"}
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-500 text-center">
                    Submission already <strong>{kyc.status.toLowerCase()}</strong> — no further action needed.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: documents */}
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>Identity Documents</CardHeader>
              <CardContent className="space-y-4">
                <DocImage label="ID Front" url={kyc.idFrontUrl}  onView={openViewer} />
                <DocImage label="ID Back"  url={kyc.idBackUrl}   onView={openViewer} />
                <DocImage label="Selfie"   url={kyc.selfieUrl}   onView={openViewer} />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <ImageViewerModal
        open={viewerOpen}
        title={viewerTitle}
        url={viewerUrl}
        onClose={() => setViewerOpen(false)}
      />
    </div>
  );
}
