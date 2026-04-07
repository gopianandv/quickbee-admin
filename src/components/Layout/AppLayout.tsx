import { Outlet } from "react-router-dom";
import TopBar from "./TopBar";
import SideNav from "./SideNav";

export default function AppLayout() {
  return (
    // Sidebar + content side-by-side, full height
    <div className="flex h-screen overflow-hidden">
      <SideNav />

      {/* Content column: topbar then scrollable page area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto bg-[#f5f5f5] p-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
