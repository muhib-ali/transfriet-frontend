// src/rbac/link-permissions.ts
import { ENTITY_PERMS } from "./permissions-map";

/** Admin sidebar links -> required LIST permission */
export const ADMIN_LINK_PERM: Record<string, string> = {
  "/dashboard/modules":     ENTITY_PERMS.modules.list,
  "/dashboard/permissions": ENTITY_PERMS.permissions.list,
  "/dashboard/roles":       ENTITY_PERMS.roles.list,
  "/dashboard/users":       ENTITY_PERMS.users.list,
   "/dashboard/tax":  ENTITY_PERMS.taxes.list,
  // enable when backend exposes these:
  // "/dashboard/categories":  "categories/getAll",
  // "/dashboard/tax":         "tax/getAll",
    // In dono ke routes abhi payload me nahi aate => not allowed => hidden
  "/dashboard/jobFiles":   ENTITY_PERMS.jobFiles.list,
   "/dashboard/products":   ENTITY_PERMS.products.list,
   "/dashboard/quotations":   ENTITY_PERMS.quotations.list,
   "/dashboard/invoices":   ENTITY_PERMS.invoices.list,
  // "/dashboard/tax":         "tax/getAll",
  // "/dashboard/products": "products:list",
  // "/dashboard/customers":"customers/getAll"
};
