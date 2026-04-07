import { api } from "@/api/client";

export type AdminNotificationItem = {
  id: string;
  userId: string;
  title: string;
  message: string;
  type?: string | null;
  taskId?: string | null;
  isRead: boolean;
  createdAt: string;
  user: { id: string; name: string; email?: string | null; profile?: { phoneNumber?: string | null } | null };
};

export async function adminListNotifications(params: {
  page?: number; pageSize?: number; search?: string;
  userId?: string; type?: string; isRead?: boolean;
}) {
  const { data } = await api.get<{ items: AdminNotificationItem[]; total: number; page: number; pageSize: number; hasMore: boolean }>(
    "/admin/notifications", { params }
  );
  return data;
}

export async function adminSendNotification(payload: { userId: string; title: string; message: string; type?: string }) {
  const { data } = await api.post<{ ok: boolean }>("/admin/notifications/send", payload);
  return data;
}

export async function adminGetNotificationStats() {
  const { data } = await api.get<{ total: number; unread: number; last24h: number }>("/admin/notifications/stats");
  return data;
}
