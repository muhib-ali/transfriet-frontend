// src/lib/products.api.ts
import apiClient from "@/lib/api-client";

/** ===== Backend types ===== */
export type ProductItem = {
  id: string;
  title: string;
  description?: string | null;
  price: number | string;         // backend may return string
  job_file_id?: string | null;    // nullable
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  created_by?: string | null;
  updated_by?: string | null;
};

type ProductsListResponse = {
  statusCode: number;
  status: boolean;
  message: string;
  heading: string;
  data: {
    products: ProductItem[];
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

type ProductItemResponse = {
  statusCode: number;
  status: boolean;
  message: string;
  heading: string;
  data: ProductItem;
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

/** only allow specific keys + drop undefined/null */
function sanitize<T extends object>(obj: T, allow: (keyof T)[]) {
  const out: any = {};
  for (const k of allow) {
    const v = (obj as any)[k];
    if (v !== undefined && v !== null) out[k as string] = v;
  }
  return out;
}



/* ===== READ ===== */
export async function listProducts(
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
    apiClient.get<ProductsListResponse>("/products/getAll", {
      params,
      signal: opts?.signal,
    })
  );
  return {
    rows: data?.data?.products ?? [],
    pagination: data?.data?.pagination,
  };
}

export async function getProductById(id: string) {
  const { data } = await with429Retry(() =>
    apiClient.get<ProductItemResponse>(`/products/getById/${id}`)
  );
  return data.data;
}

/* ===== CREATE ===== */
export async function createProduct(input: {
  title: string;
  description?: string;
  price: number;
  job_file_id?: string | null;
}) {
  const body = sanitize(
    {
      title: input.title?.trim(),

      description: input.description?.trim(),
      price: Number(input.price),
      job_file_id: input.job_file_id ?? null,
    },
    ["title", "description", "price", "job_file_id"]
  );

  const { data } = await with429Retry(() =>
    apiClient.post<ProductItemResponse>("/products/create", body)
  );
  return data.data;
}

/* ===== UPDATE ===== */
export async function updateProduct(input: {
  id: string;
  title: string;

  description?: string;
  price: number;
  job_file_id?: string | null;
}) {
  const body = sanitize(
    {
      id: input.id,
      title: input.title?.trim(),

      description: input.description?.trim(),
      price: Number(input.price),
      job_file_id: input.job_file_id ?? null,
    },
    ["id", "title", "description", "price", "job_file_id"]
  );

  const { data } = await with429Retry(() =>
    apiClient.put<ProductItemResponse>("/products/update", body)
  );
  return data.data;
}

/* ===== DELETE ===== */
export async function deleteProduct(id: string) {
  const { data } = await with429Retry(() =>
    apiClient.delete<ProductItemResponse>("/products/delete", {
      data: { id },
    })
  );
  return data.data;
}
