import { api } from "@/api/client";

export type PlatformFeeKind =
  | "DUE"
  | "PAYMENT"
  | "ADJUSTMENT_CREDIT"
  | "ADJUSTMENT_DEBIT";

export type PaymentMode = "APP" | "CASH";

export type PlatformFeeRow = {
  id: string;
  userId: string;
  taskId?: string | null;
  amountPaise: number;
  currency: string;
  via?: PaymentMode | null;
  kind: PlatformFeeKind;
  note?: string | null;
  createdAt: string;
  user?: { id: string; email: string; name: string };
  task?: { id: string; title: string };
};

export async function adminListPlatformFees(params: {
  page?: number;
  pageSize?: number;
  userId?: string;
  search?: string;
  kind?: string;
  via?: string;
  taskId?: string;
  from?: string;
  to?: string;
  minAmountPaise?: number;
  maxAmountPaise?: number;
}) {
  const res = await api.get("/admin/finance/platform-fees", { params });
  return res.data;
}

export async function adminGetPlatformFee(feeId: string) {
  const res = await api.get(`/admin/finance/platform-fees/${feeId}`);
  return res.data as PlatformFeeRow & {
    computed?: { direction: "DEBIT" | "CREDIT"; absAmountPaise: number };
  };
}

export type PlatformFeeBalanceItem = {
  userId: string;
  email: string;
  name?: string | null;
  isDisabled?: boolean;
  totalDuePaise: number;
  totalPaidPaise: number;
  outstandingPaise: number;
  lastActivityAt?: string | null;
};

export type PlatformFeeBalancesResponse = {
  data: PlatformFeeBalanceItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  degraded?: boolean;
  degradedReason?: string;
};

export async function adminListPlatformFeeBalances(params: {
  page?: number;
  pageSize?: number;
  q?: string;
  minOutstandingPaise?: number;
}) {
  const res = await api.get("/admin/finance/platform-fees/balances", { params });
  return res.data as PlatformFeeBalancesResponse;
}

