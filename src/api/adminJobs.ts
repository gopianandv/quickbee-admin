// src/api/adminJobs.ts
import { api } from "@/api/client";

export async function runRatingsWatchlistNow() {
  const res = await api.post("/admin/jobs/ratings-watchlist/run");
  return res.data;
}
