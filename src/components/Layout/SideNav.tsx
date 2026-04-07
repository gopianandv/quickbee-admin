import { useState } from "react";
import type { ElementType, ReactNode } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  MonitorPlay,
  Users,
  ClipboardList,
  ShieldCheck,
  AlertCircle,
  Star,
  MessageSquare,
  BarChart2,
  TrendingUp,
  Heart,
  DollarSign,
  Wallet,
  Receipt,
  CreditCard,
  Bell,
  ScrollText,
  Activity,
  Cpu,
  Settings,
  ChevronDown,
} from "lucide-react";
import { hasPerm } from "@/auth/permissions";
import { cn } from "@/lib/utils";

/* ── Persist section open/close state ─────────────────────────── */
function useSectionOpen(key: string, defaultOpen = true) {
  const storageKey = `qb-nav-${key}`;
  const [open, setOpen] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem(storageKey);
      return v !== null ? (JSON.parse(v) as boolean) : defaultOpen;
    } catch {
      return defaultOpen;
    }
  });

  const toggle = () =>
    setOpen((prev) => {
      const next = !prev;
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* */ }
      return next;
    });

  return [open, toggle] as const;
}

/* ── Individual nav link ───────────────────────────────────────── */
function NavItem({
  to,
  icon: Icon,
  children,
}: {
  to: string;
  icon: ElementType;
  children: ReactNode;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-100",
          isActive
            ? "bg-brand/15 text-brand"
            : "text-slate-400 hover:text-white hover:bg-white/[0.06]"
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{children}</span>
    </NavLink>
  );
}

/* ── Collapsible section wrapper ───────────────────────────────── */
function NavSection({
  sectionKey,
  label,
  children,
  defaultOpen = true,
}: {
  sectionKey: string;
  label: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, toggle] = useSectionOpen(sectionKey, defaultOpen);

  return (
    <div className="mt-1">
      <button
        onClick={toggle}
        className="flex w-full items-center justify-between px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500 hover:text-slate-400 transition-colors border-none bg-transparent rounded-none"
      >
        {label}
        <ChevronDown
          className={cn(
            "h-3 w-3 transition-transform duration-200",
            open ? "rotate-0" : "-rotate-90"
          )}
        />
      </button>

      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          open ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="flex flex-col gap-0.5 pb-1">{children}</div>
      </div>
    </div>
  );
}

/* ── Divider ───────────────────────────────────────────────────── */
function Divider() {
  return <div className="mx-3 my-2 border-t border-white/[0.07]" />;
}

/* ── Main SideNav ──────────────────────────────────────────────── */
export default function SideNav() {
  const showManagement  = hasPerm("ADMIN", "SUPPORT");
  const showKyc         = hasPerm("KYC_REVIEW", "ADMIN");
  const showTrust       = hasPerm("SUPPORT", "ADMIN");
  const showAnalytics   = hasPerm("ADMIN");
  const showFinance     = hasPerm("FINANCE", "ADMIN");
  const showSystem      = hasPerm("ADMIN");
  const showNotif       = hasPerm("ADMIN", "SUPPORT");

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col bg-surface overflow-y-auto">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-white/[0.07]">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-surface-dark font-black text-sm shrink-0">
          Q
        </div>
        <div className="leading-tight">
          <div className="text-white font-bold text-sm">QuickBee</div>
          <div className="text-slate-500 text-[11px]">Admin Portal</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5">

        {/* Top-level links */}
        <NavItem to="/admin/dashboard" icon={LayoutDashboard}>Dashboard</NavItem>

        {hasPerm("ADMIN") && (
          <NavItem to="/admin/operator" icon={MonitorPlay}>Operator View</NavItem>
        )}

        <Divider />

        {/* Management */}
        {showManagement && (
          <NavSection sectionKey="management" label="Management">
            <NavItem to="/admin/users" icon={Users}>Users</NavItem>
            <NavItem to="/admin/tasks" icon={ClipboardList}>Tasks</NavItem>
          </NavSection>
        )}

        {/* Trust & Safety */}
        {(showKyc || showTrust) && (
          <NavSection sectionKey="trust" label="Trust & Safety">
            {showKyc && (
              <NavItem to="/admin/kyc" icon={ShieldCheck}>KYC Submissions</NavItem>
            )}
            {showTrust && (
              <>
                <NavItem to="/admin/issues" icon={AlertCircle}>Issues</NavItem>
                <NavItem to="/admin/ratings" icon={Star}>Ratings</NavItem>
                <NavItem to="/admin/chat" icon={MessageSquare}>Chat Moderation</NavItem>
              </>
            )}
          </NavSection>
        )}

        {/* Analytics */}
        {showAnalytics && (
          <NavSection sectionKey="analytics" label="Analytics">
            <NavItem to="/admin/analytics/helpers" icon={BarChart2}>Helper Performance</NavItem>
            <NavItem to="/admin/analytics/tasks"   icon={TrendingUp}>Task Analytics</NavItem>
            <NavItem to="/admin/analytics/favorites" icon={Heart}>Favourites</NavItem>
          </NavSection>
        )}

        {/* Finance */}
        {showFinance && (
          <NavSection sectionKey="finance" label="Finance">
            <NavItem to="/admin/finance/dashboard"        icon={DollarSign}>Dashboard</NavItem>
            <NavItem to="/admin/finance/cashouts"         icon={Wallet}>Cashouts</NavItem>
            <NavItem to="/admin/finance/ledger"           icon={Receipt}>Wallet Ledger</NavItem>
            <NavItem to="/admin/finance/platform-fees"    icon={CreditCard}>Platform Fees</NavItem>
            <NavItem to="/admin/finance/payment-intents"  icon={CreditCard}>Payment Intents</NavItem>
          </NavSection>
        )}

        {/* System */}
        {(showSystem || showNotif) && (
          <NavSection sectionKey="system" label="System">
            {showNotif && (
              <NavItem to="/admin/notifications" icon={Bell}>Notifications</NavItem>
            )}
            {showSystem && (
              <>
                <NavItem to="/admin/audit"   icon={ScrollText}>Audit Log</NavItem>
                <NavItem to="/admin/health"  icon={Activity}>System Health</NavItem>
                <NavItem to="/admin/jobs"    icon={Cpu}>Jobs</NavItem>
                <NavItem to="/admin/settings" icon={Settings}>Settings</NavItem>
              </>
            )}
          </NavSection>
        )}
      </nav>
    </aside>
  );
}
