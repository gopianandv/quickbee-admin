import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import RequireAuth from "@/auth/RequireAuth";
import Login from "@/pages/Login";
import AppLayout from "@/components/Layout/AppLayout";
import KycListPage from "@/pages/kyc/KycList";
import KycDetailPage from "@/pages/kyc/KycDetail";
import DashboardPage from "@/pages/dashboard/Dashboard";
import AdminTasksList from "@/pages/tasks/AdminTasksList";
import AdminTaskDetail from "@/pages/tasks/AdminTaskDetail";
import OperatorDashboardPage from "@/pages/dashboard/OperatorDashboard";
import AdminUserProfile from "@/pages/users/AdminUserProfile";
import AdminAuditLog from "@/pages/audit/AdminAuditLog";
import AdminHealthPage from "@/pages/health/AdminHealthPage";
import IssuesListPage from "@/pages/issues/IssuesList";
import IssueDetailPage from "@/pages/issues/IssueDetail";

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
          {/* Default inside /admin */}
          <Route index element={<Navigate to="dashboard" replace />} />

          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="operator" element={<OperatorDashboardPage />} />
          <Route path="kyc" element={<KycListPage />} />
          <Route path="kyc/:id" element={<KycDetailPage />} />
          <Route path="tasks" element={<AdminTasksList />} />
          <Route path="tasks/:id" element={<AdminTaskDetail />} />
          <Route path="users/:userId" element={<AdminUserProfile />} />
          <Route path="audit" element={<AdminAuditLog />} />
          <Route path="health" element={<AdminHealthPage />} />
          <Route path="issues" element={<IssuesListPage />} />
          <Route path="issues/:id" element={<IssueDetailPage />} />
        </Route>

        {/* Global defaults */}
        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
