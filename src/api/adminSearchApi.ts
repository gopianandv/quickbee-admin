import { api } from "@/api/client";

export async function adminSearchEverywhere(q: string) {
  const res = await api.get("/admin/search", { params: { q } });
  return res.data as {
    q: string;
    matches: Array<{ type: string; id: string; url: string }>;
    best: { type: string; id: string; url: string } | null;
  };
}
