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

function SectionLabel({ children }: { children: string }) {
  return (
    <div
      style={{
        marginTop: 18,
        marginBottom: 6,
        padding: "0 8px",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 0.6,
        color: "#888",
        textTransform: "uppercase",
      }}
    >
      {children}
    </div>
  );
}


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
      <div style={{ marginBottom: 8, fontWeight: 800, color: "#444" }}>
        Admin
      </div>

      {/* Core */}
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

      {/* Management */}
      <SectionLabel>Management</SectionLabel>

      {hasPerm("ADMIN", "SUPPORT") && (
        <NavLink to="/admin/users" style={linkStyle}>
          Users
        </NavLink>
      )}

      {hasPerm("ADMIN", "SUPPORT") && (
        <NavLink to="/admin/tasks" style={linkStyle}>
          Tasks
        </NavLink>
      )}

      {/* Trust & Safety */}
      <SectionLabel>Trust & Safety</SectionLabel>

      {hasPerm("KYC_REVIEW", "ADMIN") && (
        <NavLink to="/admin/kyc" style={linkStyle}>
          KYC Submissions
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

      {/* Operations */}
      {hasPerm("ADMIN") && (
        <>
          <SectionLabel>Operations</SectionLabel>

          <NavLink to="/admin/audit" style={linkStyle}>
            Audit Log
          </NavLink>

          <NavLink to="/admin/health" style={linkStyle}>
            System Health
          </NavLink>

          <NavLink to="/admin/jobs" style={linkStyle}>
            Jobs
          </NavLink>
        </>
      )}

      {/* Finance */}
      {hasPerm("FINANCE", "ADMIN") && (
        <>
          <SectionLabel>Finance</SectionLabel>

          <NavLink to="/admin/finance/dashboard" style={linkStyle}>
            Finance Dashboard
          </NavLink>

          <NavLink to="/admin/finance/cashouts" style={linkStyle}>
            Cashouts
          </NavLink>

          <NavLink to="/admin/finance/ledger" style={linkStyle}>
            Wallet Ledger
          </NavLink>

          <NavLink to="/admin/finance/platform-fees" style={linkStyle}>
            Platform Fees
          </NavLink>

          <NavLink to="/admin/finance/payment-intents" style={linkStyle}>
            Payment Intents
          </NavLink>
        </>
      )}
    </div>
  );
}

