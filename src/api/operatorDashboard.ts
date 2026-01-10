// src/api/operatorDashboard.ts
import { api } from "@/api/client";

export type OperatorMetrics = {
  generatedAt: string;

  kyc: { pending: number; new24h: number };

  tasks: {
    new: number;
    accepted: number;
    inProgress: number;
    pendingConfirm: number;
    new24h: number;
  };

  attention: {
    pendingConfirmStaleCount: number;
    inProgressStaleCount: number;
    stalePendingConfirmList: { id: string; title: string; status: string; updatedAt: string }[];
    staleInProgressList: { id: string; title: string; status: string; updatedAt: string }[];
  };

  escrow: { holdCount: number };

  activity: { newUsers24h: number; newOffers24h: number };
};

export async function getOperatorMetrics() {
  const { data } = await api.get<OperatorMetrics>("/admin/dashboard/operator-metrics");
  return data;
}
