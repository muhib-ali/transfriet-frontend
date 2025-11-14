// src/components/sidebar.tsx
"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  BarChart2, FileText, Receipt, Users, Package, CreditCard, TrendingUp,
  Settings as SettingsIcon, Tag, BadgePercent, Coins, Boxes, Box, ShieldCheck, Shield,
} from "lucide-react";

import PermissionGate from "@/components/permission-gate";
import { ADMIN_LINK_PERM } from "@/rbac/link-permissions";

const ICONS = {
  BarChart2, FileText, Receipt, Users, Package, CreditCard, TrendingUp,
  Settings: SettingsIcon, Tag, BadgePercent, Coins, Boxes, Box, ShieldCheck, Shield,
} as const;

type IconName = keyof typeof ICONS;

export const nav = [
  { href: "/dashboard/dashboard",  label: "Dashboard",  icon: "BarChart2" as IconName },
  { href: "/dashboard/invoices",   label: "Invoices",   icon: "FileText"  as IconName },
  { href: "/dashboard/quotations", label: "Quotations", icon: "Receipt"   as IconName },
  { href: "/dashboard/clients",  label: "Clients",  icon: "Users"     as IconName },
  { href: "/dashboard/products",   label: "Products",   icon: "Package"   as IconName },
  // { href: "/dashboard/payments",   label: "Payments",   icon: "CreditCard"as IconName },
  // { href: "/dashboard/reports",    label: "Reports",    icon: "TrendingUp"as IconName },
  // { href: "/dashboard/settings",   label: "Settings",   icon: "Settings"  as IconName },
];

export const nav_admin = [
  { href: "/dashboard/jobFiles",  label: "Job files",  icon: "Tag"           as IconName },
  { href: "/dashboard/tax",         label: "Tax",         icon: "BadgePercent"  as IconName },
  { href: "/dashboard/modules",     label: "Modules",     icon: "Boxes"         as IconName },
  { href: "/dashboard/permissions", label: "Permissions", icon: "ShieldCheck"   as IconName },
  { href: "/dashboard/roles",       label: "Roles",       icon: "Shield"        as IconName },
  { href: "/dashboard/users",       label: "Users",       icon: "Users"         as IconName },
];

function IconByName({ name, className }: { name: IconName; className?: string }) {
  if (name === "BadgePercent" && !ICONS.BadgePercent) {
    const Fallback = ICONS.Coins ?? ICONS.FileText;
    return <Fallback className={className} />;
  }
  if (name === "Boxes" && !ICONS.Boxes) {
    const Fallback = ICONS.Box ?? ICONS.Package ?? ICONS.FileText;
    return <Fallback className={className} />;
  }
  const I = ICONS[name] ?? ICONS.FileText;
  return <I className={className} />;
}

type Props = { collapsed?: boolean };

export default function Sidebar({ collapsed = false }: Props) {
  const pathname = usePathname();

  return (
    <div className={cn("flex h-full min-h-0 flex-col max-w-full overflow-hidden", collapsed ? "w-20" : "w-72")}>
      {/* Header */}
      <div className={cn("px-5 py-5", collapsed && "px-3")}>
        <div className={cn("flex items-center gap-2", collapsed && "justify-center")}>
          <Image
            src="/transfreit-logo.svg"
            alt="Transfreit"
            width={164}
            height={40}
            className="h-10 w-auto border-2 border-red-500 rounded-4xl px-3"
            priority
          />
        </div>
      </div>

      {/* Scroll area */}
      <nav
        className={cn(
          "px-2 pb-4 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        )}
      >
        <ul className={cn("space-y-1 overflow-x-hidden", collapsed ? "w-full" : "w-[103%]")}>
          {/* Section label */}
          <li
            className={cn(
              "bg-blue-800 text-xs rounded-2xl px-4 text-white/90 py-1",
              collapsed && "mx-2 text-center px-2"
            )}
          >
            {!collapsed ? "Navigation" : "Nav"}
          </li>

          {/* Main nav — now permission guarded just like nav_admin */}
          {nav.map(({ href, label, icon }) => {
            const active = pathname?.startsWith(href);
            const perm = ADMIN_LINK_PERM[href]; // use same map; if not found, link stays visible

            const linkNode = (
              <Link
                href={href}
                className={cn(
                  "group flex items-center gap-3 rounded-l-2xl px-4 py-2.5 text-sm transition",
                  active ? "bg-[#ebf3f7] text-nav-txt" : "hover:bg-white/10",
                  collapsed && "justify-center"
                )}
              >
                <IconByName name={icon} className="h-5 w-5 shrink-0 text-red-400" />
                {!collapsed && <span className="truncate">{label}</span>}
              </Link>
            );

            if (perm) {
              return (
                <li key={href}>
                  <PermissionGate route={perm} fallback={null}>
                    {linkNode}
                  </PermissionGate>
                </li>
              );
            }
            return <li key={href}>{linkNode}</li>;
          })}

          {/* <li
            className={cn(
              "mt-3 bg-[#064F99] text-xs rounded-2xl px-4 w-fit text-white/90 py-1",
              collapsed && "mx-2 w-auto text-center px-2"
            )}
          >
            {!collapsed ? "Administration" : "Admin"}
          </li> */}

          {/* Admin nav (already guarded) */}
          {nav_admin.map(({ href, label, icon }) => {
            const active = pathname?.startsWith(href);
            const perm = ADMIN_LINK_PERM[href]; // sirf 4 test links mapped

            const linkNode = (
              <Link
                href={href}
                className={cn(
                  "group flex items-center gap-3 rounded-l-2xl px-4 py-2.5 text-sm transition",
                  active ? "bg-[#ebf3f7] text-nav-txt" : "hover:bg-white/10",
                  collapsed && "justify-center"
                )}
              >
                <IconByName name={icon} className="h-5 w-5 shrink-0 text-red-400" />
                {!collapsed && <span className="truncate">{label}</span>}
              </Link>
            );

            if (perm) {
              return (
                <li key={href}>
                  <PermissionGate route={perm} fallback={null}>
                    {linkNode}
                  </PermissionGate>
                </li>
              );
            }
            return <li key={href}>{linkNode}</li>;
          })}
        </ul>
      </nav>

      <div className={cn("mt-auto px-5 py-4 text-[11px] opacity-80", collapsed && "text-center px-0")}>
        {!collapsed ? "© 2025 All Rights Reserved" : "© 2025"}
      </div>
    </div>
  );
}
