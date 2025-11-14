// src/components/permission-gate.tsx
"use client";

import * as React from "react";
import { useHasPermission } from "@/hooks/use-permission";

/**
 * Always call hooks top-level. We only gate the *render* until mounted,
 * so SSR/CSR markup stays identical and hydration is happy.
 */
export default function PermissionGate({
  route,
  children,
  fallback = null,
}: {
  route: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const allowed = useHasPermission(route);   // <— called unconditionally
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  // Before mount, render nothing => avoids SSR/CSR mismatch
  if (!mounted) return null;

  return <>{allowed ? children : fallback}</>;
}
