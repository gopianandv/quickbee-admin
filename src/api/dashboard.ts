import { api } from '@/api/client';

export type DashboardMetrics = {
  users: { total: number; helpers: number; consumers: number; new7d: number };
  kyc: { pending: number; approved: number; rejected: number; new7d: number };
  tasks: {
    total: number;
    open: number;
    inProgress: number;
    completed: number;
    cancelled: number;
    new7d: number;
  };
  money: {
    walletCreditsPaise: number;
    walletDebitsPaise: number;
    platformFeeDuePaise: number;
    platformFeePaidPaise: number;
    platformFeeOutstandingPaise: number;
  };
  generatedAt: string;
};

export async function getDashboardMetrics() {
  const { data } = await api.get<DashboardMetrics>('/admin/dashboard/metrics');
  return data;
}
