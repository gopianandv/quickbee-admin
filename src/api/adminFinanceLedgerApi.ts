import { api } from "@/api/client";

export type LedgerTxnRow = {
  id: string;
  userId: string;
  amountPaise: number;
  type: string;
  status: string;
  note?: string | null;
  createdAt: string;
  updatedAt?: string;

  user?: { id: string; email: string; name: string };
  task?: { id: string; title: string | null } | null;
  escrow?: { id: string; status: string } | null;

  links?: {
    cashoutId?: string | null;
    paymentIntentId?: string | null;
  };
};

export async function adminListLedger(params: {
  page?: number;
  pageSize?: number;
  userId?: string;
  search?: string;
  type?: string;
  status?: string;
  from?: string;
  to?: string;
  minAmountPaise?: number;
  maxAmountPaise?: number;
  walletTxnId?: string;
}) {

  const res = await api.get("/admin/finance/ledger", { params });
  return res.data as {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    data: LedgerTxnRow[];
  };
}

export async function adminGetLedgerTxn(walletTxnId: string) {
  const res = await api.get(`/admin/finance/ledger/${walletTxnId}`);
  return res.data as any;
}

export async function adminExportLedger(params: {
  status?: string;
  type?: string;
  search?: string;
  from?: string;
  to?: string;

  // ✅ NEW
  walletTxnId?: string;
}) {

  const res = await api.get("/admin/finance/ledger/export", {
    params,
    responseType: "blob",
  });
  return res.data as Blob;
}
