import { api } from "@/api/client";

export type HelperPerformanceItem = {
  id: string;
  name: string;
  email?: string | null;
  profile?: { phoneNumber?: string | null; displayName?: string | null; profilePicture?: string | null } | null;
  tasksTaken: number;
  tasksCompleted: number;
  tasksCancelled: number;
  completionRate: number | null;
  avgRating: number | null;
  reviewCount: number;
};

export type TaskAnalyticsResponse = {
  summary: { total: number; completed: number; cancelled: number; completionRate: number; cancellationRate: number };
  byStatus: { status: string; count: number }[];
  byPaymentMode: { mode: string; count: number }[];
  byCategory: { categoryId: string | null; categoryName: string; count: number }[];
  recentDaily: { day: string; count: number }[];
};

export type FavoriteItem = {
  id: string;
  createdAt: string;
  consumer: { id: string; name: string; email?: string | null; profile?: { phoneNumber?: string | null; displayName?: string | null } | null };
  helper: { id: string; name: string; email?: string | null; profile?: { phoneNumber?: string | null; displayName?: string | null } | null };
};

export async function adminGetHelperPerformance(params: { page?: number; pageSize?: number; search?: string }) {
  const { data } = await api.get<{ items: HelperPerformanceItem[]; total: number; page: number; pageSize: number; hasMore: boolean }>(
    "/admin/analytics/helpers", { params }
  );
  return data;
}

export async function adminGetTaskAnalytics(params: { fromDate?: string; toDate?: string }) {
  const { data } = await api.get<TaskAnalyticsResponse>("/admin/analytics/tasks", { params });
  return data;
}

export async function adminGetFavoriteHelpers(params: { page?: number; pageSize?: number; search?: string }) {
  const { data } = await api.get<{ items: FavoriteItem[]; total: number; page: number; pageSize: number; hasMore: boolean }>(
    "/admin/analytics/favorites", { params }
  );
  return data;
}
