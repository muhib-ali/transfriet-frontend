// src/rbac/permissions-map.ts

/** CRUD + extras for each admin entity (exact strings from your payload) */
export const ENTITY_PERMS = {
  modules: {
    list:   "modules/getAll",
    create: "modules/create",
    read:   "modules/getById",
    update: "modules/update",
    delete: "modules/delete",
  },
  permissions: {
    list:   "permissions/getAll",
    create: "permissions/create",
    read:   "permissions/getById",
    update: "permissions/update",
    delete: "permissions/delete",
  },
  roles: {
    list:   "roles/getAll",
    create: "roles/create",
    read:   "roles/getById",
    update: "roles/update",
    delete: "roles/delete",
    extras: {
      getRolePerms:   "roles/getAllPermissionsByRoleId",
      updateRolePerms:"roles/updatePermissionsAccessByRoleId",
    },
  },
  users: {
    list:   "users/getAll",
    create: "users/create",
    read:   "users/getById",
    update: "users/update",
    delete: "users/delete",
  },
  taxes:{
    list:   "taxes/getAll",
    create: "taxes/create",
    read:   "taxes/getById",
    update: "taxes/update",
    delete: "taxes/delete",
  },
    jobFiles:{
    list:   "job_files/getAll",
    create: "job_files/create",
    read:   "job_files/getById",
    update: "job_files/update",
    delete: "job_files/delete",
  },
  products:{
    list:   "products/getAll",
    create: "products/create",
    read:   "products/getById",
    update: "products/update",
    delete: "products/delete",
  },
   clients:{
    list:   "clients/getAll",
    create: "clients/create",
    read:   "clients/getById",
    update: "clients/update",
    delete: "clients/delete",
  },
  quotations:{
    list:   "quotations/getAll",
    create: "quotations/create",
    read:   "quotations/getById",
    update: "quotations/update",
    delete: "quotations/delete",
  },
  invoices:{
    list:   "invoices/getAll",
    create: "invoices/create",
    read:   "invoices/getById",
    update: "invoices/update",
    delete: "invoices/delete",
  }
 
 
  // TODO (jab backend dega):
  // categories: { list: "categories/getAll", create:"categories/create", read:"categories/getById", update:"categories/update", delete:"categories/delete" },
  // tax:        { list: "tax/getAll",        create:"tax/create",        read:"tax/getById",        update:"tax/update",        delete:"tax/delete" },
} as const;

/** Page-level required permissions (guards for pages/routes) */
export const SCREEN_PERM: Record<string, string> = {
  // Modules
  "/dashboard/modules":                 ENTITY_PERMS.modules.list,
  "/dashboard/modules/create":          ENTITY_PERMS.modules.create,
  "/dashboard/modules/[id]":            ENTITY_PERMS.modules.read,
  "/dashboard/modules/[id]/edit":       ENTITY_PERMS.modules.update,

  // Permissions
  "/dashboard/permissions":             ENTITY_PERMS.permissions.list,
  "/dashboard/permissions/create":      ENTITY_PERMS.permissions.create,
  "/dashboard/permissions/[id]":        ENTITY_PERMS.permissions.read,
  "/dashboard/permissions/[id]/edit":   ENTITY_PERMS.permissions.update,

  // Roles
  "/dashboard/roles":                   ENTITY_PERMS.roles.list,
  "/dashboard/roles/create":            ENTITY_PERMS.roles.create,
  "/dashboard/roles/[id]":              ENTITY_PERMS.roles.read,
  "/dashboard/roles/[id]/edit":         ENTITY_PERMS.roles.update,
  "/dashboard/roles/[id]/permissions":  ENTITY_PERMS.roles.extras.getRolePerms,     // view matrix
  "/dashboard/roles/[id]/permissions/edit": ENTITY_PERMS.roles.extras.updateRolePerms, // update matrix

  // Users
  "/dashboard/users":                   ENTITY_PERMS.users.list,
  "/dashboard/users/create":            ENTITY_PERMS.users.create,
  "/dashboard/users/[id]":              ENTITY_PERMS.users.read,
  "/dashboard/users/[id]/edit":         ENTITY_PERMS.users.update,

  "/dashboard/tax":                   ENTITY_PERMS.taxes.list,
  "/dashboard/tax/create":            ENTITY_PERMS.taxes.create,
  "/dashboard/tax/[id]":              ENTITY_PERMS.taxes.read,
  "/dashboard/tax/[id]/edit":         ENTITY_PERMS.taxes.update,

   "/dashboard/jobFiles":                   ENTITY_PERMS.jobFiles.list,
  "/dashboard/jobFiles/create":            ENTITY_PERMS.jobFiles.create,
  "/dashboard/jobFiles/[id]":              ENTITY_PERMS.jobFiles.read,
  "/dashboard/jobFiles/[id]/edit":         ENTITY_PERMS.jobFiles.update,

   "/dashboard/products":                   ENTITY_PERMS.products.list,
  "/dashboard/categories/products":            ENTITY_PERMS.products.create,
  "/dashboard/products/[id]":              ENTITY_PERMS.products.read,
  "/dashboard/products/[id]/edit":         ENTITY_PERMS.products.update,

   "/dashboard/clients":                   ENTITY_PERMS.clients.list,
  "/dashboard/categories/clients":            ENTITY_PERMS.clients.create,
  "/dashboard/clients/[id]":              ENTITY_PERMS.clients.read,
  "/dashboard/clients/[id]/edit":         ENTITY_PERMS.clients.update,

    "/dashboard/quotations":                   ENTITY_PERMS.quotations.list,
  "/dashboard/quotations/new":            ENTITY_PERMS.quotations.create,
  "/dashboard/quotations/[id]":              ENTITY_PERMS.quotations.read,
  "/dashboard/quotations/[id]/edit":         ENTITY_PERMS.quotations.update,

    "/dashboard/invoices":                   ENTITY_PERMS.invoices.list,
  "/dashboard/invoices/new":            ENTITY_PERMS.invoices.create,
  "/dashboard/invoices/[id]":              ENTITY_PERMS.invoices.read,
  "/dashboard/invoices/[id]/edit":         ENTITY_PERMS.invoices.update,
  



  // Categories / Tax (enable when backend ready)
  // "/dashboard/categories":              "categories/getAll",
  // "/dashboard/tax":                     "tax/getAll",
};
