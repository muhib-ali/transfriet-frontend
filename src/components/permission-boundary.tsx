// src/components/permission-boundary.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useScreenPermission } from "@/hooks/use-screen-perm";
import Unauthorized from "@/components/unauthorized";

type Props = {
  /** route key in SCREEN_PERM (default: current pathname) */
  screen?: string;
  /** "soft" shows page but disables interaction; "block" hides completely */
  mode?: "soft" | "block";
  className?: string;
  children: React.ReactNode;
  /** optional custom unauthorized text */
  unauthorizedMsg?: string;
};

export default function PermissionBoundary({
  screen,
  mode = "soft",
  className,
  children,
  unauthorizedMsg = "You don't have access to this page. PLease go back",
}: Props) {
  const { allowed } = useScreenPermission(screen);
  // Ensure SSR and CSR render identical markup to avoid hydration mismatches.
  // We gate the render until after mount, then decide what to show.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Before mount, render nothing. This keeps server/client HTML identical.
  if (!mounted) return null;

  if (allowed) return <>{children}</>;

  // BLOCK: replace content entirely
  if (mode === "block") {
    return (
      <div className={cn("relative", className)}>
        <Unauthorized msg={unauthorizedMsg} />
      </div>
    );
  }

  // SOFT: show banner + render children, but prevent all interactions
  return (
    <div className={cn("relative", className)}>
      <Unauthorized msg={unauthorizedMsg} />
      {/* page content */}
      <div className="relative">
        {children}
        {/* Click-eating transparent overlay that still allows scroll on the container */}
        <div
          aria-hidden
          className="pointer-events-auto fixed inset-0 z-40"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Optional visual cue (subtle) */}
      <div className="pointer-events-none fixed inset-0 z-30 bg-transparent" />
    </div>
  );
}
