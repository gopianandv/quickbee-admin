const KEY = "qb_admin_jwt";

export function getAdminToken(): string | null {
  return localStorage.getItem(KEY);
}

export function setAdminToken(token: string) {
  localStorage.setItem(KEY, token);
}

export function clearAdminToken() {
  localStorage.removeItem(KEY);
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
