// src/lib/dropdowns.api.ts
import api from "@/lib/api-client";

export type DDOption = { label: string; value: string; price?: number };

// Try dropdown endpoints first; if 404, fallback to full list endpoints.
async function tryDropdown(path: string, key: string): Promise<DDOption[]> {
  try {
    const { data } = await api.get(path);
    return data?.data?.[key] ?? [];
  } catch (e: any) {
    if (e?.response?.status === 404) return [];
    throw e;
  }
}

async function tryList(path: string, key: string): Promise<any[]> {
  const { data } = await api.get(path, { params: { page: 1, limit: 100 } });
  return data?.data?.[key] ?? [];
}

function map(rows: any[], valueKey: string, labelKey: string): DDOption[] {
  return (rows ?? [])
    .map((r) => {
      const value = String(r?.[valueKey] ?? "");
      const label = String(r?.[labelKey] ?? "");
      return value && label ? { value, label } : null;
    })
    .filter(Boolean) as DDOption[];
}

export async function loadAllDropdowns() {
  // Job Files
  let jobFiles = await tryDropdown(
    "/dropdowns/getAllJobFiles",
    "jobFilesDropdown"
  );
  if (!jobFiles.length) {
    const rows = await tryList("/job_files/getAll", "job_files");
    jobFiles = map(rows, "id", "title");
  }

  // Service Details
  let serviceDetails = await tryDropdown(
    "/dropdowns/getAllServiceDetails",
    "serviceDetailsDropdown"
  );
  if (!serviceDetails.length) {
    const rows = await tryList("/service_details/getAll", "service_details");
    serviceDetails = map(rows, "id", "title");
  }

  // Products (multi-language + price support)
  let products = await tryDropdown(
    "/dropdowns/getAllProducts",
    "productsDropdown"
  );

  {
    const rows = await tryList("/products/getAll", "products");
    if (rows.length) {
      products = (rows ?? [])
        .map((r) => {
          const translations = r?.translations || {};
          const en = translations?.en;
          const ar = translations?.ar;

          const baseTitle = en?.title || r?.title || r?.name || "Unnamed product";
          const arTitle = ar?.title;

          const label = arTitle && arTitle.trim().length > 0 ? `${baseTitle} (${arTitle})` : baseTitle;

          const rawPrice = r?.price;
          const priceNumber = rawPrice !== undefined && rawPrice !== null ? Number(rawPrice) : undefined;

          const value = String(r?.id ?? "");
          if (!value || !label) return null;

          const option: DDOption = { value, label };
          if (!Number.isNaN(priceNumber!) && priceNumber !== undefined) option.price = priceNumber;
          return option;
        })
        .filter(Boolean) as DDOption[];
    } else if (!products.length) {
      products = map(rows, "id", rows?.[0]?.title ? "title" : "name");
    }
  }

  // Clients
  let clients = await tryDropdown(
    "/dropdowns/getAllClients",
    "clientsDropdown"
  );
  if (!clients.length) {
    const rows = await tryList("/clients/getAll", "clients");
    clients = map(rows, "id", rows?.[0]?.name ? "name" : "title");
  }

  // Taxes
  let taxes = await tryDropdown("/dropdowns/getAllTaxes", "taxesDropdown");
  if (!taxes.length) {
    const rows = await tryList("/taxes/getAll", "taxes");
    taxes = map(rows, "id", rows?.[0]?.title ? "title" : "name");
  }

  return { jobFiles, serviceDetails, products, clients, taxes };
}
