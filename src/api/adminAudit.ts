import { api } from "@/api/client";

export type AuditLogRow = {
  id: string;
  createdAt: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  message?: string | null;
  meta?: any;
  actorUserId?: string | null;
  actor?: { id: string; name: string; email: string } | null;
};

export type AuditListResponse = {
  items: AuditLogRow[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
};

export async function adminListAuditLogs(params: {
  actorUserId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}) {
  const { data } = await api.get<AuditListResponse>("/admin/audit", { params });
  return data;
}
