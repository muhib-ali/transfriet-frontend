// src/lib/dropdowns.api.ts
import api from "@/lib/api-client";

export type DDOption = { label: string; value: string ; price?: number;};

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
  // Categories
  let jobFiles = await tryDropdown("/dropdowns/getAllJobFiles", "jobFilesDropdown");
  if (!jobFiles.length) {
    const rows = await tryList("/job_files/getAll", "job_files");
    jobFiles = map(rows, "id", "title");
  }

  // Subcategories
  let subcategories = await tryDropdown("/dropdowns/getAllSubcategories", "subcategoriesDropdown");
  if (!subcategories.length) {
    const rows = await tryList("/subcategories/getAll", "subcategories");
    subcategories = map(rows, "id", "title");
  }

  // Products
  let products = await tryDropdown("/dropdowns/getAllProducts", "productsDropdown");
  if (!products.length) {
    const rows = await tryList("/products/getAll", "products");
    products = map(rows, "id", rows?.[0]?.title ? "title" : "name");
  }

  // Clients
  let clients = await tryDropdown("/dropdowns/getAllClients", "clientsDropdown");
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

  return { jobFiles, subcategories, products, clients, taxes };
}
