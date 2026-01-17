const KEY = "qb_admin_jwt";
const PERMS_KEY = "qb_admin_perms";

export function getAdminToken(): string | null {
  return localStorage.getItem(KEY);
}

export function setAdminToken(token: string) {
  localStorage.setItem(KEY, token);
}

export function clearAdminToken() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(PERMS_KEY);
}

// ✅ ADD THIS
export function getAdminTokenPayload(): any | null {
  const token = getAdminToken();
  if (!token) return null;

  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;

    const payloadBase64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payloadBase64.padEnd(payloadBase64.length + (4 - (payloadBase64.length % 4)) % 4, "=");
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function setAdminPermissions(perms: string[]) {
  localStorage.setItem(PERMS_KEY, JSON.stringify(perms || []));
}

export function getAdminPermissions(): string[] {
  try {
    return JSON.parse(localStorage.getItem(PERMS_KEY) || "[]");
  } catch {
    return [];
  }
}
