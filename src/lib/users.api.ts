// src/lib/users.api.ts
import apiClient from "@/lib/api-client";

// --- Types (adjust if your backend returns different shapes) ---
export type UserItem = {
  id: string;
  name: string;
  email: string;
  roleId: string;
  role_title?: string;      // normalized role title (from role.title or role_title)
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type UsersListResponse = {
  statusCode: number;
  status: boolean;
  message: string;
  heading: string;
  data: {
    users: UserItem[];
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
};

export type UserItemResponse = {
  statusCode: number;
  status: boolean;
  message: string;
  heading: string;
  data: UserItem;
};

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

/** GET /users/getAll?page&limit&search */
export async function listUsers(
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
    apiClient.get<UsersListResponse>("/users/getAll", { params, signal: opts?.signal })
  );
  const rawRows = data?.data?.users ?? [];
  const rows: UserItem[] = rawRows.map((u: any) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    // backend may return role_id or roleId; prefer role_id and fallback
    roleId: u.role_id ?? u.roleId ?? (u.role && u.role.id) ?? "",
    // backend may include nested role object with title
    role_title: u.role?.title ?? u.role_title ?? undefined,
    is_active: u.is_active,
    created_at: u.created_at,
    updated_at: u.updated_at,
  }));

  return { rows, pagination: data?.data?.pagination };
}

/** GET /users/getById/:id */
export async function getUserById(id: string) {
  const { data } = await with429Retry(() =>
    apiClient.get<UserItemResponse>(`/users/getById/${id}`)
  );
  const u = data.data as any;
  const normalized: UserItem = {
    id: u.id,
    name: u.name,
    email: u.email,
    roleId: u.role_id ?? u.roleId ?? (u.role && u.role.id) ?? "",
    role_title: u.role?.title ?? u.role_title ?? undefined,
    is_active: u.is_active,
    created_at: u.created_at,
    updated_at: u.updated_at,
  };
  return normalized;
}

/** POST /users/create { roleId, name, email, password } */
export async function createUser(payload: {
  roleId: string;
  name: string;
  email: string;
  password: string;
}) {
  const { data } = await with429Retry(() =>
    apiClient.post<UserItemResponse>("/users/create", payload)
  );
  const u = data.data as any;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    roleId: u.role_id ?? u.roleId ?? (u.role && u.role.id) ?? "",
    role_title: u.role?.title ?? u.role_title ?? undefined,
    is_active: u.is_active,
    created_at: u.created_at,
    updated_at: u.updated_at,
  } as UserItem;
}

/** put /users/update { id, roleId, name, email, password?, is_active? } */
export async function updateUser(payload: {
  id: string;
  roleId: string;
  name: string;
  email: string;
  password?: string;
  is_active?: boolean;
}) {
  // If put not supported in your backend, swap to PUT here
  const { data } = await with429Retry(() =>
    apiClient.put<UserItemResponse>("/users/update", payload)
  );
  const u = data.data as any;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    roleId: u.role_id ?? u.roleId ?? (u.role && u.role.id) ?? "",
    role_title: u.role?.title ?? u.role_title ?? undefined,
    is_active: u.is_active,
    created_at: u.created_at,
    updated_at: u.updated_at,
  } as UserItem;
}

/** DELETE /users/delete  body: { id } */
export async function deleteUser(id: string) {
  const { data } = await with429Retry(() =>
    apiClient.delete<UserItemResponse>("/users/delete", { data: { id } })
  );
  return data.data;
}
