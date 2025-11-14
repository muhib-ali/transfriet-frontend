// src/hooks/use-permission.ts
import { useAuth } from "@/contexts/AuthContext";

/** Return true/false for a given route permission */
export function useHasPermission(route: string) {
  const { hasPermission } = useAuth();
  return hasPermission(route);
}
