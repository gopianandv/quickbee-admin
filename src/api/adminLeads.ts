import { api } from "@/api/client";

export type AdminLeadType = "consumer-waitlist" | "helper-signup";

export type AdminLead = {
  id: string;
  type: AdminLeadType;
  status: string;
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
