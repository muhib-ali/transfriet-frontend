// src/app/dashboard/invoices/[id]/edit/page.tsx
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
import {
  getInvoiceById,
  updateInvoice,
  type UpdateInvoiceInput,
} from "@/lib/invoices.api";
import PermissionBoundary from "@/components/permission-boundary";
import { ENTITY_PERMS } from "@/rbac/permissions-map";
import { useHasPermission } from "@/hooks/use-permission";

function money(n: number) {
  if (!isFinite(n)) return "$0.00";
  return `$${n.toFixed(2)}`;
}

function parsePercentFromLabel(label?: string): number {
  if (!label) return 0;
  const m = label.match(/\((\d+(?:\.\d+)?)%\)/);
  return m ? Number(m[1]) : 0;
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

type Line = { productId: string; qty: number; price: number; taxId: string };

export default function EditInvoicePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const canUpdate = useHasPermission(
    ENTITY_PERMS.invoices?.update ?? "invoices.update"
  );

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const [jobFiles, setJobFiles] = React.useState<DDOption[]>([]);
  const [subcategories, setSubcategories] = React.useState<DDOption[]>([]);
  const [clients, setClients] = React.useState<DDOption[]>([]);
  const [products, setProducts] = React.useState<DDOption[]>([]);
  const [taxes, setTaxes] = React.useState<DDOption[]>([]);

  const importSub = React.useMemo(
    () => subcategories.find((s) => s.label?.toLowerCase() === "import"),
    [subcategories]
  );
  const exportSub = React.useMemo(
    () => subcategories.find((s) => s.label?.toLowerCase() === "export"),
    [subcategories]
  );

  const [jobFile, setJobFile] = React.useState<string>("");
  const [customer, setCustomer] = React.useState<string>("");
  const [validUntil, setValidUntil] = React.useState("");

  const [typeImport, setTypeImport] = React.useState(false);
  const [typeExport, setTypeExport] = React.useState(false);
  const showRest = jobFile !== "" && (typeImport || typeExport);

  // keep original subcategory ids to hydrate AFTER subcategories arrive (race fix)
  const [invSubIds, setInvSubIds] = React.useState<string[]>([]);

  const selectedJobFileLabel = React.useMemo(
    () => jobFiles.find((c) => c.value === jobFile)?.label ?? "",
    [jobFiles, jobFile]
  );

  const waybillLabel = React.useMemo(() => {
    const l = selectedJobFileLabel.toLowerCase().trim();
    if (l.includes("air")) return "Air Waybill No.";
    if (l.includes("overland") || l.includes("road") || l.includes("truck"))
      return "Truck Waybill No.";
    if (l.includes("broker")) return "Tracking No.";
    if (l.includes("sea") || l.includes("ocean") || l.includes("freight"))
      return "Master Bill No.";
    return "Reference No.";
  }, [selectedJobFileLabel]);

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

  const [lines, setLines] = React.useState<Line[]>([
    { productId: "", qty: 1, price: 0, taxId: "none" },
  ]);

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

  const updateLine = (i: number, patch: Partial<Line>) =>
    setLines((prev) => {
      const n = [...prev];
      n[i] = { ...n[i], ...patch };
      return n;
    });

  const addLine = () =>
    setLines((prev) => [
      ...prev,
      { productId: "", qty: 1, price: 0, taxId: "none" },
    ]);

  const removeLine = (idx: number) =>
    setLines((prev) => prev.filter((_, i) => i !== idx));

  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const dds = await loadAllDropdowns();
        setJobFiles(dds.jobFiles);
        setSubcategories(dds.subcategories);
        setProducts(dds.products); // expects {label,value,price}
        setClients(dds.clients);
        setTaxes(dds.taxes); // expects {label,value,price(percent)}

        if (!id) throw new Error("Missing id");
        const inv = await getInvoiceById(id);

        // ✅ jobFile ko normalize karke set kar rahe hain
        setJobFile(
          String(
            (inv as any)?.jobFile?.id ??
              (inv as any)?.job_file?.id ??
              (inv as any)?.category?.id ??
              (inv as any)?.job_file_id ??
              (inv as any)?.jobFileId ??
              ""
          )
        );

        setCustomer(
          String(
            (inv as any)?.customer?.id ??
              (inv as any)?.customer_id ??
              ""
          )
        );
        setValidUntil(
          (inv as any)?.valid_until
            ? String((inv as any).valid_until).slice(0, 10)
            : ""
        );

        const subs: string[] = ((inv as any)?.subcategories ?? []).map(
          (s: any) => String(s?.id || s)
        );
        setInvSubIds(subs);

        setShipper((inv as any)?.shipper_name ?? "");
        setConsignee((inv as any)?.consignee_name ?? "");
        setPieces(
          (inv as any)?.pieces_or_containers
            ? String((inv as any).pieces_or_containers)
            : ""
        );
        setWeightVol((inv as any)?.weight_volume ?? "");
        setCargoDesc((inv as any)?.cargo_description ?? "");

        // Hydrate MBL from DB column, or fallback to notes if stored there
        const hydratedMbl =
          (inv as any)?.master_bill_no ??
          extractWaybillRef((inv as any)?.notes) ??
          "";
        setMbl(hydratedMbl);

        setLoadingPlace((inv as any)?.loading_place ?? "");
        setDepartureDate(
          (inv as any)?.departure_date
            ? String((inv as any).departure_date).slice(0, 10)
            : ""
        );
        setDestination((inv as any)?.destination ?? "");
        setArrivalDate(
          (inv as any)?.arrival_date
            ? String((inv as any).arrival_date).slice(0, 10)
            : ""
        );
        setFinalDestination((inv as any)?.final_destination ?? "");
        setNotes((inv as any)?.notes ?? "");

        const mappedLines: Line[] = ((inv as any)?.items ?? []).map(
          (it: any) => ({
            productId: String(it?.product?.id ?? it?.product_id ?? ""),
            qty: Number(it?.quantity ?? 1),
            price: Number(it?.unit_price ?? 0),
            taxId: it?.tax?.id
              ? String(it.tax.id)
              : it?.tax_id
              ? String(it.tax_id)
              : "none",
          })
        );
        if (mappedLines.length) setLines(mappedLines);
      } catch (e: any) {
        console.error(e);
        toast.error(
          e?.response?.data?.message || "Failed to load invoice"
        );
        router.push("/dashboard/invoices");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  React.useEffect(() => {
    if (!subcategories.length) return;
    const hasImport =
      importSub && invSubIds.includes(String(importSub.value));
    const hasExport =
      exportSub && invSubIds.includes(String(exportSub.value));
    setTypeImport(Boolean(hasImport));
    setTypeExport(Boolean(hasExport));
  }, [subcategories, importSub, exportSub, invSubIds]);

  async function onUpdate() {
    try {
      if (!id) return;

      const subcategory_ids: string[] = [
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

      const basePayload: UpdateInvoiceInput = {
        id,
        subcategory_ids,
        valid_until: validUntil
          ? new Date(validUntil).toISOString()
          : undefined,
        shipper_name: shipper || undefined,
        consignee_name: consignee || undefined,
        pieces_or_containers: pieces
          ? Number(pieces)
          : undefined,
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
      };

      // Include master_bill_no only for Sea/Ocean; otherwise append value to notes
      const supportsMBL = waybillLabel === "Master Bill No.";
      const payload: UpdateInvoiceInput = supportsMBL
        ? { ...basePayload, master_bill_no: mbl || undefined }
        : {
            ...basePayload,
            // Avoid duplicating Waybill/Ref on repeated edits
            notes: upsertWaybillRef(basePayload.notes, mbl),
          };

      setSaving(true);
      await updateInvoice(payload);
      toast.success("Invoice updated");
      router.push("/dashboard/invoices");
    } catch (e: any) {
      console.error(e);
      toast.error(
        e?.response?.data?.message ?? "Failed to update invoice"
      );
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
          <span className="hidden sm:inline">Back to Invoices</span>
          <span className="sm:hidden">Back</span>
        </Button>
        <div className="mt-6 text-muted-foreground">
          Loading invoice…
        </div>
      </div>
    );
  }

  return (
    <PermissionBoundary
      screen="/dashboard/invoices/[id]/edit"
      mode="block"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="group h-9 rounded-full border-muted-foreground/20 bg-background/60 px-3 text-xs font-medium text-muted-foreground shadow-sm hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
          >
            <ArrowLeft className="mr-1 h-4 w-4 transition-transform duration-150 group-hover:-translate-x-0.5" />
            <span className="hidden sm:inline">Back to Invoices</span>
            <span className="sm:hidden">Back</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Edit Invoice</h1>
            <p className="mt-1 text-muted-foreground">
              Update details and save changes
            </p>
          </div>
        </div>

        {/* Basic Information */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold">
              Basic Information
            </h2>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="validUntil">Valid Until</Label>
                <Input
                  id="validUntil"
                  type="date"
                  placeholder="mm/dd/yyyy"
                  value={validUntil}
                  onChange={(e) =>
                    setValidUntil(e.target.value)
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category & Subcategory */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold">
              Job File &amp; Subcategory
            </h2>
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
                        <SelectItem
                          key={c.value}
                          value={c.value}
                        >
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Subcategory</Label>
                <div className="flex items-center gap-6">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <Checkbox
                      disabled={!importSub}
                      checked={typeImport}
                      onCheckedChange={(v) =>
                        setTypeImport(Boolean(v))
                      }
                    />
                    Import
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <Checkbox
                      disabled={!exportSub}
                      checked={typeExport}
                      onCheckedChange={(v) =>
                        setTypeExport(Boolean(v))
                      }
                    />
                    Export
                  </label>
                </div>
                {!importSub || !exportSub ? (
                  <p className="text-xs text-muted-foreground">
                    Tip: Ensure your <code>subcategories</code>{" "}
                    include “import” and “export”.
                  </p>
                ) : null}
                {!showRest && (
                  <p className="text-xs text-muted-foreground">
                    Select at least one: Import and/or Export.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer & Shipment */}
        {showRest && (
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold">
                Customer &amp; Shipment
              </h2>
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
                          <SelectItem
                            key={cl.value}
                            value={cl.value}
                          >
                            {cl.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shipper">
                    Shipper Name
                  </Label>
                  <Input
                    id="shipper"
                    value={shipper}
                    onChange={(e) =>
                      setShipper(e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="consignee">
                    Consignee Name
                  </Label>
                  <Input
                    id="consignee"
                    value={consignee}
                    onChange={(e) =>
                      setConsignee(e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pieces">
                    No. of Pcs / Containers
                  </Label>
                  <Input
                    id="pieces"
                    value={pieces}
                    onChange={(e) =>
                      setPieces(e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wv">
                    Weight &amp; Volume
                  </Label>
                  <Input
                    id="wv"
                    value={weightVol}
                    onChange={(e) =>
                      setWeightVol(e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="cargo">
                    Cargo Description
                  </Label>
                  <Textarea
                    id="cargo"
                    value={cargoDesc}
                    onChange={(e) =>
                      setCargoDesc(e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="mbl">{waybillLabel}</Label>
                  <Input
                    id="mbl"
                    placeholder={
                      waybillLabel === "Tracking No."
                        ? "Enter tracking number"
                        : `Enter ${waybillLabel.toLowerCase()}`
                    }
                    value={mbl}
                    onChange={(e) =>
                      setMbl(e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="loading">
                    Loading Place
                  </Label>
                  <Input
                    id="loading"
                    value={loadingPlace}
                    onChange={(e) =>
                      setLoadingPlace(e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dep">
                    Departure Date
                  </Label>
                  <Input
                    id="dep"
                    type="date"
                    value={departureDate}
                    onChange={(e) =>
                      setDepartureDate(e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dest">
                    Destination
                  </Label>
                  <Input
                    id="dest"
                    value={destination}
                    onChange={(e) =>
                      setDestination(e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="arr">
                    Arrival Date
                  </Label>
                  <Input
                    id="arr"
                    type="date"
                    value={arrivalDate}
                    onChange={(e) =>
                      setArrivalDate(e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="final">
                    Final Destination
                  </Label>
                  <Input
                    id="final"
                    value={finalDestination}
                    onChange={(e) =>
                      setFinalDestination(
                        e.target.value
                      )
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
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={addLine}
                >
                  <Plus className="h-4 w-4" />
                  Add Line
                </Button>
              </div>

              <div className="mt-6 space-y-4 rounded-lg border p-4">
                {lines.map((l, i) => {
                  const lineSub =
                    (l.qty || 0) * (l.price || 0);
                  const lineTax =
                    lineSub * taxRateFor(l.taxId);
                  const lineTotal = lineSub + lineTax;

                  return (
                    <div
                      key={i}
                      className="space-y-4"
                    >
                      <div className="grid gap-4 md:grid-cols-4">
                        <div className="space-y-2 md:col-span-1">
                          <Label>
                            Product/Service
                          </Label>
                          <Select
                            value={l.productId}
                            onValueChange={(v) => {
                              const selected =
                                products.find(
                                  (p) =>
                                    p.value === v
                                );
                              updateLine(i, {
                                productId: v,
                                price:
                                  selected?.price ??
                                  0,
                              });
                            }}
                            disabled={
                              products.length === 0
                            }
                          >
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map((p) => (
                                <SelectItem
                                  key={p.value}
                                  value={p.value}
                                >
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
                              updateLine(i, {
                                qty: Math.max(
                                  0,
                                  Number(
                                    e.target
                                      .value || 0
                                  )
                                ),
                              })
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Price</Label>
                          <Input
                            inputMode="decimal"
                            value={String(l.price)}
                            onChange={(e) =>
                              updateLine(i, {
                                price:
                                  Math.max(
                                    0,
                                    Number(
                                      e.target
                                        .value ||
                                        0
                                    )
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
                              updateLine(i, {
                                taxId: v,
                              })
                            }
                          >
                            <SelectTrigger className="h-11">
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
                              {(
                                taxRateFor(
                                  l.taxId
                                ) * 100
                              ).toFixed(2)}
                              %
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
                            onClick={() =>
                              removeLine(i)
                            }
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
            onClick={() =>
              router.push("/dashboard/invoices")
            }
          >
            Cancel
          </Button>
          <Button
            onClick={onUpdate}
            disabled={saving || !canUpdate}
            title={
              !canUpdate
                ? "No permission to update"
                : undefined
            }
          >
            Save Changes
          </Button>
        </div>
      </div>
    </PermissionBoundary>
  );
}
