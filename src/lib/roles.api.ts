import apiClient from "@/lib/api-client";
import type {
  RolesListResponse,
  RoleItemResponse,
  RolePermsResponse,
  RoleModulePerm,
  AdminRole,
} from "@/types/admin.types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
function parseRetryAfter(hdr?: string): number | null {
  if (!hdr) return null;
  const n = Number(hdr);
  return Number.isFinite(n) ? Math.max(0, n) : null; // seconds
}
async function with429Retry<T>(
  fn: () => Promise<T>,
  {
    retries = 4,
    baseDelayMs = 400,
    maxDelayMs = 8000,
  }: { retries?: number; baseDelayMs?: number; maxDelayMs?: number } = {}
) {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (e: any) {
      const status = e?.response?.status;
      const retryAfterHdr = e?.response?.headers?.["retry-after"] as string | undefined;
      const retryAfterSec = parseRetryAfter(retryAfterHdr);
      const canRetry = status === 429 && attempt < retries;
      if (!canRetry) throw e;

      let delayMs =
        retryAfterSec != null
          ? retryAfterSec * 1000
          : Math.min(maxDelayMs, Math.round(baseDelayMs * Math.pow(2, attempt)));
      const jitter = delayMs * (Math.random() * 0.4 - 0.2);
      delayMs = Math.max(200, Math.round(delayMs + jitter));
      await sleep(delayMs);
      attempt += 1;
      continue;
    }
  }
}

function sanitize<T extends object>(obj: T, allow: (keyof T)[]) {
  const out: any = {};
  for (const k of allow) {
    const v = (obj as any)[k];
    if (v !== undefined && v !== null) out[k as string] = v;
  }
  return out;
}

/** GET /roles/getAll?page&limit&search */
export async function listRoles(
  page = 1,
  limit = 10,
  search?: string,
  opts?: { signal?: AbortSignal }
) {
  const params = sanitize(
    { page, limit, search: search?.trim() || undefined },
    ["page", "limit", "search"]
  );
  const { data } = await with429Retry(() =>
    apiClient.get<RolesListResponse>("/roles/getAll", {
      params,
      signal: opts?.signal,
    })
  );
  return { rows: data?.data?.roles ?? [], pagination: data?.data?.pagination };
}

/** GET /roles/getById/:id */
export async function getRoleById(id: string) {
  const { data } = await with429Retry(() =>
    apiClient.get<RoleItemResponse>(`/roles/getById/${id}`)
  );
  return data.data;
}

/** POST /roles/create { title } */
export async function createRole(payload: { title: string }) {
  const { data } = await with429Retry(() =>
    apiClient.post<RoleItemResponse>("/roles/create", payload)
  );
  return data.data;
}

/** PUT /roles/update */
export async function updateRole(payload: { id: string; title?: string }) {
  const { data } = await with429Retry(() =>
    apiClient.put<RoleItemResponse>("/roles/update", payload)
  );
  return data.data;
}

/** DELETE /roles/delete { id } */
export async function deleteRole(id: string) {
  const { data } = await with429Retry(() =>
    apiClient.delete<RoleItemResponse>("/roles/delete", { data: { id } })
  );
  return data.data;
}

/** GET role permissions (grouped by module) */
export async function getRolePerms(roleId: string): Promise<RoleModulePerm[]> {
  const { data } = await with429Retry(() =>
    apiClient.get<RolePermsResponse>(`/roles/getAllPermissionsByRoleId/${roleId}`)
  );
  // backend key is modulesWithPermisssions (3 s) — keep as-is
  return data.data.modulesWithPermisssions;
}

/**
 * PUT /roles/updatePermissionsAccessByRoleId
 * Backend expects:
 * {
 *   roleId,
 *   modulesWithPermissions: [
 *     { moduleSlug, permissions: [{ id, permissionSlug, isAllowed }] }
 *   ]
 * }
 */
export async function updateRolePerms(input: {
  roleId: string;
  current: RoleModulePerm[]; // (unused now, but kept if you want to diff)
  next: RoleModulePerm[];
}) {
  // Build EXACT backend shape from server's snake_case response
  const modulesWithPermissions = input.next.map((m) => ({
    moduleSlug: m.module_slug,
    permissions: m.permissions.map((p) => ({
      id: p.id,
      permissionSlug: p.permission_slug,
      isAllowed: Boolean(p.is_allowed),
    })),
  }));

  const payload = {
    roleId: input.roleId,
    modulesWithPermissions,
  };

  const { data } = await with429Retry(() =>
    apiClient.put<{ status: boolean; message: string }>(
      "/roles/updatePermissionsAccessByRoleId",
      payload
    )
  );
  return data;
}
