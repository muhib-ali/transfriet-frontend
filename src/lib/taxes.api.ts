// src/lib/taxes.api.ts
import apiClient from "@/lib/api-client";

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

// --- API Shapes (your backend) ---
export type TaxDto = {
  id: string;
  title: string;
  value: number | string; // backend may return "18.50"
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

type TaxesListResponse = {
  status: boolean;
  data?: { taxes?: TaxDto[]; pagination?: any };
};

type TaxItemResponse = { status: boolean; data: TaxDto };

// --- Endpoints ---
/** GET /taxes/getAll?page&limit&search */
export async function listTaxes(
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
    apiClient.get<TaxesListResponse>("/taxes/getAll", {
      params,
      signal: opts?.signal,
    })
  );
  return { rows: data?.data?.taxes ?? [], pagination: data?.data?.pagination };
}

/** GET /taxes/getById/:id */
export async function getTaxById(id: string) {
  const { data } = await with429Retry(() =>
    apiClient.get<TaxItemResponse>(`/taxes/getById/${id}`)
  );
  return data.data;
}

/** POST /taxes/create { title, slug, value } */
export async function createTax(payload: {
  title: string;
  value: number;
  is_active?: boolean;
}) {
  const { data } = await with429Retry(() =>
    apiClient.post<TaxItemResponse>("/taxes/create", payload)
  );
  return data.data;
}

/** PUT /taxes/update (PUT required) */
export async function updateTax(payload: {
  id: string;
  title?: string;
  value?: number;
  is_active?: boolean;
}) {
  const { data } = await with429Retry(() =>
    apiClient.put<TaxItemResponse>("/taxes/update", payload)
  );
  return data.data;
}

/** DELETE /taxes/delete { id } */
export async function deleteTax(id: string) {
  const { data } = await with429Retry(() =>
    apiClient.delete<TaxItemResponse>("/taxes/delete", { data: { id } })
  );
  return data.data;
}
