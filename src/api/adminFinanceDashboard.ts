import { api } from "@/api/client";

export type FinanceDashboardSummary = {
  window: { days: number; from: string };
  cashouts: {
    requested: number;
    processing: number;
    paid: number;
    failed: number;
    cancelled: number;
    total: number;
  };
  cashoutsPaidAmountPaise: number;
  walletVolumeAbsPaise: number;
  platformFees: {
    duePaise: number;
    paymentPaise: number;
    adjustmentCreditPaise: number;
    adjustmentDebitPaise: number;
    rows: number;
  };
  paymentIntents: {
    pending: number;
    requiresAction: number;
    succeeded: number;
    failed: number;
    cancelled: number;
    total: number;
    totalAmountPaise: number;
  };
};

export type FinanceDashboardRecent = {
  recent: {
    cashouts: Array<{
      id: string;
      userId: string;
      amountPaise: number;
      methodType: string;
      status: string;
      createdAt: string;
      processedAt?: string | null;
      user?: { id: string; email: string; name: string };
      walletTxnId?: string | null;
    }>;
    ledger: Array<{
      id: string;
      userId: string;
      amountPaise: number;
      type: string;
      status: string;
      createdAt: string;
      user?: { id: string; email: string; name: string };
    }>;
    paymentIntents: Array<{
      id: string;
      userId: string;
      amountPaise: number;
      provider: string;
      status: string;
      createdAt: string;
      postedWalletTxnId?: string | null;
      user?: { id: string; email: string; name: string };
    }>;
  };
};

export async function adminGetFinanceDashboardSummary(params?: { days?: number }) {
  const res = await api.get("/admin/finance/dashboard", { params });
  return res.data as FinanceDashboardSummary;
}

export async function adminGetFinanceDashboardRecent(params?: { limit?: number }) {
  const res = await api.get("/admin/finance/dashboard/recent", { params });
  return res.data as FinanceDashboardRecent;
}
