import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import RequireAuth from "@/auth/RequireAuth";
import Login from "@/pages/Login";
import AppLayout from "@/components/Layout/AppLayout";
import KycListPage from "@/pages/kyc/KycList";
import KycDetailPage from "@/pages/kyc/KycDetail";

function Dashboard() {
  return <div style={{ fontFamily: "system-ui" }}>Coming soon…</div>;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/admin"
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route path="kyc" element={<KycListPage />} />
          <Route path="kyc/:id" element={<KycDetailPage />} />
          <Route path="dashboard" element={<Dashboard />} />
        </Route>

        <Route path="/" element={<Navigate to="/admin/kyc" replace />} />
        <Route path="*" element={<Navigate to="/admin/kyc" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
