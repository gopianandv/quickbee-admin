// src/api/adminHealth.ts
import { api } from "@/api/client";

export type AdminHealthResponse = {
  ok: boolean;
  service: string;
  time: string;
  checks: {
    db: { ok: boolean; ms: number; error: string | null };
    s3: { configured: boolean; ok: boolean | null; error: string | null; signedUrlSample: string | null };
  };
  build: {
    nodeEnv: string;
    version: string | null;
    gitSha: string | null;
    renderService: string | null;
  };
};

export async function getAdminHealth() {
  const { data } = await api.get<AdminHealthResponse>("/admin/health");
  return data;
}
