// src/api/adminJobs.ts
import { api } from "@/api/client";

export async function runRatingsWatchlistNow() {
  const res = await api.post("/admin/jobs/ratings-watchlist/run");
  return res.data;
}

export type AdminJobHeartbeat = {
  id?: string;
  jobName: string;
  status: "SUCCESS" | "FAILED" | "RUNNING" | string;
  lastRunAt: string; // ISO string from backend
  durationMs?: number | null;
  error?: string | null;
  meta?: any | null;
  createdAt?: string;
  updatedAt?: string;
};

export async function listAdminJobs(): Promise<AdminJobHeartbeat[]> {
  const res = await api.get("/admin/jobs");
  return res.data?.items ?? [];
}

export async function runTaskConfirmReminderNow() {
  const res = await api.post("/admin/jobs/task-confirm-reminder/run");
  return res.data;
}

export async function runReviewReminderPosterNow() {
  const res = await api.post("/admin/jobs/review-reminder/run");
  return res.data;
}
