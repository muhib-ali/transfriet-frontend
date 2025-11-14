// src/hooks/use-screen-perm.ts
"use client";

import { usePathname } from "next/navigation";
import { SCREEN_PERM } from "@/rbac/permissions-map";
import { useHasPermission } from "@/hooks/use-permission";

export function useScreenPermission(screen?: string) {
  const pathname = usePathname();
  const routeKey = screen ?? pathname ?? "/";
  const required = SCREEN_PERM[routeKey];

  // If there is no mapping, treat as allowed.
  const allowed = required ? useHasPermission(required) : true;

  return {
    allowed,
    required: required ?? null,
    routeKey,
  };
}
