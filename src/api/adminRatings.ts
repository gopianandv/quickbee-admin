import { api } from "@/api/client";

export type AdminHelperRatingRow = {
  helperId: string;
  name: string;
  email: string;
  avgRating: number | null;
  reviewCount: number;
  lastReviewAt: string | null;
};

export type RatingRiskIssuePayload = {
  // align to your Issue enums
  severity?: "LOW" | "MEDIUM" | "HIGH";
  reason?: "LOW_RATING_WATCHLIST" | "MISBEHAVIOUR" | "OTHER";
  note?: string;
};

export async function getHelperRatings(params: {
  page?: number;
  pageSize?: number;
  search?: string;
}) {
  const res = await api.get("/admin/ratings/helpers", { params });
  return res.data as {
    items: AdminHelperRatingRow[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export async function getHelperReviews(
  helperId: string,
  params: { page?: number; pageSize?: number }
) {
  const res = await api.get(`/admin/ratings/helpers/${helperId}/reviews`, { params });
  return res.data as {
    items: any[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    avgRating: number | null;
  };
}

/**
 * Create (or reuse) a safety issue for a helper based on ratings.
 * Backend should accept an optional body. If it doesn't yet, it will just ignore it (safe).
 */
export async function createRatingRiskIssue(
  helperId: string,
  payload?: RatingRiskIssuePayload
) {
  const res = await api.post(`/admin/ratings/helpers/${helperId}/risk-issue`, payload ?? {});
  return res.data as { ok: boolean; created: boolean; issueId: string; message?: string };
}
