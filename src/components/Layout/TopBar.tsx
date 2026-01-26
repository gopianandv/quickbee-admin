import { useNavigate } from "react-router-dom";
import { clearAdminToken } from "@/auth/tokenStore";
import AdminGlobalSearch from "./AdminGlobalSearch";

export default function TopBar() {
  const nav = useNavigate();

  return (
    <div
      style={{
        height: 76,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        background: "#263238",
        color: "#fff",
        borderBottom: "4px solid #F3AB25",
        fontFamily: "system-ui",
        gap: 16,
      }}
    >
      {/* Left: Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 240 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: "rgba(243,171,37,0.22)",
            border: "1px solid rgba(243,171,37,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 900,
            color: "#F3AB25",
          }}
          title="QuickBee Admin"
        >
          QB
        </div>

        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
          <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 0.2 }}>QuickBee</div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>Admin Portal</div>
        </div>
      </div>

      {/* Middle: Global Search */}
      <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
        <AdminGlobalSearch />
      </div>

      {/* Right: Logout */}
      <div style={{ minWidth: 140, display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={() => {
            clearAdminToken();
            nav("/login");
          }}
          style={{
            border: "none",
            background: "#F3AB25",
            color: "#11181C",
            padding: "10px 14px",
            borderRadius: 12,
            fontWeight: 900,
            cursor: "pointer",
            boxShadow: "0 8px 18px rgba(0,0,0,0.25)",
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}
