import { api } from "./client";

export async function fetchSystemConfigs() {
  const res = await api.get("/admin/config");
  // if your backend returns array directly, keep `return res.data;`
  // if it returns { rows }, keep `return res.data.rows;`
  return res.data.rows ?? res.data;
}

export async function updateSystemConfig(
  key: string,
  payload: { value?: any; description?: string; isSecret?: boolean }
) {
  return api.patch(`/admin/config/${key}`, payload);
}
