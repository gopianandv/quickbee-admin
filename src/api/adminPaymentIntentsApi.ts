import { api } from "@/api/client";

export type PaymentProvider = "FAKE" | "STRIPE" | "RAZORPAY";
export type PaymentStatus =
  | "REQUIRES_ACTION"
  | "PENDING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED";

export type PaymentIntentRow = {
  id: string;
  userId: string;
  amountPaise: number;
  currency: string;
  provider: PaymentProvider;
  providerRef?: string | null;
  status: PaymentStatus;
  postedWalletTxnId?: string | null;
  createdAt: string;
  updatedAt: string;

  user?: { id: string; email: string; name: string };
  postedWalletTxn?: {
    id: string;
    amountPaise: number;
    type: string;
    status: string;
    createdAt: string;
  } | null;
};

export async function adminListPaymentIntents(params: {
  page?: number;
  pageSize?: number;
  userId?: string;
  search?: string;
  provider?: string;
  status?: string;
  from?: string;
  to?: string;
  minAmountPaise?: number;
  maxAmountPaise?: number;
}) {
  const res = await api.get("/admin/finance/payment-intents", { params });
  return res.data;
}

export async function adminGetPaymentIntent(paymentIntentId: string) {
  const res = await api.get(`/admin/finance/payment-intents/${paymentIntentId}`);
  return res.data as any;
}

export async function adminExportPaymentIntents(params: {
  status?: string;
  provider?: string;
  search?: string;
  from?: string;
  to?: string;
}) {
  const res = await api.get("/admin/finance/payment-intents/export", {
    params,
    responseType: "blob",
  });
  return res.data as Blob;
}
