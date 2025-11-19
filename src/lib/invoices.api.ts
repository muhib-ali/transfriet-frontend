// src/lib/invoices.api.ts
import apiClient from "@/lib/api-client";

// --- Lightweight helpers for resilience & hygiene (mirrors quotations.api) ---
function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}
function parseRetryAfter(e: any): number | null {
  const ra = e?.response?.headers?.["retry-after"];
  if (!ra) return null;
  const n = Number(ra);
  return Number.isFinite(n) ? Math.max(0, n * 1000) : null;
}
async function with429Retry<T>(fn: () => Promise<T>): Promise<T> {
  let attempts = 0;
  const maxAttempts = 3;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn();
    } catch (e: any) {
      const status = e?.response?.status;
      const isAbort = e?.code === "ERR_CANCELED";
      if (isAbort) throw e;
      if (status !== 429 || attempts >= maxAttempts) throw e;
      attempts++;
      const raMs = parseRetryAfter(e);
      const backoffMs = raMs ?? Math.min(2000 * attempts, 4000);
      await sleep(backoffMs);
    }
  }
}
function sanitize<T extends Record<string, any>>(obj: T): T {
  const out: Record<string, any> = {};
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (v === undefined || v === null) continue;
    out[k] = v;
  }
  return out as T;
}

/* ------------ Types (payloads) ------------ */
export type InvoiceItemInput = {
  product_id: string;
  tax_id?: string | null;
  quantity: number;
  unit_price: number;
};

export type CreateInvoiceFromQuotationInput = {
  quotation_id: string;
  customer_id: string;
  job_file_id: string;
  valid_until: string; // ISO
  items: InvoiceItemInput[];
};

export type CreateInvoiceInput = {
  customer_id: string;
  job_file_id: string;
  service_detail_ids: string[];
  valid_until: string; // ISO

  shipper_name?: string;
  consignee_name?: string;
  pieces_or_containers?: number;
  weight_volume?: string;
  cargo_description?: string;
  master_bill_no?: string | null;
  loading_place?: string;
  departure_date?: string; // ISO
  destination?: string;
  arrival_date?: string;   // ISO
  final_destination?: string;
  notes?: string;

  items: InvoiceItemInput[];
};

export type UpdateInvoiceInput = Partial<
  Omit<CreateInvoiceInput, "customer_id" | "job_file_id">
> & {
  id: string;
  customer_id?: string;
  job_file_id?: string;
};

/* ------------ Types (server models / normalized) ------------ */
export type Invoice = {
  id: string;
  invoice_number?: string | null;
  valid_until?: string | null;
  created_at?: string | null;
  grand_total?: number | string | null;

  customer?:
    | {
        id: string;
        name?: string;
        email?: string | null;
      }
    | null;

  /**
   * ✅ FE-friendly alias – we will always try to populate this
   * from backend's category / job_file / jobFile.
   */
  jobFile?:
    | {
        id: string;
        title?: string;
        label?: string | null;
        description?: string | null;
      }
    | null;

  /**
   * Raw backend field (JobFile relation is actually called "category" in entity)
   * Kept here in case you ever need it.
   */
  category?:
    | {
        id: string;
        title?: string;
        description?: string | null;
      }
    | null;

  service_details?:
    | Array<{
        id: string;
        title?: string;
        label?: string | null;
      }>
    | null;

  items?: Array<{
    product?: { id: string; title?: string; label?: string | null } | null;
    product_id?: string;
    tax?: { id: string; title?: string; label?: string | null } | null;
    tax_id?: string | null;
    quantity: number;
    unit_price: number | string;
  }>;
};

export type InvoiceListItem = Invoice;

/* ------------ API calls ------------ */
export async function createInvoice(
  payload: CreateInvoiceInput | CreateInvoiceFromQuotationInput
) {
  const { data } = await apiClient.post(`/invoices/create`, payload);
  return data?.data;
}

export async function updateInvoice(payload: UpdateInvoiceInput) {
  const { data } = await apiClient.put(`/invoices/update`, payload);
  return data?.data;
}

export async function getInvoiceById(id: string): Promise<Invoice> {
  const { data } = await apiClient.get(`/invoices/getById/${id}`);
  const raw = data?.data ?? {};

  // ✅ Normalize jobFile alias so FE can safely use invoice.jobFile
  const normalized: Invoice = {
    ...raw,
    jobFile: raw.jobFile ?? raw.job_file ?? raw.category ?? null,
  };

  return normalized;
}

export async function listInvoices(
  page = 1,
  limit = 10,
  search?: string,
  opts?: { signal?: AbortSignal }
) {
  const { data } = await with429Retry(() =>
    apiClient.get(`/invoices/getAll`, {
      params: sanitize({ page, limit, search }),
      signal: opts?.signal,
    })
  );

  const rawRows: any[] = data?.data?.invoices ?? [];

  // ✅ Yahan bhi category ko jobFile me map kar rahe hain list/table ke liye
  const rows: InvoiceListItem[] = rawRows.map((inv) => ({
    ...inv,
    jobFile: inv.jobFile ?? inv.job_file ?? inv.category ?? null,
  }));

  return {
    rows,
    pagination: data?.data?.pagination,
  };
}

export async function deleteInvoice(id: string) {
  const { data } = await apiClient.delete(`/invoices/delete`, { data: { id } });
  return data?.data ?? null;
}
