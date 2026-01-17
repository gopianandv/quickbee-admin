import { NavLink } from "react-router-dom";

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

      <NavLink to="/admin/operator" style={linkStyle}>
        Ops View
      </NavLink>
      <NavLink to="/admin/users" style={linkStyle}>
        Users
      </NavLink>
      <NavLink to="/admin/kyc" style={linkStyle}>
        KYC Submissions
      </NavLink>

      <NavLink to="/admin/tasks" style={linkStyle}>
        Tasks
      </NavLink>
      <NavLink to="/admin/issues" style={linkStyle}>
        Issues
      </NavLink>
      <NavLink to="/admin/audit" style={linkStyle}>Audit Log</NavLink>
      <NavLink to="/admin/ratings" style={linkStyle}>
        Ratings
      </NavLink>
      <NavLink to="/admin/health" style={linkStyle}>System Health</NavLink>

    </div>
  );
}
