import { useNavigate } from "react-router-dom";
import { clearAdminToken } from "@/auth/tokenStore";

export default function TopBar() {
  const nav = useNavigate();

  return (
    <div
      style={{
        height: 72,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        background: "#263238",
        color: "#fff",
        borderBottom: "4px solid #F3AB25",
        fontFamily: "system-ui",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Optional logo - if you have one in public/ or src/assets */}
        {/* <img src="/bee-logo.png" style={{ width: 44, height: 44 }} /> */}
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
          <div style={{ fontSize: 22, fontWeight: 800 }}>QuickBee</div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>Admin Portal</div>
        </div>
      </div>

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
          borderRadius: 10,
          fontWeight: 800,
        }}
      >
        Logout
      </button>
    </div>
  );
}
