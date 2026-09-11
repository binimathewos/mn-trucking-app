import {
  BarChart3,
  Clock,
  LayoutDashboard,
  Package,
  Settings,
  Users,
  Waypoints,
  type LucideIcon,
} from "lucide-react";
import type { SessionRole } from "@/lib/auth/route-access";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: SessionRole[];
}

export const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["administrator", "driver"],
  },
  {
    label: "Timesheets",
    href: "/timesheets",
    icon: Clock,
    roles: ["administrator"],
  },
  {
    label: "Containers",
    href: "/containers",
    icon: Package,
    roles: ["administrator"],
  },
  {
    label: "Routes",
    href: "/routes",
    icon: Waypoints,
    roles: ["administrator"],
  },
  {
    label: "Drivers",
    href: "/drivers",
    icon: Users,
    roles: ["administrator"],
  },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
    roles: ["administrator"],
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    roles: ["administrator"],
  },
];

export function getNavItemsForRole(role: SessionRole | undefined): NavItem[] {
  const effectiveRole: SessionRole =
    role === "administrator" ? "administrator" : "driver";

  return navItems.filter((item) => item.roles.includes(effectiveRole));
}
