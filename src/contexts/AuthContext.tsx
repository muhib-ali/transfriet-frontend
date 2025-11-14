// src/contexts/AuthContext.tsx
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { authService } from "@/lib/auth";
import { User, Module } from "@/types/auth.types";

interface AuthContextType {
  user: User | null;
  permissions: Module[];
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (route: string) => boolean;
  getMenuItems: () => any[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      if (authService.isAuthenticated()) {
        const u = authService.getUser();
        const perms = authService.getPermissions();
        setUser(u);
        setPermissions(perms);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authService.login({ email, password });
    setUser(res.data.user);
    setPermissions(res.data.modulesWithPermisssions);
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setPermissions([]);
  };

  const hasPermission = (route: string) => authService.hasPermission(route);
  const getMenuItems = () => authService.getMenuPermissions();

  return (
    <AuthContext.Provider
      value={{ user, permissions, loading, login, logout, hasPermission, getMenuItems }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
