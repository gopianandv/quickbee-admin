import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getAdminToken } from './tokenStore';

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const token = getAdminToken();

  if (!token) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return <>{children}</>;
}
