"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, CheckCircle2, FileClock, XCircle, SendHorizontal } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import PermissionBoundary from "@/components/permission-boundary";
import { ENTITY_PERMS } from "@/rbac/permissions-map";
import { useHasPermission } from "@/hooks/use-permission";

import { getQuotationById } from "@/lib/quotations.api";
import { loadAllDropdowns, type DDOption } from "@/lib/dropdowns.api";

function money(n: number) {
  if (!isFinite(n)) return "$0.00";
  return `$${n.toFixed(2)}`;
}

function safeDate(d?: string | null) {
  if (!d) return "—";
  const t = Date.parse(d);
  return Number.isNaN(t) ? "—" : new Date(t).toLocaleDateString();
}

function parsePercentFromLabel(label?: string): number {
  if (!label) return 0;
  const m = label.match(/\((\d+(?:\.\d+)?)%\)/);
  return m ? Number(m[1]) : 0;
}

function extractWaybillRef(notes?: string): string {
  if (!notes) return "";
  const tokens = notes.split("|").map((t) => t.trim()).filter(Boolean);
  const hit = tokens.find((t) => /^waybill\/ref:\s*/i.test(t));
  return hit ? hit.replace(/^waybill\/ref:\s*/i, "").trim() : "";
}

function billLabelForJobFile(jobFileLabel?: string) {
  const k = (jobFileLabel ?? "").toLowerCase();
  if (k.includes("air")) return "Air Waybill No.";
  if (k.includes("overland") || k.includes("road") || k.includes("truck")) return "Truck Waybill No.";
  if (k.includes("broker")) return "Tracking No.";
  if (k.includes("sea") || k.includes("ocean")) return "Master Bill No.";
  return "Reference No.";
}

function StatusPill({ s }: { s: "pending" | "accepted" | "sent" | "rejected" }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    pending: { label: "Pending", cls: "bg-amber-500/10 text-amber-700 border-amber-500/20", icon: <FileClock className="h-3.5 w-3.5" /> },
    accepted: { label: "Accepted", cls: "bg-blue-500/10 text-blue-700 border-blue-500/20", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
    sent: { label: "Sent", cls: "bg-slate-500/10 text-slate-700 border-slate-500/20", icon: <SendHorizontal className="h-3.5 w-3.5" /> },
    rejected: { label: "Rejected", cls: "bg-red-500/10 text-red-700 border-red-500/20", icon: <XCircle className="h-3.5 w-3.5" /> },
  };
  const m = map[s];
  return <Badge variant="outline" className={`gap-1.5 px-3 ${m.cls}`}>{m.icon}{m.label}</Badge>;
}

export default function QuotationViewPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const canRead = useHasPermission(ENTITY_PERMS.quotations?.read ?? "quotations/getById");
  const canUpdate = useHasPermission(ENTITY_PERMS.quotations?.update ?? "quotations/update");

  const [loading, setLoading] = React.useState(true);
  const [q, setQ] = React.useState<any | null>(null);
  const [products, setProducts] = React.useState<DDOption[]>([]);
  const [taxes, setTaxes] = React.useState<DDOption[]>([]);
  const [jobFiles, setJobFiles] = React.useState<DDOption[]>([]);

  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        if (!id) throw new Error("Missing id");
        const [data, dds] = await Promise.all([
          getQuotationById(id),
          loadAllDropdowns(),
        ]);
        setQ(data);
        setProducts(dds.products || []);
        setTaxes(dds.taxes || []);
        setJobFiles(dds.jobFiles || []);
      } catch (e: any) {
        toast.error(e?.response?.data?.message || "Failed to load quotation");
        router.push("/dashboard/quotations");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const number = React.useMemo(() => q?.quote_number || q?.id || "—", [q]);
  const clientName = React.useMemo(() => q?.customer?.name || (q as any)?.client?.name || (q as any)?.client_name || "—", [q]);
  const created = React.useMemo(() => safeDate(q?.created_at), [q]);
  const validUntil = React.useMemo(() => safeDate(q?.valid_until), [q]);
  const status = React.useMemo(() => (q?.isInvoiceCreated ? "accepted" : "pending") as const, [q]);

  const jobFileLabel = React.useMemo(() => {
    const id = String(q?.category?.id ?? q?.jobFile?.id ?? q?.job_file?.id ?? q?.job_file_id ?? q?.jobFileId ?? "");
    const hit = jobFiles.find((j) => String(j.value) === id);
    return hit?.label || "";
  }, [q, jobFiles]);
  const waybillLabel = React.useMemo(() => billLabelForJobFile(jobFileLabel), [jobFileLabel]);

  const items = React.useMemo(() => {
    const prodMap: Record<string, string> = Object.fromEntries((products || []).map((p) => [String(p.value), String(p.label)]));
    const taxRateMap: Record<string, number> = Object.fromEntries((taxes || []).map((t) => [String(t.value), typeof t.price === "number" ? t.price : parsePercentFromLabel(t.label)]));

    const rows = (q?.items ?? []).map((it: any) => {
      const qty = Number(it?.quantity ?? 1);
      const price = Number(it?.unit_price ?? it?.price ?? 0);

      const pid = String(it?.product?.id ?? it?.product_id ?? "").trim();
      const title = it?.product?.title || it?.product?.label || it?.product?.name || it?.title || it?.product_title || (pid && prodMap[pid]) || (pid ? pid : "—");

      const taxId = String(it?.tax?.id ?? it?.tax_id ?? "").trim();
      const taxPct = taxId ? Number(taxRateMap[taxId] || 0) : 0;
      const tax = (qty * price * taxPct) / 100;
      const total = qty * price + tax;

      return { title, qty, price, tax, total };
    });
    return rows;
  }, [q, products, taxes]);

  const subTotal = React.useMemo(() => items.reduce((s, it) => s + it.qty * it.price, 0), [items]);
  const taxTotal = React.useMemo(() => items.reduce((s, it) => s + it.tax, 0), [items]);
  const grandTotal = React.useMemo(() => {
    const gt = Number(q?.grand_total ?? 0);
    return gt > 0 ? gt : subTotal + taxTotal;
  }, [q, subTotal, taxTotal]);

  const waybill = React.useMemo(() => (q as any)?.master_bill_no || (q as any)?.waybill || (q as any)?.ref_no || extractWaybillRef((q as any)?.notes) || "", [q]);

  const shipper = React.useMemo(() => (q as any)?.shipper_name || (q as any)?.shipper?.name || (q as any)?.shipper || "", [q]);
  const consignee = React.useMemo(() => (q as any)?.consignee_name || (q as any)?.consignee?.name || (q as any)?.consignee || "", [q]);
  const piecesOrContainers = React.useMemo(() => (q as any)?.pieces_or_containers ?? (q as any)?.pieces ?? (q as any)?.containers ?? (q as any)?.pcs ?? "", [q]);
  const weightVolume = React.useMemo(() => (q as any)?.weight_volume || (q as any)?.weight || (q as any)?.volume || "", [q]);
  const cargoDescription = React.useMemo(() => (q as any)?.cargo_description || (q as any)?.description || (q as any)?.cargo_desc || "", [q]);
  const loadingPlace = React.useMemo(() => (q as any)?.loading_place || (q as any)?.loading || (q as any)?.loading_port || (q as any)?.loading_place_from || "", [q]);
  const departureDate = React.useMemo(() => (q as any)?.departure_date || (q as any)?.departureDate || (q as any)?.depart_date || "", [q]);
  const destination = React.useMemo(() => (q as any)?.destination || (q as any)?.dest || (q as any)?.destination_port || "", [q]);
  const arrivalDate = React.useMemo(() => (q as any)?.arrival_date || (q as any)?.arrivalDate || (q as any)?.arrive_date || "", [q]);
  const finalDestination = React.useMemo(() => (q as any)?.final_destination || (q as any)?.finalDest || (q as any)?.final_destination_name || "", [q]);

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
    <PermissionBoundary screen="/dashboard/quotations/[id]" mode="block">
      <div className="space-y-6 pb-6">
        <div className="flex items-start gap-3">
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
          <div className="flex-1">
            <div>
            <h1 className="text-3xl font-bold">Quotation Details</h1>
            </div>

            <p className="mt-1 text-muted-foreground">#{number}</p>
          </div>
          <div className="flex gap-2">
            {canUpdate && (
              <Link href={`/dashboard/quotations/${id}/edit`}>
                <Button variant="outline" className="gap-2"><Pencil className="h-4 w-4" /> Edit</Button>
              </Link>
            )}
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <div className="text-xs text-muted-foreground">Client</div>
                <div className="font-semibold">{clientName}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Created</div>
                <div className="font-semibold">{created}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Valid Until</div>
                <div className="font-semibold">{validUntil}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Status</div>
                <div className="mt-1"><StatusPill s={status} /></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shipment</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-xs text-muted-foreground">Shipper</div>
              <div className="font-semibold">{shipper || "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Consignee</div>
              <div className="font-semibold">{consignee || "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Pieces/Containers</div>
              <div className="font-semibold">{piecesOrContainers !== "" ? piecesOrContainers : "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Weight & Volume</div>
              <div className="font-semibold">{weightVolume || "—"}</div>
            </div>
            <div className="sm:col-span-2">
              <div className="text-xs text-muted-foreground">Cargo Description</div>
              <div className="font-semibold">{cargoDescription || "—"}</div>
            </div>
            <div className="sm:col-span-2">
              <div className="text-xs text-muted-foreground">{waybillLabel}</div>
              <div className="font-semibold">{waybill || "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Loading Place</div>
              <div className="font-semibold">{loadingPlace || "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Departure Date</div>
              <div className="font-semibold">{safeDate(departureDate)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Destination</div>
              <div className="font-semibold">{destination || "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Arrival Date</div>
              <div className="font-semibold">{safeDate(arrivalDate)}</div>
            </div>
            <div className="sm:col-span-2">
              <div className="text-xs text-muted-foreground">Final Destination</div>
              <div className="font-semibold">{finalDestination || "—"}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border">
              <div className="w-full overflow-x-auto">
                <Table className="min-w-[720px]">
                  <TableHeader>
                    <TableRow className="bg-gray-200">
                      <TableHead className="rounded-tl-xl">Item</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Tax</TableHead>
                      <TableHead className="rounded-tr-xl">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="p-6 text-center text-muted-foreground">No items</TableCell>
                      </TableRow>
                    ) : (
                      items.map((it, i) => (
                        <TableRow key={i} className="odd:bg-muted/30 even:bg-white">
                          <TableCell className="font-medium">{it.title}</TableCell>
                          <TableCell>{it.qty}</TableCell>
                          <TableCell>{money(it.price)}</TableCell>
                          <TableCell>{money(it.tax)}</TableCell>
                          <TableCell className="font-semibold">{money(it.total)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground whitespace-pre-wrap">{(q as any)?.notes || "—"}</div>
          </CardContent>
        </Card>
      </div>
    </PermissionBoundary>
  );
}