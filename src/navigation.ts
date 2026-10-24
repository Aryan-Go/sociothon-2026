import {
  ChartNoAxesCombined,
  History,
  Inbox,
  LayoutDashboard,
  Leaf,
  PackageOpen,
  ScanLine,
  Settings,
  ShieldCheck,
  Trophy,
  Truck,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "./types";

export interface NavItem {
  label: string;
  shortLabel?: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
}

export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  user: [
    { label: "Dashboard", to: "/app/user", icon: LayoutDashboard, end: true },
    { label: "Scan a bottle", shortLabel: "Scan", to: "/app/scan", icon: ScanLine },
    { label: "Leaderboard", shortLabel: "Ranks", to: "/app/leaderboard", icon: Trophy },
    { label: "My impact", shortLabel: "Impact", to: "/app/activity", icon: History },
    { label: "Settings", to: "/app/settings", icon: Settings },
  ],
  admin: [
    { label: "Overview", to: "/app/admin", icon: LayoutDashboard, end: true },
    { label: "Submissions", shortLabel: "Bottles", to: "/app/admin/submissions", icon: Inbox },
    { label: "Collectors", shortLabel: "Partners", to: "/app/admin/collectors", icon: Truck },
    { label: "Members", shortLabel: "Members", to: "/app/admin/users", icon: UsersRound },
    {
      label: "Analytics",
      to: "/app/admin/analytics",
      icon: ChartNoAxesCombined,
    },
    { label: "Settings", to: "/app/settings", icon: Settings },
  ],
  collector: [
    { label: "Overview", to: "/app/collector", icon: LayoutDashboard, end: true },
    { label: "Intake queue", shortLabel: "Intake", to: "/app/collector/intake", icon: Inbox },
    { label: "Products", to: "/app/collector/products", icon: PackageOpen },
    { label: "Impact report", shortLabel: "Impact", to: "/app/collector/impact", icon: Leaf },
    { label: "Settings", to: "/app/settings", icon: Settings },
  ],
};

export const ROLE_META: Record<
  Role,
  {
    label: string;
    descriptor: string;
    dashboard: string;
    icon: LucideIcon;
    person: string;
  }
> = {
  user: {
    label: "Member",
    descriptor: "Personal impact",
    dashboard: "/app/user",
    icon: UserRound,
    person: "Aarav Mehta",
  },
  admin: {
    label: "Network admin",
    descriptor: "Operations control",
    dashboard: "/app/admin",
    icon: ShieldCheck,
    person: "Riya Kapoor",
  },
  collector: {
    label: "Collector",
    descriptor: "Partner workspace",
    dashboard: "/app/collector",
    icon: Truck,
    person: "GreenLoop Recovery",
  },
};

export function getPageLabel(pathname: string): string {
  const entries = Object.values(NAV_BY_ROLE)
    .flat()
    .sort((a, b) => b.to.length - a.to.length);
  const match = entries.find(
    (item) => pathname === item.to || pathname.startsWith(`${item.to}/`),
  );
  if (pathname.startsWith("/app/scan")) return "Scan a bottle";
  return match?.label ?? "Workspace";
}

export function getWorkspaceLabel(role: Role): string {
  return ROLE_META[role].descriptor;
}
