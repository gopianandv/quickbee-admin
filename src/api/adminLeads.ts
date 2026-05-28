import { api } from "@/api/client";

export type AdminLeadType = "consumer-waitlist" | "helper-signup";
export type AdminLeadFollowUpStatus = "NEW" | "CONTACTED" | "INTERESTED" | "NOT_INTERESTED" | "CONVERTED";

export type AdminLead = {
  id: string;
  type: AdminLeadType;
  status: string;
  leadStatus: AdminLeadFollowUpStatus;
  followUpNote?: string | null;
  followedUpAt?: string | null;
  createdAt: string;
  updatedAt: string;
  name?: string | boolean | null;
  area?: string | boolean | null;
  contact?: string | boolean | null;
  phone?: string | boolean | null;
  email?: string | boolean | null;
  skills?: string | boolean | null;
  availability?: string | boolean | null;
  consent: boolean;
  note?: string | null;
  raw?: string;
};

export type AdminLeadsResponse = {
  items: AdminLead[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  stats: {
    all: number;
    consumers: number;
    helpers: number;
  };
};

export async function getAdminLeads(params: {
  type?: AdminLeadType | "ALL";
  search?: string;
  page: number;
  pageSize: number;
}) {
  const { data } = await api.get<AdminLeadsResponse>("/admin/leads", { params });
  return data;
}

export async function updateAdminLead(
  id: string,
  input: { leadStatus: AdminLeadFollowUpStatus; note?: string }
) {
  const { data } = await api.patch(`/admin/leads/${id}`, input);
  return data as { ok: true; leadStatus: AdminLeadFollowUpStatus; followUpNote: string };
}

export async function exportAdminLeadsCsv(params: {
  type?: AdminLeadType | "ALL";
  search?: string;
}) {
  const res = await api.get("/admin/leads/export.csv", {
    params,
    responseType: "blob",
  });
  const disposition = res.headers?.["content-disposition"] ?? "";
  const match = typeof disposition === "string" ? disposition.match(/filename="?([^"]+)"?/i) : null;
  return {
    blob: res.data as Blob,
    filename: match?.[1] || `website-leads-${new Date().toISOString().slice(0, 10)}.csv`,
  };
}
