// src/types/auth.types.ts

export interface Role {
  id: string;
  title: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  permission_name: string;
  permission_slug: string;
  route: string;
  is_allowed: boolean;
  is_Show_in_menu: boolean;
}

export interface Module {
  module_name: string;
  module_slug: string;
  permissions: Permission[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface LoginResponse {
  statusCode: number;
  status: boolean;
  message: string;
  heading: string;
  data: {
    user: User;
    token: string;
    refresh_token: string;
    expires_at: string;
    modulesWithPermisssions: Module[];
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}