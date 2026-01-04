import { Outlet } from "react-router-dom";
import TopBar from "./TopBar";
import SideNav from "./SideNav";

export default function AppLayout() {
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <TopBar />
      <div style={{ flex: 1, display: "flex", background: "#fafafa" }}>
        <SideNav />
        <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
