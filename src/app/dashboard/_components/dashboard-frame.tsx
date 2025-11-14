// src/app/dashboard/_components/dashboard-frame.tsx
"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/sidebar";
import Topbar from "@/components/topbar";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { usePathname } from "next/navigation";

export default function DashboardFrame({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onStart = () => setRouteLoading(true);
    const onStop = () => setRouteLoading(false);
    window.addEventListener("dashboard-loading:start", onStart);
    window.addEventListener("dashboard-loading:stop", onStop);
    return () => {
      window.removeEventListener("dashboard-loading:start", onStart);
      window.removeEventListener("dashboard-loading:stop", onStop);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setRouteLoading(false), 2000);
    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <div className="min-h-screen overflow-x-hidden">
      <aside
        className={cn(
          "fixed left-0 top-0 z-30 hidden h-screen rounded-r-4xl bg-blue-800 text-white transition-[width] duration-300 lg:block",
          collapsed ? "w-20" : "w-72"
        )}
      >
        <Sidebar collapsed={collapsed} />
      </aside>

      <main className={cn("relative min-h-screen min-w-0", collapsed ? "lg:pl-20" : "lg:pl-72")}>
        <div className="flex items-center gap-2 px-4 h-14 border-b lg:hidden">
          <button
            aria-label="Open sidebar"
            onClick={() => setOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="font-semibold">Dashboard</div>
        </div>

        <Topbar
          onMenuClick={() => setOpen(true)}
          onToggleSidebar={() => setCollapsed((v) => !v)}
          collapsed={collapsed}
        />

        <div
          className="relative p-4 sm:p-6 min-w-0 pt-20"
        >
          {children}
        </div>

        {routeLoading && (
          <div className="pointer-events-none absolute inset-0 z-50 grid place-items-center">
            <Spinner className="size-10 sm:size-12 text-blue-500" />
          </div>
        )}
      </main>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 max-w-[85%] bg-[#064F99] text-white shadow-xl">
            <div className="flex items-center justify-between h-14 px-4 border-b">
              <div className="font-semibold">Menu</div>
              <button
                aria-label="Close sidebar"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/20"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="h-[calc(100%-56px)] overflow-y-auto">
              <Sidebar />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
