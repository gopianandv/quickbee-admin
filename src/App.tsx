import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import RequireAuth from '@/auth/RequireAuth';
import Login from '@/pages/Login';
import KycList from '@/pages/KycList';
import KycDetail from '@/pages/KycDetail';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/kyc"
          element={
            <RequireAuth>
              <KycList />
            </RequireAuth>
          }
        />
        <Route
          path="/kyc/:id"
          element={
            <RequireAuth>
              <KycDetail />
            </RequireAuth>
          }
        />

        <Route path="/" element={<Navigate to="/kyc" replace />} />
        <Route path="*" element={<Navigate to="/kyc" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
