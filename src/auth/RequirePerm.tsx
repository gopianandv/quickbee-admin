import React from "react";
import { Navigate } from "react-router-dom";
import { hasPerm } from "./permissions";

export default function RequirePerm({
  children,
  anyOf,
}: {
  children: React.ReactNode;
  anyOf: string[];
}) {
  if (!hasPerm(...anyOf)) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <>{children}</>;
}
