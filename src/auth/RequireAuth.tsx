import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getAdminToken, getAdminPermissions, setAdminPermissions, getAdminTokenPayload } from "./tokenStore";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const token = getAdminToken();

  if (!token) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;

  // ✅ hydrate perms from JWT if missing
  const perms = getAdminPermissions();
  if (!perms.length) {
    const payload = getAdminTokenPayload();
    const p = payload?.permissions;
    if (Array.isArray(p)) setAdminPermissions(p);
  }

  return <>{children}</>;
}

