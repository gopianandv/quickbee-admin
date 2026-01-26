import { api } from "@/api/client";

export type CashoutStatus = "REQUESTED" | "PROCESSING" | "PAID" | "FAILED" | "CANCELLED";
export type PayoutMethodType = "UPI" | "BANK";

export type CashoutRow = {
  id: string;
  userId: string;
  amountPaise: number;
  methodType: PayoutMethodType;
  upiId?: string | null;
  bankHolderName?: string | null;
  bankIfsc?: string | null;
  bankAccountLast4?: string | null;
  status: CashoutStatus;
  failureReason?: string | null;
  createdAt: string;
  processedAt?: string | null;
  walletTxnId?: string | null;
  user?: { id: string; email: string; name: string };
  walletTxn?: any;
};

export async function adminListCashouts(params: {
  page?: number;
  pageSize?: number;
  status?: string;
  methodType?: string;
  search?: string;
}) {
  const res = await api.get("/admin/finance/cashouts", { params });
  return res.data;
}

export async function adminGetCashout(cashoutId: string) {
  const res = await api.get(`/admin/finance/cashouts/${cashoutId}`);
  return res.data as CashoutRow;
}

export async function adminMarkCashoutProcessing(cashoutId: string, note?: string) {
  const res = await api.post(`/admin/finance/cashouts/${cashoutId}/mark-processing`, { note });
  return res.data;
}

export async function adminMarkCashoutPaid(cashoutId: string, note?: string) {
  const res = await api.post(`/admin/finance/cashouts/${cashoutId}/mark-paid`, { note });
  return res.data;
}

export async function adminMarkCashoutFailed(cashoutId: string, failureReason?: string) {
  const res = await api.post(`/admin/finance/cashouts/${cashoutId}/mark-failed`, { failureReason });
  return res.data;
}

export async function adminCancelCashout(cashoutId: string, note?: string) {
  const res = await api.post(`/admin/finance/cashouts/${cashoutId}/cancel`, { note });
  return res.data;
}

export async function adminExportCashouts(params: {
  status?: string;
  methodType?: string;
  search?: string;
}) {
  const res = await api.get("/admin/finance/cashouts/export", {
    params,
    responseType: "blob",
  });
  return res.data as Blob;
}
