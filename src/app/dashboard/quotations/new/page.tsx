"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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

import api from "@/lib/api-client";
import { loadAllDropdowns, type DDOption } from "@/lib/dropdowns.api";
import PermissionBoundary from "@/components/permission-boundary";
import { ENTITY_PERMS } from "@/rbac/permissions-map";
import { useHasPermission } from "@/hooks/use-permission";

/* -------------------- API payload types -------------------- */
type QuotationItemInput = {
  product_id: string;
  tax_id?: string | null;
  quantity: number;
  unit_price: number;
};

type CreateQuotationInput = {
  customer_id: string;
  job_file_id: string;
  service_detail_ids: string[];
  valid_until: string;

  shipper_name?: string;
  consignee_name?: string;
  pieces_or_containers?: number;
  weight_volume?: string;
  cargo_description?: string;
  master_bill_no?: string | null;
  loading_place?: string;
  departure_date?: string;
  destination?: string;
  arrival_date?: string;
  final_destination?: string;
  notes?: string;

  items: QuotationItemInput[];
};

async function createQuotation(payload: CreateQuotationInput) {
  const { data } = await api.post("/quotations/create", payload);
  return data?.data;
}

/* -------------------- helpers -------------------- */
function money(n: number) {
  if (!isFinite(n)) return "$0.00";
  return `$${n.toFixed(2)}`;
}

/* Map job file label to dynamic Master Bill label */
function billLabelForJobFile(jobFileLabel?: string) {
  const k = (jobFileLabel ?? "").toLowerCase();
  if (k.includes("air")) return "Air Waybill No.";
  if (k.includes("overland") || k.includes("road") || k.includes("truck")) return "Truck Waybill No.";
  if (k.includes("broker")) return "Tracking No.";
  if (k.includes("sea") || k.includes("ocean")) return "Master Bill No.";
  return "Reference No.";
}

/* Try to parse "(20%)" from label if price field absent */
function parsePercentFromLabel(label?: string): number {
  if (!label) return 0;
  const m = label.match(/\((\d+(?:\.\d+)?)%\)/);
  return m ? Number(m[1]) : 0;
}

/* -------------------- Page -------------------- */
export default function NewQuotationPage() {
  const router = useRouter();
  // Permissions (must be inside component function body)
  const canCreate = useHasPermission(
    ENTITY_PERMS.quotations?.create ?? "quotations.create"
  );

  // Dropdown options as {label,value, price?}  (price for products = unit price, for taxes = percent)
  const [jobFiles, setJobFiles] = React.useState<DDOption[]>([]);
  const [serviceDetails, setServiceDetails] = React.useState<DDOption[]>([]);
  const [clients, setClients] = React.useState<DDOption[]>([]);
  const [products, setProducts] = React.useState<DDOption[]>([]);
  const [taxes, setTaxes] = React.useState<DDOption[]>([]);
  const [loadingLists, setLoadingLists] = React.useState(true);

  // Find import/export by label (case-insensitive)
  const importSub = React.useMemo(
    () => serviceDetails.find((s) => s.label?.toLowerCase() === "import"),
    [serviceDetails]
  );
  const exportSub = React.useMemo(
    () => serviceDetails.find((s) => s.label?.toLowerCase() === "export"),
    [serviceDetails]
  );

  // ===== Category & type (gates the rest) =====
  const [jobFile, setJobFile] = React.useState<string>("");
  // allow BOTH import & export simultaneously
  const [typeImport, setTypeImport] = React.useState(false);
  const [typeExport, setTypeExport] = React.useState(false);
  const showRest = jobFile !== "" && (typeImport || typeExport);

  // figure out selected category label for dynamic bill label
  const selectedJobFileLabel = React.useMemo(
    () => jobFiles.find((c) => c.value === jobFile)?.label,
    [jobFiles, jobFile]
  );
  const mblDynamicLabel = billLabelForJobFile(selectedJobFileLabel);

  // ===== Basic info =====
  const [validUntil, setValidUntil] = React.useState("");
  const [email, setEmail] = React.useState("");

  // ===== Shipment details =====
  const [shipper, setShipper] = React.useState("");
  const [consignee, setConsignee] = React.useState("");
  const [customer, setCustomer] = React.useState(""); // customer_id
  const [pieces, setPieces] = React.useState("");
  const [weightVol, setWeightVol] = React.useState("");
  const [cargoDesc, setCargoDesc] = React.useState("");
  const [mbl, setMbl] = React.useState("");
  const [loadingPlace, setLoadingPlace] = React.useState("");
  const [departureDate, setDepartureDate] = React.useState("");
  const [destination, setDestination] = React.useState("");
  const [arrivalDate, setArrivalDate] = React.useState("");
  const [finalDestination, setFinalDestination] = React.useState("");

  // ===== Line items =====
  type Line = { productId: string; qty: number; price: number; taxId: string };
  const [lines, setLines] = React.useState<Line[]>([
    { productId: "", qty: 1, price: 0, taxId: "none" },
  ]);

  // Tax rate resolver: FE-only (percent / 100). Uses taxes.price if present, else parses from label.
  const taxRateFor = React.useCallback(
    (id: string) => {
      if (!id || id === "none") return 0;
      const t = taxes.find((x) => x.value === id);
      const pct = typeof t?.price === "number" ? t.price : parsePercentFromLabel(t?.label);
      return (pct || 0) / 100;
    },
    [taxes]
  );

  const { subTotal, taxTotal, grandTotal } = React.useMemo(() => {
    const sub = lines.reduce((s, l) => s + (l.qty || 0) * (l.price || 0), 0);
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
    setLines((prev) => [...prev, { productId: "", qty: 1, price: 0, taxId: "none" }]);

  const removeLine = (idx: number) =>
    setLines((prev) => prev.filter((_, i) => i !== idx));

  // ===== Notes =====
  const [notes, setNotes] = React.useState("");

  // ===== Load dropdowns =====
  React.useEffect(() => {
    (async () => {
      try {
        setLoadingLists(true);
        const dds = await loadAllDropdowns();
        setJobFiles(dds.jobFiles);
        setServiceDetails(dds.serviceDetails);
        setProducts(dds.products); // includes price (unit price)
        setClients(dds.clients);
        setTaxes(dds.taxes);       // includes price (percent) if backend sends
      } catch (e: any) {
        console.error("dropdown load error", e);
        toast.error(
          e?.response?.data?.message ||
            "Failed to load dropdowns. Check NEXT_PUBLIC_API_URL and backend /dropdowns module."
        );
      } finally {
        setLoadingLists(false);
      }
    })();
  }, []);

  async function onSave() {
    try {
      if (!jobFile || !(typeImport || typeExport) || !customer) {
        toast.error("Select Job File, Import/Export and Customer first.");
        return;
      }
      if (!validUntil) {
        toast.error("Please select ‘Valid Until’ date.");
        return;
      }

      const items: QuotationItemInput[] = lines
        .filter((l) => l.productId && l.qty > 0)
        .map((l) => ({
          product_id: l.productId,
          tax_id: !l.taxId || l.taxId === "none" ? null : l.taxId, // send selected tax_id; amounts computed on FE
          quantity: l.qty,
          unit_price: l.price,
        }));
      if (items.length === 0) {
        toast.error("Add at least one line item.");
        return;
      }

      // BOTH import & export can be included
      const service_detail_ids: string[] = [
        ...(typeImport && importSub ? [importSub.value] : []),
        ...(typeExport && exportSub ? [exportSub.value] : []),
      ];
      if (service_detail_ids.length === 0) {
        toast.error("Import/Export service details not found on server.");
        return;
      }

      // Base payload; add master_bill_no ONLY when category is not Brokerage
      const basePayload = {
        customer_id: customer,
        job_file_id: jobFile,
        service_detail_ids,
        valid_until: new Date(validUntil).toISOString(),

        shipper_name: shipper || undefined,
        consignee_name: consignee || undefined,
        pieces_or_containers: pieces ? Number(pieces) : undefined,
        weight_volume: weightVol || undefined,
        cargo_description: cargoDesc || undefined,
        loading_place: loadingPlace || undefined,
        departure_date: departureDate ? new Date(departureDate).toISOString() : undefined,
        destination: destination || undefined,
        arrival_date: arrivalDate ? new Date(arrivalDate).toISOString() : undefined,
        final_destination: finalDestination || undefined,
        notes: notes || undefined,

        items,
      } as CreateQuotationInput;

      const payload: CreateQuotationInput = {
        ...basePayload,
        master_bill_no: mbl || undefined,
      };

      await createQuotation(payload);
      toast.success("Quotation created successfully");
      router.push("/dashboard/quotations");
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? "Failed to create quotation";
      toast.error(msg);
    }
  }

  return (
     <PermissionBoundary screen="/dashboard/quotations/new" mode="block">
       <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">


        <div className="w-full">
          <div className="flex justify-between gap-5 items-center">
              <h1 className="text-3xl font-bold">Create New Quotation</h1>
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
        
          <p className="mt-1 text-muted-foreground">
            Fill in the details to generate a quotation
          </p>
        </div>
      </div>

      {/* Basic Information */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold">Basic Information</h2>

          <div className="mt-6 grid gap-6 \">
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
              <Label>Select Job File</Label>

              <div className="w-full min-w-0">
                <Select
                  value={jobFile}
                  onValueChange={setJobFile}
                  disabled={loadingLists || jobFiles.length === 0}
                >
                  <SelectTrigger className="h-11 !w-full min-w-0 items-center justify-between">
                    <SelectValue placeholder={loadingLists ? "Loading…" : "Choose job file"} />
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

            <div className="space-y-2">
              <Label>Service Detail</Label>
              <div className="flex flex-wrap items-center gap-6">
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
                  Tip: Ensure your <code>service details</code> include “import” and “export”.
                </p>
              ) : null}
              {!showRest && (
                <p className="text-xs text-muted-foreground">
                  Select at least one service detail (Import and/or Export) to continue.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shipment Details (RENDER ONLY WHEN showRest) */}
      {showRest && (
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold">Shipment Details</h2>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="shipper">Shipper Name</Label>
                <Input
                  id="shipper"
                  placeholder="Enter shipper name"
                  value={shipper}
                  onChange={(e) => setShipper(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="consignee">Consignee Name</Label>
                <Input
                  id="consignee"
                  placeholder="Enter consignee name"
                  value={consignee}
                  onChange={(e) => setConsignee(e.target.value)}
                />
              </div>

              <div className="space-y-2 md:col-span-2 w-full min-w-0">
                <Label>Customer</Label>
                <div className="w-full min-w-0">
                  <Select
                    value={customer}
                    onValueChange={setCustomer}
                    disabled={loadingLists || clients.length === 0}
                  >
                    <SelectTrigger className="h-11 !w-full min-w-0 items-center justify-between">
                      <SelectValue placeholder={loadingLists ? "Loading…" : "Select customer"} />
                    </SelectTrigger>

                    <SelectContent
                      position="popper"
                      sideOffset={6}
                      className="w-[--radix-select-trigger-width] max-w-[92vw] sm:max-w-none"
                    >
                      {clients.map((cl) => (
                        <SelectItem key={cl.value} value={cl.value} className="text-sm sm:text-base">
                          {cl.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pieces">No. of Pcs / Containers</Label>
                <Input
                  id="pieces"
                  placeholder="Enter number"
                  value={pieces}
                  onChange={(e) => setPieces(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wv">Weight &amp; Volume</Label>
                <Input
                  id="wv"
                  placeholder="e.g., 500kg / 2cbm"
                  value={weightVol}
                  onChange={(e) => setWeightVol(e.target.value)}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="cargo">Cargo Description</Label>
                <Textarea
                  id="cargo"
                  placeholder="Describe the cargo"
                  value={cargoDesc}
                  onChange={(e) => setCargoDesc(e.target.value)}
                />
              </div>

              {/* Dynamic Master Bill label */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="mbl">{mblDynamicLabel}</Label>
                <Input
                  id="mbl"
                  placeholder="Enter tracking/reference number"
                  value={mbl}
                  onChange={(e) => setMbl(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="loading">Loading Place</Label>
                <Input
                  id="loading"
                  placeholder="Enter loading place"
                  value={loadingPlace}
                  onChange={(e) => setLoadingPlace(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dep">Departure Date</Label>
                <Input
                  id="dep"
                  type="date"
                  placeholder="mm/dd/yyyy"
                  value={departureDate}
                  onChange={(e) => setDepartureDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dest">Destination</Label>
                <Input
                  id="dest"
                  placeholder="Enter destination"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="arr">Arrival Date</Label>
                <Input
                  id="arr"
                  type="date"
                  placeholder="mm/dd/yyyy"
                  value={arrivalDate}
                  onChange={(e) => setArrivalDate(e.target.value)}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="final">Final Destination</Label>
                <Input
                  id="final"
                  placeholder="Enter final destination"
                  value={finalDestination}
                  onChange={(e) => setFinalDestination(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Products & Services (RENDER ONLY WHEN showRest) */}
      {showRest && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Products &amp; Services</h2>
              <Button size="sm" className="gap-2" onClick={addLine}>
                <Plus className="h-4 w-4" />
                Add Line
              </Button>
            </div>

            <div className="mt-6 space-y-4 rounded-lg border p-4">
              {lines.map((l, i) => {
                const lineSub = (l.qty || 0) * (l.price || 0);
                const lineTax = lineSub * taxRateFor(l.taxId); // FE-only tax calc
                const lineTotal = lineSub + lineTax;

                return (
                  <div key={i} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-4">
                      <div className="space-y-2 md:col-span-1">
                        <Label>Product/Service</Label>
                        <Select
                          value={l.productId}
                          onValueChange={(v) => {
                            const selected = products.find((p) => p.value === v);
                            // Auto-fill unit price from product dropdown (fallback 0)
                            updateLine(i, { productId: v, price: selected?.price ?? 0 });
                          }}
                          disabled={loadingLists || products.length === 0}
                        >
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder={loadingLists ? "Loading…" : "Select product"} />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((p) => (
                              <SelectItem key={p.value} value={p.value}>
                                {p.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Quantity</Label>
                        <Input
                          inputMode="numeric"
                          value={String(l.qty)}
                          onChange={(e) =>
                            updateLine(i, { qty: Math.max(0, Number(e.target.value || 0)) })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Price</Label>
                        <Input
                          inputMode="decimal"
                          value={String(l.price)}
                          onChange={(e) =>
                            updateLine(i, { price: Math.max(0, Number(e.target.value || 0)) })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Tax</Label>
                        <Select
                          value={l.taxId}
                          onValueChange={(v) => updateLine(i, { taxId: v })}
                          disabled={loadingLists}
                        >
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder={loadingLists ? "Loading…" : "Select tax"} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No tax</SelectItem>
                            {taxes.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {/* Optional: small hint showing applied rate */}
                        {l.taxId !== "none" && (
                          <p className="text-xs text-muted-foreground">
                            Applied: {(taxRateFor(l.taxId) * 100).toFixed(2)}%
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3 text-sm">
                      <div>
                        <div className="text-muted-foreground">Subtotal</div>
                        <div className="font-semibold">{money(lineSub)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Tax Amount</div>
                        <div className="font-semibold">{money(lineTax)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Total</div>
                        <div className="font-semibold text-blue-600">{money(lineTotal)}</div>
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

                    {i < lines.length - 1 && <div className="h-px w-full bg-muted" />}
                  </div>
                );
              })}

              <div className="mt-4 flex items-center justify-end gap-8 text-right">
                <div>
                  <div className="text-muted-foreground text-sm">Subtotal</div>
                  <div className="font-semibold">{money(subTotal)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-sm">Tax Amount</div>
                  <div className="font-semibold">{money(taxTotal)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-sm">Grand Total</div>
                  <div className="text-2xl font-extrabold text-blue-600">{money(grandTotal)}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Notes (RENDER ONLY WHEN showRest) */}
      {showRest && (
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold">Additional Notes</h2>
            <div className="mt-4">
              <Textarea
                placeholder="Add any additional terms, conditions, or notes…"
                rows={6}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.push("/dashboard/quotations")}>
          Cancel
        </Button>
        <Button onClick={onSave} disabled={loadingLists || !canCreate} title={!canCreate ? "No permission to create" : undefined}>
          Save Quotation
        </Button>
      </div>
    </div>
     </PermissionBoundary>
   
  );
}
