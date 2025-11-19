// src/app/dashboard/quotations/[id]/edit/page.tsx
"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

import { loadAllDropdowns, type DDOption } from "@/lib/dropdowns.api";
import ProductFormDialog, { type ProductFormValue } from "@/components/products/product-form";
import { createProduct } from "@/lib/products.api";
import {
  getQuotationById,
  updateQuotation,
  type UpdateQuotationInput,
} from "@/lib/quotations.api";
import PermissionBoundary from "@/components/permission-boundary";
import { ENTITY_PERMS } from "@/rbac/permissions-map";
import { useHasPermission } from "@/hooks/use-permission";

/* -------------------- helpers -------------------- */
function money(n: number) {
  if (!isFinite(n)) return "$0.00";
  return `$${n.toFixed(2)}`;
}
function billLabelForJobFile(jobFileLabel?: string) {
  const k = (jobFileLabel ?? "").toLowerCase();
  if (k.includes("air")) return "Air Waybill No.";
  if (k.includes("overland") || k.includes("road") || k.includes("truck"))
    return "Truck Waybill No.";
  if (k.includes("broker")) return "Tracking No.";
  if (k.includes("sea") || k.includes("ocean")) return "Master Bill No.";
  return "Reference No.";
}
/** extract Waybill/Ref value from notes where we persist it for categories that disallow master_bill_no */
function extractWaybillRef(notes?: string): string {
  if (!notes) return "";
  const tokens = notes
    .split("|")
    .map((t) => t.trim())
    .filter(Boolean);
  const hit = tokens.find((t) => /^waybill\/ref:\s*/i.test(t));
  return hit ? hit.replace(/^waybill\/ref:\s*/i, "").trim() : "";
}
/** upsert Waybill/Ref in notes without duplicating existing entries */
function upsertWaybillRef(notes?: string, value?: string): string | undefined {
  const base = (notes ?? "")
    .split("|")
    .map((t) => t.trim())
    .filter(Boolean);
  const filtered = base.filter((t) => !/^waybill\/ref:/i.test(t));
  const next = value ? [...filtered, `Waybill/Ref: ${value}`] : filtered;
  return next.length ? next.join(" | ") : undefined;
}
/** parse "(20%)" from a label if numeric price isn't present */
function parsePercentFromLabel(label?: string): number {
  if (!label) return 0;
  const m = label.match(/\((\d+(?:\.\d+)?)%\)/);
  return m ? Number(m[1]) : 0;
}

/* UI line shape */
type Line = { productId: string; qty: number; price: number; taxId: string };

/* -------------------- Page -------------------- */
export default function EditQuotationPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  // Permissions
  const canUpdate = useHasPermission(
    ENTITY_PERMS.quotations?.update ?? "quotations.update"
  );

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  // Dropdowns (DDOption may carry .price: number)
  const [jobFiles, setJobFiles] = React.useState<DDOption[]>([]);
  const [serviceDetails, setServiceDetails] = React.useState<DDOption[]>([]);
  const [clients, setClients] = React.useState<DDOption[]>([]);
  const [products, setProducts] = React.useState<DDOption[]>([]);
  const [taxes, setTaxes] = React.useState<DDOption[]>([]);

  // Import/Export options
  const importSub = React.useMemo(
    () => serviceDetails.find((s) => (s.label ?? "").toLowerCase() === "import"),
    [serviceDetails]
  );
  const exportSub = React.useMemo(
    () => serviceDetails.find((s) => (s.label ?? "").toLowerCase() === "export"),
    [serviceDetails]
  );

  const productsEn = React.useMemo(
    () =>
      products.map((p) => {
        const m = p.label.match(/^(.*?)\s*\((.*?)\)\s*$/);
        const en = m ? m[1] : p.label;
        return { ...p, label: en } as DDOption;
      }),
    [products]
  );
  const productsAr = React.useMemo(
    () =>
      products.map((p) => {
        const m = p.label.match(/^(.*?)\s*\((.*?)\)\s*$/);
        const ar = m ? m[2] : p.label;
        return { ...p, label: ar } as DDOption;
      }),
    [products]
  );

  // Quotation state
  const [jobFile, setJobFile] = React.useState<string>(""); // read-only
  const [customer, setCustomer] = React.useState<string>(""); // read-only
  const [validUntil, setValidUntil] = React.useState("");

  // BOTH import & export allowed
  const [typeImport, setTypeImport] = React.useState(false);
  const [typeExport, setTypeExport] = React.useState(false);
  const showRest = jobFile !== "" && (typeImport || typeExport);

  // keep original service detail ids to hydrate AFTER service details arrive
  const [invServiceDetailIds, setInvServiceDetailIds] = React.useState<string[]>([]);

  const selectedJobFileLabel = React.useMemo(
    () => jobFiles.find((c) => c.value === jobFile)?.label,
    [jobFiles, jobFile]
  );
  const mblDynamicLabel = billLabelForJobFile(selectedJobFileLabel);

  // Shipment details
  const [shipper, setShipper] = React.useState("");
  const [consignee, setConsignee] = React.useState("");
  const [pieces, setPieces] = React.useState("");
  const [weightVol, setWeightVol] = React.useState("");
  const [cargoDesc, setCargoDesc] = React.useState("");
  const [mbl, setMbl] = React.useState("");
  const [loadingPlace, setLoadingPlace] = React.useState("");
  const [departureDate, setDepartureDate] = React.useState("");
  const [destination, setDestination] = React.useState("");
  const [arrivalDate, setArrivalDate] = React.useState("");
  const [finalDestination, setFinalDestination] = React.useState("");
  const [notes, setNotes] = React.useState("");

  const canCreateProduct = useHasPermission(
    ENTITY_PERMS.products?.create ?? "products.create"
  );
  const [prodFormOpen, setProdFormOpen] = React.useState(false);
  const [prodFormIndex, setProdFormIndex] = React.useState<number | null>(null);
  const jobFileOptsForProdForm = React.useMemo(
    () => jobFiles.map((j) => ({ id: String(j.value), title: String(j.label) })),
    [jobFiles]
  );
  async function onCreateProduct(payload: ProductFormValue) {
    try {
      const created: any = await createProduct(payload);
      const en = payload.title_en?.trim() || created?.translations?.en?.title || "";
      const ar = payload.title_ar?.trim() || created?.translations?.ar?.title || "";
      const label = en && ar ? `${en} (${ar})` : (en || ar || "");
      const value = String(created?.id || "");
      const price = Number(created?.price ?? payload.price ?? 0);
      if (value && label) {
        const opt: DDOption = { value, label, price };
        setProducts((prev) => [opt, ...prev]);
        if (prodFormIndex != null) {
          updateLine(prodFormIndex, { productId: value, price });
        }
      }
      setProdFormOpen(false);
      setProdFormIndex(null);
      toast.success("Product created");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to create product");
    }
  }

  // Lines
  const [lines, setLines] = React.useState<Line[]>([
    { productId: "", qty: 1, price: 0, taxId: "none" },
  ]);

  // FE-only tax rate resolver (percent / 100). Uses taxes.price (preferred), else parses from label.
  const taxRateFor = React.useCallback(
    (id: string) => {
      if (!id || id === "none") return 0;
      const t = taxes.find((x) => x.value === id);
      const pct =
        typeof t?.price === "number" ? t.price : parsePercentFromLabel(t?.label);
      return (pct || 0) / 100;
    },
    [taxes]
  );

  const { subTotal, taxTotal, grandTotal } = React.useMemo(() => {
    const sub = lines.reduce(
      (s, l) => s + (l.qty || 0) * (l.price || 0),
      0
    );
    const tax = lines.reduce(
      (s, l) => s + (l.qty || 0) * (l.price || 0) * taxRateFor(l.taxId),
      0
    );
    return { subTotal: sub, taxTotal: tax, grandTotal: sub + tax };
  }, [lines, taxRateFor]);

  const updateLine = (idx: number, patch: Partial<Line>) =>
    setLines((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  const addLine = () =>
    setLines((prev) => [
      ...prev,
      { productId: "", qty: 1, price: 0, taxId: "none" },
    ]);
  const removeLine = (idx: number) =>
    setLines((prev) => prev.filter((_, i) => i !== idx));

  // Load dropdowns + quotation (phase 1: store raw subs; don't set toggles yet)
  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const dds = await loadAllDropdowns();
        setJobFiles(dds.jobFiles);
        setServiceDetails(dds.serviceDetails);
        setProducts(dds.products); // each product may include price (unit price)
        setClients(dds.clients);
        setTaxes(dds.taxes); // tax option may include price (percent)

        if (!id) throw new Error("Missing id");
        const q: any = await getQuotationById(id);

        // ✅ Job file ko ab backend ke "category" se hydrate karo
        setJobFile(
          String(
            q?.category?.id ??
              q?.jobFile?.id ??
              q?.job_file?.id ??
              q?.job_file_id ??
              q?.jobFileId ??
              ""
          )
        );

        setCustomer(String(q?.customer?.id ?? ""));
        setValidUntil(
          q?.valid_until ? String(q.valid_until).slice(0, 10) : ""
        );

        // keep service detail ids; hydrate after import/export options are computed
        const subs: string[] = (q?.service_details ?? []).map((s: any) =>
          String(s?.id || s)
        );
        setInvServiceDetailIds(subs);

        setShipper(q?.shipper_name ?? "");
        setConsignee(q?.consignee_name ?? "");
        setPieces(
          q?.pieces_or_containers ? String(q.pieces_or_containers) : ""
        );
        setWeightVol(q?.weight_volume ?? "");
        setCargoDesc(q?.cargo_description ?? "");
        // Hydrate MBL from DB column, or fallback to notes if stored there
        const hydratedMbl =
          q?.master_bill_no ?? extractWaybillRef(q?.notes) ?? "";
        setMbl(hydratedMbl);
        setLoadingPlace(q?.loading_place ?? "");
        setDepartureDate(
          q?.departure_date ? String(q.departure_date).slice(0, 10) : ""
        );
        setDestination(q?.destination ?? "");
        setArrivalDate(
          q?.arrival_date ? String(q.arrival_date).slice(0, 10) : ""
        );
        setFinalDestination(q?.final_destination ?? "");
        setNotes(q?.notes ?? "");

        const mappedLines: Line[] = (q?.items ?? []).map((it: any) => ({
          productId: String(it?.product?.id ?? it?.product_id ?? ""),
          qty: Number(it?.quantity ?? 1),
          price: Number(it?.unit_price ?? 0),
          taxId: it?.tax?.id
            ? String(it.tax.id)
            : it?.tax_id
            ? String(it.tax_id)
            : "none",
        }));
        if (mappedLines.length) setLines(mappedLines);
      } catch (e: any) {
        console.error(e);
        toast.error(e?.response?.data?.message || "Failed to load quotation");
        router.push("/dashboard/quotations");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Phase 2: once service details (and import/export entries) are ready, set toggles
  React.useEffect(() => {
    if (!serviceDetails.length) return;
    const hasImport = importSub && invServiceDetailIds.includes(String(importSub.value));
    const hasExport = exportSub && invServiceDetailIds.includes(String(exportSub.value));
    setTypeImport(Boolean(hasImport));
    setTypeExport(Boolean(hasExport));
  }, [serviceDetails, importSub, exportSub, invServiceDetailIds]);

  async function onUpdate() {
    try {
      if (!id) return;

      const service_detail_ids: string[] = [
        ...(typeImport && importSub ? [String(importSub.value)] : []),
        ...(typeExport && exportSub ? [String(exportSub.value)] : []),
      ];

      const items = lines
        .filter((l) => l.productId && l.qty > 0)
        .map((l) => ({
          product_id: l.productId,
          tax_id: !l.taxId || l.taxId === "none" ? null : l.taxId,
          quantity: l.qty,
          unit_price: l.price,
        }));

      const basePayload = {
        id,
        service_detail_ids,
        valid_until: validUntil
          ? new Date(validUntil).toISOString()
          : undefined,
        shipper_name: shipper || undefined,
        consignee_name: consignee || undefined,
        pieces_or_containers: pieces ? Number(pieces) : undefined,
        weight_volume: weightVol || undefined,
        cargo_description: cargoDesc || undefined,
        loading_place: loadingPlace || undefined,
        departure_date: departureDate
          ? new Date(departureDate).toISOString()
          : undefined,
        destination: destination || undefined,
        arrival_date: arrivalDate
          ? new Date(arrivalDate).toISOString()
          : undefined,
        final_destination: finalDestination || undefined,
        notes: notes || undefined,
        items,
      } as UpdateQuotationInput;

      const payload: UpdateQuotationInput = {
        ...basePayload,
        master_bill_no: mbl || undefined,
      };

      setSaving(true);
      await updateQuotation(payload);
      toast.success("Quotation updated");
      router.push("/dashboard/quotations");
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to update quotation");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="group h-9 rounded-full border-muted-foreground/20 bg-background/60 px-3 text-xs font-medium text-muted-foreground shadow-sm hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
        >
          <ArrowLeft className="mr-1 h-4 w-4 transition-transform duration-150 group-hover:-translate-x-0.5" />
          <span className="hidden sm:inline">Back to Quotations</span>
          <span className="sm:hidden">Back</span>
        </Button>
        <div className="mt-6 text-muted-foreground">Loading quotation…</div>
      </div>
    );
  }

  return (
    <PermissionBoundary
      screen="/dashboard/quotations/[id]/edit"
      mode="block"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-full">
            <div className="flex justify-between gap-5 items-center">
              <h1 className="text-3xl font-bold">Edit Quotation</h1>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.back()}
                className="group h-9 rounded-full border-muted-foreground/20 bg-background/60 px-3 text-xs font-medium text-muted-foreground shadow-sm hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
              >
                <ArrowLeft className="mr-1 h-4 w-4 transition-transform duration-150 group-hover:-translate-x-0.5" />
                <span className="hidden sm:inline">Back to Quotations</span>
                <span className="sm:hidden">Back</span>
              </Button>
            </div>
            <p className="mt-1 text-muted-foreground">Update details and save changes</p>
          </div>
        </div>

        {/* Basic Information */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold">Basic Information</h2>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="validUntil">Valid Until</Label>
                <Input
                  id="validUntil"
                  type="date"
                  placeholder="mm/dd/yyyy"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category & Service Detail */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold">Job File &amp; Service Detail</h2>

            <div className="mt-6 grid gap-6">
              <div className="space-y-2 md:col-span-2 w-full min-w-0">
                <Label>Job File (read-only)</Label>
                <div className="w-full min-w-0">
                  <Select
                    value={jobFile}
                    onValueChange={() => {}}
                    disabled
                  >
                    <SelectTrigger className="h-11 !w-full min-w-0 items-center justify-between">
                      <SelectValue placeholder="Job File" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      sideOffset={6}
                      className="w-[--radix-select-trigger-width] max-w-[92vw] sm:max-w-none"
                    >
                      {jobFiles.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* BOTH checkboxes can be true */}
              <div className="space-y-2">
                <Label>Service Detail</Label>
                <div className="flex items-center gap-6">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <Checkbox
                      disabled={!importSub}
                      checked={typeImport}
                      onCheckedChange={(v) => setTypeImport(Boolean(v))}
                    />
                    Import
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <Checkbox
                      disabled={!exportSub}
                      checked={typeExport}
                      onCheckedChange={(v) => setTypeExport(Boolean(v))}
                    />
                    Export
                  </label>
                </div>
                {!importSub || !exportSub ? (
                  <p className="text-xs text-muted-foreground">
                    Tip: Ensure your <code>service details</code> include “import”
                    and “export”.
                  </p>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shipment Details */}
        {showRest && (
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold">Shipment Details</h2>

              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2 w-full min-w-0">
                  <Label>Customer (read-only)</Label>
                  <div className="w-full min-w-0">
                    <Select
                      value={customer}
                      onValueChange={() => {}}
                      disabled
                    >
                      <SelectTrigger className="h-11 !w-full min-w-0 items-center justify-between">
                        <SelectValue placeholder="Customer" />
                      </SelectTrigger>
                      <SelectContent
                        position="popper"
                        sideOffset={6}
                        className="w-[--radix-select-trigger-width] max-w-[92vw] sm:max-w-none"
                      >
                        {clients.map((cl) => (
                          <SelectItem key={cl.value} value={cl.value}>
                            {cl.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shipper">Shipper Name</Label>
                  <Input
                    id="shipper"
                    value={shipper}
                    onChange={(e) => setShipper(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="consignee">Consignee Name</Label>
                  <Input
                    id="consignee"
                    value={consignee}
                    onChange={(e) => setConsignee(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pieces">No. of Pcs / Containers</Label>
                  <Input
                    id="pieces"
                    value={pieces}
                    onChange={(e) => setPieces(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wv">Weight &amp; Volume</Label>
                  <Input
                    id="wv"
                    value={weightVol}
                    onChange={(e) => setWeightVol(e.target.value)}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="cargo">Cargo Description</Label>
                  <Textarea
                    id="cargo"
                    value={cargoDesc}
                    onChange={(e) => setCargoDesc(e.target.value)}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="mbl">{mblDynamicLabel}</Label>
                  <Input
                    id="mbl"
                    value={mbl}
                    onChange={(e) => setMbl(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="loading">Loading Place</Label>
                  <Input
                    id="loading"
                    value={loadingPlace}
                    onChange={(e) => setLoadingPlace(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dep">Departure Date</Label>
                  <Input
                    id="dep"
                    type="date"
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dest">Destination</Label>
                  <Input
                    id="dest"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="arr">Arrival Date</Label>
                  <Input
                    id="arr"
                    type="date"
                    value={arrivalDate}
                    onChange={(e) => setArrivalDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="final">Final Destination</Label>
                  <Input
                    id="final"
                    value={finalDestination}
                    onChange={(e) =>
                      setFinalDestination(e.target.value)
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Products & Services */}
        {showRest && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  Products &amp; Services
                </h2>
                <Button size="sm" className="gap-2" onClick={addLine}>
                  <Plus className="h-4 w-4" />
                  Add Line
                </Button>
              </div>

              <div className="mt-6 space-y-4 rounded-lg border p-4">
                {lines.map((l, i) => {
                  const lineSub = (l.qty || 0) * (l.price || 0);
                  const lineTax = lineSub * taxRateFor(l.taxId);
                  const lineTotal = lineSub + lineTax;

                  return (
                    <div key={i} className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-5">
                        <div className="space-y-2">
                          <Label>Product (English)</Label>
                          <Select
                            value={l.productId}
                            onValueChange={(v) => {
                              if (v === "__create__") {
                                if (canCreateProduct) {
                                  setProdFormIndex(i);
                                  setProdFormOpen(true);
                                }
                                return;
                              }
                              const selected = products.find((p) => p.value === v);
                              updateLine(i, { productId: v, price: selected?.price ?? 0 });
                            }}
                          >
                            <SelectTrigger className="h-11 w-full">
                              <SelectValue placeholder="Select English name" />
                            </SelectTrigger>
                            <SelectContent>
                              {canCreateProduct && (
                                <SelectItem value="__create__" className="text-primary font-medium">
                                  <span className="inline-flex items-center gap-2">
                                    <Plus className="h-3.5 w-3.5" />
                                    Create Product…
                                  </span>
                                </SelectItem>
                              )}
                              {productsEn.map((p) => (
                                <SelectItem key={p.value} value={p.value}>
                                  {p.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>المنتج (Arabic)</Label>
                          <Select
                            value={l.productId}
                            onValueChange={(v) => {
                              if (v === "__create__") {
                                if (canCreateProduct) {
                                  setProdFormIndex(i);
                                  setProdFormOpen(true);
                                }
                                return;
                              }
                              const selected = products.find((p) => p.value === v);
                              updateLine(i, { productId: v, price: selected?.price ?? 0 });
                            }}
                          >
                            <SelectTrigger className="h-11 w-full">
                              <SelectValue placeholder="اختيار المنتج" />
                            </SelectTrigger>
                            <SelectContent>
                              {canCreateProduct && (
                                <SelectItem value="__create__" className="text-primary font-medium">
                                  <span className="inline-flex items-center gap-2">
                                    <Plus className="h-3.5 w-3.5" />
                                    Create Product…
                                  </span>
                                </SelectItem>
                              )}
                              {productsAr.map((p) => (
                                <SelectItem key={p.value} value={p.value}>
                                  <span dir="rtl">{p.label}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Quantity</Label>
                          <Input
                            className="w-full"
                            inputMode="numeric"
                            value={String(l.qty)}
                            onChange={(e) =>
                              updateLine(i, {
                                qty: Math.max(
                                  0,
                                  Number(e.target.value || 0)
                                ),
                              })
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Price</Label>
                          <Input
                            className="w-full"
                            inputMode="decimal"
                            value={String(l.price)}
                            onChange={(e) =>
                              updateLine(i, {
                                price: Math.max(
                                  0,
                                  Number(e.target.value || 0)
                                ),
                              })
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Tax</Label>
                          <Select
                            value={l.taxId}
                            onValueChange={(v) =>
                              updateLine(i, { taxId: v })
                            }
                          >
                            <SelectTrigger className="h-11 w-full">
                              <SelectValue placeholder="Select tax" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">
                                No tax
                              </SelectItem>
                              {taxes.map((t) => (
                                <SelectItem
                                  key={t.value}
                                  value={t.value}
                                >
                                  {t.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {l.taxId !== "none" && (
                            <p className="text-xs text-muted-foreground">
                              Applied:{" "}
                              {(taxRateFor(l.taxId) * 100).toFixed(2)}%
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3 text-sm">
                        <div>
                          <div className="text-muted-foreground">
                            Subtotal
                          </div>
                          <div className="font-semibold">
                            {money(lineSub)}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">
                            Tax Amount
                          </div>
                          <div className="font-semibold">
                            {money(lineTax)}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">
                            Total
                          </div>
                          <div className="font-semibold text-blue-600">
                            {money(lineTotal)}
                          </div>
                        </div>
                      </div>

                      {lines.length > 1 && (
                        <div className="pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeLine(i)}
                            className="text-destructive hover:text-destructive"
                          >
                            Remove
                          </Button>
                        </div>
                      )}

                      {i < lines.length - 1 && (
                        <div className="h-px w-full bg-muted" />
                      )}
                    </div>
                  );
                })}
                   <div className="mt-8">
                  <h3 className="text-lg font-semibold">Description</h3>
                  <div className="mt-3">
                    <Textarea
                      placeholder="Add any additional terms, conditions, or notes…"
                      rows={6}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-end gap-8 text-right">
                  <div>
                    <div className="text-muted-foreground text-sm">
                      Subtotal
                    </div>
                    <div className="font-semibold">
                      {money(subTotal)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-sm">
                      Tax Amount
                    </div>
                    <div className="font-semibold">
                      {money(taxTotal)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-sm">
                      Grand Total
                    </div>
                    <div className="text-2xl font-extrabold text-blue-600">
                      {money(grandTotal)}
                    </div>
                  </div>
                </div>

              
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/quotations")}
          >
            Cancel
          </Button>
          <Button
            onClick={onUpdate}
            disabled={saving || !canUpdate}
            title={!canUpdate ? "No permission to update" : undefined}
          >
            Save Changes
          </Button>
        </div>
      </div>
      {canCreateProduct && (
        <ProductFormDialog
          open={prodFormOpen}
          onOpenChange={(next) => {
            setProdFormOpen(Boolean(next));
            if (!next) setProdFormIndex(null);
          }}
          mode="create"
          jobFiles={jobFileOptsForProdForm}
          onSubmit={onCreateProduct}
        />
      )}
    </PermissionBoundary>
  );
}
