// src/lib/quotations.api.ts
import apiClient from "@/lib/api-client";

/* ===== Helpers (rate-limit friendly) ===== */
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

function sanitize<T extends object>(obj: T, allow: (keyof T)[]) {
  const out: any = {};
  for (const k of allow) {
    const v = (obj as any)[k];
    if (v !== undefined && v !== null) out[k as string] = v;
  }
  return out;
}

export type QuotationItemInput = {
  product_id: string;
  tax_id?: string | null;
  quantity: number;
  unit_price: number;
};

export type CreateQuotationInput = {
  customer_id: string;
  job_file_id: string;
  service_detail_ids: string[]; // import/export (at least one; your UI enforces one)
  valid_until: string;       // ISO string

  shipper_name?: string;
  consignee_name?: string;
  pieces_or_containers?: number;
  weight_volume?: string;
  cargo_description?: string;
  master_bill_no?: string | null;
  loading_place?: string;
  departure_date?: string;   // ISO string
  destination?: string;
  arrival_date?: string;     // ISO string
  final_destination?: string;
  notes?: string;

  items: QuotationItemInput[];
};

export type UpdateQuotationInput = Partial<
  Omit<CreateQuotationInput, "customer_id" | "job_file_id">
> & {
  id: string;
  isInvoiceCreated?: boolean;
};

export async function createQuotation(payload: CreateQuotationInput) {
  const { data } = await apiClient.post(`/quotations/create`, payload);
  return data?.data;
}

export async function updateQuotation(payload: UpdateQuotationInput) {
  const { data } = await apiClient.put(`/quotations/update`, payload);
  return data?.data;
}

export async function getQuotationById(id: string) {
  const { data } = await apiClient.get(`/quotations/getById/${id}`);
  return data?.data;
}

export async function listQuotations(
  page = 1,
  limit = 10,
  search?: string,
  opts?: { signal?: AbortSignal }
) {
  const params = sanitize({ page, limit, search }, ["page", "limit", "search"]);
  const { data } = await with429Retry(() =>
    apiClient.get(`/quotations/getAll`, {
      params,
      signal: opts?.signal,
    })
  );

  const rawRows: any[] = data?.data?.quotations ?? [];

  // ✅ yahan pe backend ki "category" ko FE-friendly alias "jobFile" me map kar rahe hain
  const rows = rawRows.map((q) => ({
    ...q,
    jobFile: q.category ?? q.job_file ?? null,
  }));

  return {
    rows,
    pagination: data?.data?.pagination,
  };
}

export async function deleteQuotation(id: string) {
  const { data } = await apiClient.delete(`/quotations/delete`, { data: { id } });
  return data?.data ?? null;
}

/** Optional helpers if you want to populate selects later */
export async function listServiceDetails(page = 1, limit = 10) {
  const { data } = await apiClient.get(`/service_details/getAll`, {
    params: { page, limit },
  });
  return data?.data?.service_details ?? [];
}
