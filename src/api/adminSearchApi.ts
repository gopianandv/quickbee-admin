import { api } from "@/api/client";

export type GlobalSearchHit = {
  entityType: "USER" | "TASK" | "CASHOUT" | "WALLET_TXN" | "PAYMENT_INTENT" | "PLATFORM_FEE";
  id: string;
  route: string;
};

export async function adminSearchById(id: string) {
  const res = await api.get("/admin/search/by-id", { params: { id } });
  return res.data as GlobalSearchHit;
}
