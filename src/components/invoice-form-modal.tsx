// src/components/invoice-form-modal.tsx
"use client";

import * as React from "react";
import { ArrowLeft, Plus } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";

type Props = {
  /** Optional external trigger button (you’re already passing it from the page) */
  trigger?: React.ReactNode;
  /** Optional callback on save */
  onSaved?: (payload: any) => void | Promise<void>;
};

function money(n: number) {
  if (!isFinite(n)) return "$0.00";
  return `$${n.toFixed(2)}`;
}

export function InvoiceFormModal({ trigger, onSaved }: Props) {
  const [open, setOpen] = React.useState(false);

  // ------- Basic Info -------
  const defaultInvoiceNo = "INV-2024-009";
  const [invoiceNo, setInvoiceNo] = React.useState(defaultInvoiceNo);
  const [dueDate, setDueDate] = React.useState("");

  // ------- Category gating -------
  const [category, setCategory] = React.useState("");
  const [typeImport, setTypeImport] = React.useState(false);
  const [typeExport, setTypeExport] = React.useState(false);
  const showRest = category !== "" && (typeImport || typeExport);

  // ------- Shipment details (front-end only) -------
  const [shipper, setShipper] = React.useState("");
  const [consignee, setConsignee] = React.useState("");
  const [customer, setCustomer] = React.useState("");
  const [pieces, setPieces] = React.useState("");
  const [weightVol, setWeightVol] = React.useState("");
  const [cargoDesc, setCargoDesc] = React.useState("");
  const [mbl, setMbl] = React.useState("");
  const [loadingPlace, setLoadingPlace] = React.useState("");
  const [departureDate, setDepartureDate] = React.useState("");
  const [destination, setDestination] = React.useState("");
  const [arrivalDate, setArrivalDate] = React.useState("");
  const [finalDestination, setFinalDestination] = React.useState("");

  // ------- Line items -------
  type Line = { productId: string; qty: number; price: number; taxId: string };
  const [lines, setLines] = React.useState<Line[]>([
    { productId: "", qty: 1, price: 0, taxId: "" },
  ]);

  const taxes = React.useMemo(
    () => [
      { id: "vat12", title: "VAT 12%", rate: 0.12 },
      { id: "gst18", title: "GST 18%", rate: 0.18 },
      { id: "none", title: "No tax", rate: 0 },
    ],
    []
  );
  const taxRateFor = (id: string) => taxes.find((t) => t.id === id)?.rate ?? 0;

  const { subTotal, taxTotal, grandTotal } = React.useMemo(() => {
    const sub = lines.reduce((s, l) => s + (l.qty || 0) * (l.price || 0), 0);
    const tax = lines.reduce(
      (s, l) => s + (l.qty || 0) * (l.price || 0) * taxRateFor(l.taxId),
      0
    );
    return { subTotal: sub, taxTotal: tax, grandTotal: sub + tax };
  }, [lines]);

  const updateLine = (idx: number, patch: Partial<Line>) =>
    setLines((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });

  const addLine = () =>
    setLines((prev) => [...prev, { productId: "", qty: 1, price: 0, taxId: "" }]);

  const removeLine = (idx: number) =>
    setLines((prev) => prev.filter((_, i) => i !== idx));

  async function handleSave() {
    const payload = {
      invoiceNo,
      dueDate,
      category,
      type: typeImport ? "import" : typeExport ? "export" : null,
      shipment: {
        shipper,
        consignee,
        customer,
        pieces,
        weightVol,
        cargoDesc,
        mbl,
        loadingPlace,
        departureDate,
        destination,
        arrivalDate,
        finalDestination,
      },
      lines,
      totals: { subTotal, taxTotal, grandTotal },
      notes,
    };
    await onSaved?.(payload);
    setOpen(false);
  }

  const [notes, setNotes] = React.useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button className="gap-2">Create Invoice</Button>}
      </DialogTrigger>

      <DialogContent className="max-w-5xl max-h-[86vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Create New Invoice</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 p-6">
          {/* Basic Information */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold">Basic Information</h2>
              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="invNo">Invoice Number</Label>
                  <Input
                    id="invNo"
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="due">Due Date</Label>
                  <Input
                    id="due"
                    type="date"
                    placeholder="mm/dd/yyyy"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Category & Service Detail */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold">Category &amp; Service Detail</h2>

              <div className="mt-6 grid gap-6">
                <div className="space-y-2">
                  <Label>Select Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Choose category" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* swap with API values later */}
                      <SelectItem value="sea-freight">Sea Freight</SelectItem>
                      <SelectItem value="air-freight">Air Freight</SelectItem>
                      <SelectItem value="road-freight">Road Freight</SelectItem>
                      <SelectItem value="warehousing">Warehousing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Service Detail</Label>
                  <div className="flex items-center gap-6">
                    <label className="inline-flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={typeImport}
                        onCheckedChange={(v) => {
                          const b = Boolean(v);
                          setTypeImport(b);
                          if (b) setTypeExport(false);
                        }}
                      />
                      Import
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={typeExport}
                        onCheckedChange={(v) => {
                          const b = Boolean(v);
                          setTypeExport(b);
                          if (b) setTypeImport(false);
                        }}
                      />
                      Export
                    </label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipment Details */}
          <Card className={cn(showRest ? "" : "opacity-50 pointer-events-none")}>
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

                <div className="space-y-2 md:col-span-2">
                  <Label>Customer</Label>
                  <Select value={customer} onValueChange={setCustomer}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* mock values; wire to API later */}
                      <SelectItem value="acme">Acme Corporation</SelectItem>
                      <SelectItem value="global">Global Trade Co</SelectItem>
                      <SelectItem value="techstart">TechStart Inc</SelectItem>
                    </SelectContent>
                  </Select>
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

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="mbl">Master Bill No.</Label>
                  <Input
                    id="mbl"
                    placeholder="Enter tracking number"
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

          {/* Products & Services */}
          <Card className={cn(showRest ? "" : "opacity-50 pointer-events-none")}>
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
                  const lineTax = lineSub * taxRateFor(l.taxId);
                  const lineTotal = lineSub + lineTax;

                  return (
                    <div key={i} className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-4">
                        <div className="space-y-2 md:col-span-1">
                          <Label>Product/Service</Label>
                          <Select
                            value={l.productId}
                            onValueChange={(v) => updateLine(i, { productId: v })}
                          >
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                              {/* replace with API later */}
                              <SelectItem value="prod1">Sea Freight Handling</SelectItem>
                              <SelectItem value="prod2">Documentation</SelectItem>
                              <SelectItem value="prod3">Customs Clearance</SelectItem>
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
                                qty: Math.max(0, Number(e.target.value || 0)),
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
                                price: Math.max(0, Number(e.target.value || 0)),
                              })
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Tax</Label>
                          <Select
                            value={l.taxId}
                            onValueChange={(v) => updateLine(i, { taxId: v })}
                          >
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Select tax" />
                            </SelectTrigger>
                            <SelectContent>
                              {taxes.map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                  {t.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                    <div className="text-2xl font-extrabold text-blue-600">
                      {money(grandTotal)}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Notes */}
          <Card className={cn(showRest ? "" : "opacity-50 pointer-events-none")}>
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

          {/* Footer actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Invoice</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default InvoiceFormModal;
