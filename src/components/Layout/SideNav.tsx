import { NavLink } from "react-router-dom";
import { hasPerm } from "@/auth/permissions";

const linkStyle = ({ isActive }: { isActive: boolean }) => ({
  display: "block",
  padding: "10px 12px",
  borderRadius: 8,
  textDecoration: "none",
  color: isActive ? "#111" : "#444",
  background: isActive ? "#f2f2f2" : "transparent",
  fontWeight: isActive ? 700 : 500,
});

export default function SideNav() {
  return (
    <div
      style={{
        width: 240,
        padding: 12,
        borderRight: "1px solid #e5e5e5",
        background: "#fff",
        fontFamily: "system-ui",
      }}
    >
      <div style={{ marginBottom: 12, fontWeight: 700, color: "#666" }}>Admin</div>

      <NavLink to="/admin/dashboard" style={linkStyle}>
        Dashboard
      </NavLink>

      {hasPerm("ADMIN") && (
        <NavLink to="/admin/operator" style={linkStyle}>
          Ops View
        </NavLink>
      )}

      {hasPerm("ADMIN") && (
        <NavLink to="/admin/settings?tab=system" style={linkStyle}>
          Settings
        </NavLink>
      )}

      {/* ✅ SUPPORT can view users */}
      {hasPerm("ADMIN", "SUPPORT") && (
        <NavLink to="/admin/users" style={linkStyle}>
          Users
        </NavLink>
      )}

      {hasPerm("KYC_REVIEW", "ADMIN") && (
        <NavLink to="/admin/kyc" style={linkStyle}>
          KYC Submissions
        </NavLink>
      )}

      {/* ✅ SUPPORT can view tasks */}
      {hasPerm("ADMIN", "SUPPORT") && (
        <NavLink to="/admin/tasks" style={linkStyle}>
          Tasks
        </NavLink>
      )}

      {hasPerm("SUPPORT", "ADMIN") && (
        <NavLink to="/admin/issues" style={linkStyle}>
          Issues
        </NavLink>
      )}

      {hasPerm("SUPPORT", "ADMIN") && (
        <NavLink to="/admin/ratings" style={linkStyle}>
          Ratings
        </NavLink>
      )}

      {hasPerm("ADMIN") && (
        <NavLink to="/admin/audit" style={linkStyle}>
          Audit Log
        </NavLink>
      )}

      {hasPerm("ADMIN") && (
        <NavLink to="/admin/health" style={linkStyle}>
          System Health
        </NavLink>
      )}

      {hasPerm("ADMIN") && (
        <NavLink to="/admin/jobs" style={linkStyle}>
          Jobs
        </NavLink>
      )}

      {hasPerm("FINANCE", "ADMIN") && (
        <NavLink to="/admin/finance/dashboard" style={linkStyle}>
          Finance Dashboard
        </NavLink>
      )}

      {hasPerm("FINANCE", "ADMIN") && (
        <NavLink to="/admin/finance/cashouts" style={linkStyle}>
          Cashout
        </NavLink>
      )}

      {hasPerm("FINANCE", "ADMIN") && (
        <NavLink to="/admin/finance/ledger" style={linkStyle}>
          Wallet Ledger
        </NavLink>
      )}

      {hasPerm("FINANCE", "ADMIN") && (
        <NavLink to="/admin/finance/platform-fees" style={linkStyle}>
          Platform Fees
        </NavLink>
      )}

      {hasPerm("FINANCE", "ADMIN") && (
        <NavLink to="/admin/finance/payment-intents" style={linkStyle}>
          Payment Intents
        </NavLink>
      )}



    </div>
  );
}
