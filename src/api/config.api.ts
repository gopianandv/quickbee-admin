import { api } from "./client";

export async function fetchSystemConfigs() {
  const res = await api.get("/admin/config");
  return res.data.rows;
}

export async function updateSystemConfig(
  key: string,
  value: any
) {
  return api.patch(`/admin/config/${key}`, { value });
}
