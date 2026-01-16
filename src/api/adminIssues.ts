import { api } from "@/api/client";

export type IssueStatus = "OPEN" | "IN_REVIEW" | "RESOLVED" | "CLOSED";
export type IssueSeverity = "LOW" | "MEDIUM" | "HIGH";
export type IssueOutcome =
  | "NO_ACTION"
  | "WARNING_SENT"
  | "TASK_CANCELLED"
  | "ESCROW_REFUNDED"
  | "USER_SUSPENDED"
  | "USER_BANNED"
  | "OTHER";

export type IssueListItem = {
  id: string;
  status: IssueStatus;
  severity?: IssueSeverity | null;
  category?: string | null;
  note?: string | null;
  createdAt: string;

  task?: { id: string; title: string; status: string } | null;
  reporter?: { id: string; name: string; email: string } | null;
  reportedUser?: { id: string; name: string; email: string } | null;
  assignedTo?: { id: string; name: string; email: string } | null;
};

export type IssueListResponse = {
  items: IssueListItem[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export async function getIssues(params: {
  status?: IssueStatus;
  search?: string;
  assignedTo?: string; // "UNASSIGNED" | userId
  category?: string;   // ✅ NEW
  reason?: string;     // ✅ NEW
  page: number;
  pageSize: number;
}) {
  const { data } = await api.get<IssueListResponse>("/admin/issues", { params });
  return data;
}


export async function getIssueById(id: string) {
  const { data } = await api.get(`/admin/issues/${id}`);
  return data;
}

export async function patchIssue(id: string, body: any) {
  const { data } = await api.patch(`/admin/issues/${id}`, body);
  return data;
}

export async function addIssueComment(id: string, body: string) {
  const { data } = await api.post(`/admin/issues/${id}/comments`, { body });
  return data;
}

export async function resolveIssue(id: string, payload: {
  outcome: IssueOutcome;
  resolutionNote: string;
  alsoCancelTask?: boolean;
  alsoRefundEscrow?: boolean;
  cancelReason?: string;
}) {
  const { data } = await api.post(`/admin/issues/${id}/resolve`, payload);
  return data;
}

export async function closeIssue(id: string, note: string) {
  const { data } = await api.post(`/admin/issues/${id}/close`, { note });
  return data;
}
