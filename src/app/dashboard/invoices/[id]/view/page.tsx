"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download as DownloadIcon, Pencil, CheckCircle2, FileClock, XCircle, SendHorizontal } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import PermissionBoundary from "@/components/permission-boundary";
import { ENTITY_PERMS } from "@/rbac/permissions-map";
import { useHasPermission } from "@/hooks/use-permission";

import { getInvoiceById, type Invoice } from "@/lib/invoices.api";
import { loadAllDropdowns, type DDOption } from "@/lib/dropdowns.api";
import { downloadInvoicePdf } from "@/lib/invoice-pdf";

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
  const tokens = notes
    .split("|")
    .map((t) => t.trim())
    .filter(Boolean);
  const hit = tokens.find((t) => /^waybill\/ref:\s*/i.test(t));
  return hit ? hit.replace(/^waybill\/ref:\s*/i, "").trim() : "";
}

function StatusBadge({ s }: { s: "paid" | "pending" | "overdue" | "draft" }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    paid: { label: "Paid", cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
    pending: { label: "Pending", cls: "bg-amber-500/10 text-amber-700 border-amber-500/20", icon: <FileClock className="h-3.5 w-3.5" /> },
    overdue: { label: "Overdue", cls: "bg-red-500/10 text-red-700 border-red-500/20", icon: <XCircle className="h-3.5 w-3.5" /> },
    draft: { label: "Draft", cls: "bg-slate-500/10 text-slate-700 border-slate-500/20", icon: <SendHorizontal className="h-3.5 w-3.5" /> },
  };
  const m = map[s];
  return (
    <Badge variant="outline" className={`gap-1.5 px-3 ${m.cls}`}>{m.icon}{m.label}</Badge>
  );
}

export default function InvoiceViewPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const canRead = useHasPermission(ENTITY_PERMS.invoices?.read ?? "invoices.getById");
  const canUpdate = useHasPermission(ENTITY_PERMS.invoices?.update ?? "invoices.update");

  const [loading, setLoading] = React.useState(true);
  const [inv, setInv] = React.useState<Invoice | null>(null);
  const [products, setProducts] = React.useState<DDOption[]>([]);
  const [taxes, setTaxes] = React.useState<DDOption[]>([]);

  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        if (!id) throw new Error("Missing id");
        const [data, dds] = await Promise.all([
          getInvoiceById(id),
          loadAllDropdowns(),
        ]);
        setInv(data);
        setProducts(dds.products || []);
        setTaxes(dds.taxes || []);
      } catch (e: any) {
        toast.error(e?.response?.data?.message || "Failed to load invoice");
        router.push("/dashboard/invoices");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const number = React.useMemo(() => inv?.invoice_number || inv?.id || "—", [inv]);
  const clientName = React.useMemo(() => inv?.customer?.name || (inv as any)?.client?.name || (inv as any)?.client_name || "—", [inv]);
  const created = React.useMemo(() => safeDate(inv?.created_at), [inv]);
  const validUntil = React.useMemo(() => safeDate(inv?.valid_until), [inv]);
  const status = React.useMemo(() => {
    const d = inv?.valid_until;
    if (!d) return "pending" as const;
    const t = Date.parse(d);
    if (!Number.isNaN(t) && t < Date.now()) return "overdue" as const;
    return "pending" as const;
  }, [inv]);

  const items = React.useMemo(() => {
    const prodMap: Record<string, string> = Object.fromEntries(
      (products || []).map((p) => [String(p.value), String(p.label)])
    );
    const taxRateMap: Record<string, number> = Object.fromEntries(
      (taxes || []).map((t) => [
        String(t.value),
        typeof t.price === "number" ? t.price : parsePercentFromLabel(t.label),
      ])
    );

    const rows = (inv?.items ?? []).map((it: any) => {
      const qty = Number(it?.quantity ?? 1);
      const price = Number(it?.unit_price ?? 0);

      const pid = String(it?.product?.id ?? it?.product_id ?? "").trim();
      const title =
        it?.product?.title ||
        it?.product?.label ||
        it?.product?.name ||
        it?.title ||
        it?.product_title ||
        (pid && prodMap[pid]) ||
        (pid ? pid : "—");

      const taxId = String(it?.tax?.id ?? it?.tax_id ?? "").trim();
      const taxPct = taxId ? Number(taxRateMap[taxId] || 0) : 0;
      const tax = (qty * price * taxPct) / 100;
      const total = qty * price + tax;

      return { title, qty, price, tax, total };
    });
    return rows;
  }, [inv, products, taxes]);

  const subTotal = React.useMemo(() => items.reduce((s, it) => s + it.qty * it.price, 0), [items]);
  const taxTotal = React.useMemo(() => items.reduce((s, it) => s + it.tax, 0), [items]);
  const grandTotal = React.useMemo(() => {
    const gt = Number(inv?.grand_total ?? 0);
    return gt > 0 ? gt : subTotal + taxTotal;
  }, [inv, subTotal, taxTotal]);

  const waybill = React.useMemo(() => (inv as any)?.master_bill_no || (inv as any)?.waybill || (inv as any)?.ref_no || extractWaybillRef((inv as any)?.notes) || "", [inv]);

  const shipper = React.useMemo(() => (inv as any)?.shipper_name || (inv as any)?.shipper?.name || (inv as any)?.shipper || "", [inv]);
  const consignee = React.useMemo(() => (inv as any)?.consignee_name || (inv as any)?.consignee?.name || (inv as any)?.consignee || "", [inv]);
  const piecesOrContainers = React.useMemo(() => (inv as any)?.pieces_or_containers ?? (inv as any)?.pieces ?? (inv as any)?.containers ?? (inv as any)?.pcs ?? "", [inv]);
  const weightVolume = React.useMemo(() => (inv as any)?.weight_volume || (inv as any)?.weight || (inv as any)?.volume || "", [inv]);
  const cargoDescription = React.useMemo(() => (inv as any)?.cargo_description || (inv as any)?.description || (inv as any)?.cargo_desc || "", [inv]);
  const loadingPlace = React.useMemo(() => (inv as any)?.loading_place || (inv as any)?.loading || (inv as any)?.loading_port || (inv as any)?.loading_place_from || "", [inv]);
  const departureDate = React.useMemo(() => (inv as any)?.departure_date || (inv as any)?.departureDate || (inv as any)?.depart_date || "", [inv]);
  const destination = React.useMemo(() => (inv as any)?.destination || (inv as any)?.dest || (inv as any)?.destination_port || "", [inv]);
  const arrivalDate = React.useMemo(() => (inv as any)?.arrival_date || (inv as any)?.arrivalDate || (inv as any)?.arrive_date || "", [inv]);
  const finalDestination = React.useMemo(() => (inv as any)?.final_destination || (inv as any)?.finalDest || (inv as any)?.final_destination_name || "", [inv]);

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
        <div className="mt-6 text-muted-foreground">Loading invoice…</div>
      </div>
    );
  }

  return (
    <PermissionBoundary screen="/dashboard/invoices/[id]/view" mode="block">
      <div className="space-y-6 pb-6">
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
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Invoice Details</h1>
            <p className="mt-1 text-muted-foreground">#{number}</p>
          </div>
          <div className="flex gap-2">
            {canUpdate && (
              <Link href={`/dashboard/invoices/${id}/edit`}>
                <Button variant="outline" className="gap-2"><Pencil className="h-4 w-4" /> Edit</Button>
              </Link>
            )}
            {canRead && (
              <Button
                variant="default"
                className="gap-2"
                onClick={async () => {
                  try {
                    await downloadInvoicePdf({
                      number: number,
                      createdAt: inv?.created_at || new Date().toISOString(),
                      validUntil: inv?.valid_until || "",
                      shipper: shipper || "",
                      consignee: consignee || "",
                      destination: destination || "",
                      waybill: waybill || "",
                      items,
                      subTotal,
                      taxRate: items.length && items[0].tax > 0 ? Math.round((items[0].tax / (items[0].price * items[0].qty)) * 100) : 10,
                      taxTotal,
                      grandTotal,
                      clientName: inv?.customer?.name || "",
                      clientEmail: inv?.customer?.email || "",
                      companyName: "COMPANY Name",
                      companyAddress: "25, Your Company Address",
                      companyPhone: "00001231421",
                    });
                    toast.success("PDF exported");
                  } catch {
                    toast.error("PDF export failed");
                  }
                }}
              >
                <DownloadIcon className="h-4 w-4" /> Download
              </Button>
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
                <div className="mt-1"><StatusBadge s={status} /></div>
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
              <div className="text-xs text-muted-foreground">Waybill / Ref</div>
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
            <div className="text-sm text-muted-foreground whitespace-pre-wrap">{(inv as any)?.notes || "—"}</div>
          </CardContent>
        </Card>
      </div>
    </PermissionBoundary>
  );
}