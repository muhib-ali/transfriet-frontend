// src/types/admin.types.ts

export interface AdminRole {
  id: string;
  title: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RolesListResponse {
  statusCode: number;
  status: boolean;
  message: string;
  heading: string;
  data: {
    roles: AdminRole[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
      nextPage: number | null;
      prevPage: number | null;
    };
  };
}

export interface RoleItemResponse {
  statusCode: number;
  status: boolean;
  message: string;
  heading: string;
  data: AdminRole;
}

/** Permissions matrix for a role */
export type RolePermItem = {
  id: string;                 // permission id
  permission_slug: string;    // e.g. "getAll"
  is_allowed: boolean;
};

export type RoleModulePerm = {
  module_slug: string;        // e.g. "roles"
  permissions: RolePermItem[];
};

export interface RolePermsResponse {
  statusCode: number;
  status: boolean;
  message: string;
  heading: string;
  data: {
    modulesWithPermisssions: RoleModulePerm[];
  };
}
