import { api } from "@/api/client";

export type KycStatus = "PENDING" | "APPROVED" | "REJECTED" | "NOT_STARTED";

export type KycListItem = {
  id: string;
  status: KycStatus;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    profile?: { phoneNumber?: string | null } | null;
  };
};

export type KycListResponse = {
  items: KycListItem[];
  total: number;
  hasMore: boolean;
};

export type KycDetailResponse = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reason?: string | null;
  idFrontUrl?: string | null;
  idBackUrl?: string | null;
  selfieUrl?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  user?: { id: string; name: string; email: string; profile?: any };
};

export async function getKycSubmissions(params: {
  status: "PENDING" | "APPROVED" | "REJECTED";
  search?: string;
  page: number;
  pageSize: number;
}) {
  const { data } = await api.get<KycListResponse>("/admin/kyc/submissions", { params });
  return data;
}

export async function getKycSubmissionById(id: string) {
  const { data } = await api.get<KycDetailResponse>(`/admin/kyc/submissions/${id}`);
  return data;
}

export async function approveKyc(id: string, reason?: string) {
  const { data } = await api.post(`/admin/kyc/submissions/${id}/approve`, {
    reason: reason || undefined,
  });
  return data;
}

export async function rejectKyc(id: string, reason: string) {
  const { data } = await api.post(`/admin/kyc/submissions/${id}/reject`, { reason });
  return data;
}
