// src/lib/categories.api.ts
import apiClient from "@/lib/api-client";

/* ===== Types matched to your backend ===== */
export type JobFileItem = {
  id: string;
  title: string;
  description?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  created_by?: string | null;
  updated_by?: string | null;
};

type JobFilesListResponse = {
  statusCode: number;
  status: boolean;
  message: string;
  heading: string;
  data: {
    job_files: JobFileItem[];
    pagination?: {
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

type JobFileItemResponse = {
  statusCode: number;
  status: boolean;
  message: string;
  heading: string;
  data: JobFileItem;
};

/* ===== Helpers (rate-limit friendly, same as quotations/invoices) ===== */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function parseRetryAfter(h?: string | number): number | null {
  if (h == null) return null;
  if (typeof h === "number") return h;
  const s = String(h).trim();
  const secs = Number(s);
  if (!Number.isNaN(secs)) return Math.max(0, secs);
  const d = Date.parse(s);
  if (!Number.isNaN(d)) {
    const deltaMs = d - Date.now();
    return Math.max(0, Math.ceil(deltaMs / 1000));
  }
  return null;
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
      const retryAfterHdr = e?.response?.headers?.["retry-after"];
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

/** remove undefined/null + only allow specific keys */
function sanitize<T extends object>(obj: T, allow: (keyof T)[]) {
  const out: any = {};
  for (const k of allow) {
    const v = (obj as any)[k];
    if (v !== undefined && v !== null) out[k as string] = v;
  }
  return out;
}

/* ====== READ ====== */
export async function listJobFiles(
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
    apiClient.get<JobFilesListResponse>("/job_files/getAll", {
      params,
      signal: opts?.signal,
    })
  );
  return {
    rows: data?.data?.job_files ?? [],
    pagination: data?.data?.pagination,
  };
}

export async function getJobFileById(id: string) {
  const { data } = await with429Retry(() =>
    apiClient.get<JobFileItemResponse>(`/job_files/getById/${id}`)
  );
  return data.data;
}

/* ====== CREATE ====== */
export async function createJobFile(input: { title: string; description?: string }) {
  const body = sanitize(
    {
      title: input.title?.trim(),
      description: input.description?.trim(),
    },
    ["title", "description"]
  );
  const { data } = await with429Retry(() =>
    apiClient.post<JobFileItemResponse>("/job_files/create", body)
  );
  return data.data;
}

/* ====== UPDATE ====== */
export async function updateJobFile(input: {
  id: string;
  title: string;
  description?: string;
}) {
  const body = sanitize(
    {
      id: input.id,
      title: input.title?.trim(),
      description: input.description?.trim(),
    },
    ["id", "title", "description"]
  );
  const { data } = await with429Retry(() =>
    apiClient.put<JobFileItemResponse>("/job_files/update", body)
  );
  return data.data;
}

/* ====== DELETE ====== */
export async function deleteJobFile(id: string) {
  const { data } = await with429Retry(() =>
    apiClient.delete<JobFileItemResponse>("/job_files/delete", { data: { id } })
  );
  return data.data;
}
