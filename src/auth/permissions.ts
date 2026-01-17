import { getAdminPermissions } from "./tokenStore";

export function hasPerm(...needed: string[]) {
  const perms = new Set(getAdminPermissions().map(p => String(p).toUpperCase()));
  if (perms.has("ADMIN")) return true;
  return needed.some(n => perms.has(String(n).toUpperCase()));
}
