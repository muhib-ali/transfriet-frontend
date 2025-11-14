// src/lib/modules.api.ts
import apiClient from "@/lib/api-client";

type ModuleItem = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type ModulesListResponse = {
  status: boolean;
  statusCode: number;
  data: { modules: ModuleItem[]; pagination?: any };
};

type ModuleItemResponse = {
  status: boolean;
  statusCode: number;
  data: ModuleItem;
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
): Promise<T> {
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

/** GET /modules/getAll?page&limit&search */
export async function listModules(
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
    apiClient.get<ModulesListResponse>("/modules/getAll", {
      params,
      signal: opts?.signal,
    })
  );
  return { rows: data?.data?.modules ?? [], pagination: data?.data?.pagination };
}

/** GET /modules/getById/:id */
export async function getModuleById(id: string) {
  const { data } = await with429Retry(() =>
    apiClient.get<ModuleItemResponse>(`/modules/getById/${id}`)
  );
  return data.data;
}

/** POST /modules/create  (NO is_active here) */
export async function createModule(payload: {
  title: string;
  slug: string;
  description?: string;
}) {
  const { data } = await with429Retry(() =>
    apiClient.post<ModuleItemResponse>("/modules/create", payload)
  );
  return data.data;
}

/** UPDATE /modules/update — only allowed fields */
export async function updateModule(payload: {
  id: string;
  title?: string;
  slug?: string;
  description?: string;
}) {
  try {
    const { data } = await with429Retry(() =>
      apiClient.post<ModuleItemResponse>("/modules/update", payload)
    );
    return data.data;
  } catch {
    const { data } = await with429Retry(() =>
      apiClient.put<ModuleItemResponse>("/modules/update", payload)
    );
    return data.data;
  }
}

/** DELETE /modules/delete  (Axios delete with body) */
export async function deleteModule(id: string) {
  const { data } = await with429Retry(() =>
    apiClient.delete<ModuleItemResponse>("/modules/delete", { data: { id } })
  );
  return data.data;
}
