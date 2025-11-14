// src/components/page-permission-guard.tsx
"use client";

import { useAuth } from "@/contexts/AuthContext";
import Unauthorized from "@/components/unauthorized";

export default function PagePermissionGuard({
  perm,
  children,
}: {
  perm: string;
  children: React.ReactNode;
}) {
  const { hasPermission } = useAuth();
  if (!hasPermission(perm)) return <Unauthorized msg="You don't have access to this page." />;
  return <>{children}</>;
}
