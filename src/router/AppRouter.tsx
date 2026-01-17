import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import RequireAuth from "@/auth/RequireAuth";
import RequirePerm from "@/auth/RequirePerm";

import Login from "@/pages/Login";
import AppLayout from "@/components/Layout/AppLayout";

import DashboardPage from "@/pages/dashboard/Dashboard";
import OperatorDashboardPage from "@/pages/dashboard/OperatorDashboard";

import KycListPage from "@/pages/kyc/KycList";
import KycDetailPage from "@/pages/kyc/KycDetail";

import AdminTasksList from "@/pages/tasks/AdminTasksList";
import AdminTaskDetail from "@/pages/tasks/AdminTaskDetail";

import AdminUsersList from "@/pages/users/AdminUsersList";
import AdminUserProfile from "@/pages/users/AdminUserProfile";

import IssuesListPage from "@/pages/issues/IssuesList";
import IssueDetailPage from "@/pages/issues/IssueDetail";

import RatingsListPage from "@/pages/ratings/RatingsList";
import RatingsDetailPage from "@/pages/ratings/RatingsDetail";

import AdminAuditLog from "@/pages/audit/AdminAuditLog";
import AdminHealthPage from "@/pages/health/AdminHealthPage";
import JobMonitorPage from "@/pages/jobs/JobMonitorPage";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Protected Admin Area */}
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />

          {/* Dashboard (any logged-in admin token) */}
          <Route path="dashboard" element={<DashboardPage />} />

          {/* Operator view (choose policy; using ADMIN for now) */}
          <Route
            path="operator"
            element={
              <RequirePerm anyOf={["ADMIN"]}>
                <OperatorDashboardPage />
              </RequirePerm>
            }
          />

          {/* Users (ADMIN) */}
          <Route
            path="users"
            element={
              <RequirePerm anyOf={["ADMIN"]}>
                <AdminUsersList />
              </RequirePerm>
            }
          />
          <Route
            path="users/:userId"
            element={
              <RequirePerm anyOf={["ADMIN"]}>
                <AdminUserProfile />
              </RequirePerm>
            }
          />

          {/* KYC (KYC_REVIEW or ADMIN) */}
          <Route
            path="kyc"
            element={
              <RequirePerm anyOf={["KYC_REVIEW", "ADMIN"]}>
                <KycListPage />
              </RequirePerm>
            }
          />
          <Route
            path="kyc/:id"
            element={
              <RequirePerm anyOf={["KYC_REVIEW", "ADMIN"]}>
                <KycDetailPage />
              </RequirePerm>
            }
          />

          {/* Tasks (ADMIN for now) */}
          <Route
            path="tasks"
            element={
              <RequirePerm anyOf={["ADMIN"]}>
                <AdminTasksList />
              </RequirePerm>
            }
          />
          <Route
            path="tasks/:id"
            element={
              <RequirePerm anyOf={["ADMIN"]}>
                <AdminTaskDetail />
              </RequirePerm>
            }
          />

          {/* Issues (SUPPORT or ADMIN) */}
          <Route
            path="issues"
            element={
              <RequirePerm anyOf={["SUPPORT", "ADMIN"]}>
                <IssuesListPage />
              </RequirePerm>
            }
          />
          <Route
            path="issues/:id"
            element={
              <RequirePerm anyOf={["SUPPORT", "ADMIN"]}>
                <IssueDetailPage />
              </RequirePerm>
            }
          />

          {/* Ratings (SUPPORT or ADMIN) */}
          <Route
            path="ratings"
            element={
              <RequirePerm anyOf={["SUPPORT", "ADMIN"]}>
                <RatingsListPage />
              </RequirePerm>
            }
          />
          <Route
            path="ratings/:helperId"
            element={
              <RequirePerm anyOf={["SUPPORT", "ADMIN"]}>
                <RatingsDetailPage />
              </RequirePerm>
            }
          />

          {/* Audit + Health + Jobs (ADMIN) */}
          <Route
            path="audit"
            element={
              <RequirePerm anyOf={["ADMIN"]}>
                <AdminAuditLog />
              </RequirePerm>
            }
          />
          <Route
            path="health"
            element={
              <RequirePerm anyOf={["ADMIN"]}>
                <AdminHealthPage />
              </RequirePerm>
            }
          />
          <Route
            path="jobs"
            element={
              <RequirePerm anyOf={["ADMIN"]}>
                <JobMonitorPage />
              </RequirePerm>
            }
          />
        </Route>

        {/* Global defaults */}
        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
