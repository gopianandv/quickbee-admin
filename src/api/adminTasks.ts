import { api } from "@/api/client";

export type TaskListItem = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  cost: number;
  paymentMode?: string | null;

  category?: { id: string; name: string } | null;

  postedBy?: { id: string; name: string; email: string } | null;
  assignedTo?: { id: string; name: string; email: string } | null;

  escrow?: {
    id: string;
    status: string;
    amountPaise: number;
  } | null;
};

export type TaskListResponse = {
  items: TaskListItem[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
};

export async function adminListTasks(params: {
  status?: string;
  search?: string;
  categoryId?: string;
  skillId?: string;
  postedById?: string;
  assignedToId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}) {
  const { data } = await api.get<TaskListResponse>("/admin/tasks", { params });
  return data;
}

export async function adminGetTask(taskId: string) {
  const { data } = await api.get(`/admin/tasks/${taskId}`);
  return data;
}

export async function adminUpdateTaskStatus(taskId: string, status: string, note?: string) {
  const { data } = await api.post(`/admin/tasks/${taskId}/status`, { status, note });
  return data;
}

export async function adminCancelTask(taskId: string, reason?: string, refundEscrow: boolean = true) {
  const { data } = await api.post(`/admin/tasks/${taskId}/cancel`, { reason, refundEscrow });
  return data;
}

export async function adminRefundEscrow(taskId: string, memo?: string) {
  const { data } = await api.post(`/admin/tasks/${taskId}/refund-escrow`, { memo });
  return data;
}
