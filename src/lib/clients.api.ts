import apiClient from "@/lib/api-client";

/** ===== Backend shapes ===== */
export type ClientItem = {
  id: string;
  name: string;
  country?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

type ClientsListResponse = {
  statusCode: number;
  status: boolean;
  message: string;
  heading: string;
  data: {
    clients: ClientItem[];
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

type ClientItemResponse = {
  statusCode: number;
  status: boolean;
  message: string;
  heading: string;
  data: ClientItem;
};

/** ===== Small helpers (aligned with quotations/invoices retry) ===== */
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

/** ===== API ===== */
export async function listClients(
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
    apiClient.get<ClientsListResponse>("/clients/getAll", {
      params,
      signal: opts?.signal,
    })
  );
  return {
    rows: data?.data?.clients ?? [],
    pagination: data?.data?.pagination,
  };
}

export async function getClientById(id: string) {
  const { data } = await with429Retry(() =>
    apiClient.get<ClientItemResponse>(`/clients/getById/${id}`)
  );
  return data.data;
}

export async function createClient(input: {
  name: string;
  country?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
}) {
  const body = sanitize(
    {
      name: input.name?.trim(),
      country: input.country?.trim(),
      address: input.address?.trim(),
      phone: input.phone?.trim(),
      email: input.email?.trim(),
    },
    ["name", "country", "address", "phone", "email"]
  );

  const { data } = await with429Retry(() =>
    apiClient.post<ClientItemResponse>("/clients/create", body)
  );
  return data.data;
}

export async function updateClient(input: {
  id: string;
  name: string;
  country?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  // ❌ do not send is_active (backend didn’t specify it in DTOs you shared)
}) {
  const body = sanitize(
    {
      id: input.id,
      name: input.name?.trim(),
      country: input.country?.trim(),
      address: input.address?.trim(),
      phone: input.phone?.trim(),
      email: input.email?.trim(),
    },
    ["id", "name", "country", "address", "phone", "email"]
  );

  const { data } = await with429Retry(() =>
    apiClient.put<ClientItemResponse>("/clients/update", body)
  );
  return data.data;
}

export async function deleteClient(id: string) {
  const { data } = await with429Retry(() =>
    apiClient.delete<ClientItemResponse>("/clients/delete", { data: { id } })
  );
  return data.data;
}
