"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { loadAllDropdowns } from "@/lib/dropdowns.api";

// import { getInvoiceById } from "@/lib/invoices.api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadInvoicePdf } from "@/lib/invoice-pdf";
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Download as DownloadIcon,
  Trash2,
  FileText,
  CheckCircle2,
  FileClock,
  XCircle,
  SendHorizontal,
  Pencil,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { createRoot } from "react-dom/client";
import { listInvoices, deleteInvoice, type InvoiceListItem, getInvoiceById } from "@/lib/invoices.api";
// PDF generation is now handled by downloadInvoicePdf
import PermissionBoundary from "@/components/permission-boundary";
import { ENTITY_PERMS } from "@/rbac/permissions-map";
import { useHasPermission } from "@/hooks/use-permission";

type Status = "paid" | "pending" | "overdue" | "draft";

function StatusPill({ s }: { s: Status }) {
  const map: Record<Status, { label: string; cls: string; icon: ReactNode }> = {
    paid:     { label: "Paid",    cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
    pending:  { label: "Pending", cls: "bg-amber-500/10  text-amber-700  border-amber-500/20",    icon: <FileClock className="h-3.5 w-3.5" /> },
    overdue:  { label: "Overdue", cls: "bg-red-500/10    text-red-700    border-red-500/20",      icon: <XCircle className="h-3.5 w-3.5" /> },
    draft:    { label: "Draft",   cls: "bg-slate-500/10  text-slate-700  border-slate-500/20",    icon: <SendHorizontal className="h-3.5 w-3.5" /> },
  };
  const m = map[s];
  return (
    <Badge variant="outline" className={`gap-1.5 px-3 ${m.cls}`}>
      {m.icon}
      {m.label}
    </Badge>
  );
}

function safeDate(d?: string | null) {
  if (!d) return "—";
  const t = Date.parse(d);
  return Number.isNaN(t) ? "—" : new Date(t).toLocaleDateString();
}

function money(v: string | number | null | undefined) {
  const n = typeof v === "string" ? Number(v) : v ?? 0;
  if (!isFinite(n as number)) return "$0.00";
  return `$${(n as number).toFixed(2)}`;
}

function deriveStatus(row: InvoiceListItem): Status {
  const explicit = (row as any)?.status as Status | undefined;
  if (explicit === "paid" || explicit === "pending" || explicit === "overdue" || explicit === "draft") {
    return explicit;
  }
  const now = Date.now();
  const due: string | null | undefined = (row as any)?.due ?? row.valid_until ?? null;
  if (due) {
    const t = Date.parse(due);
    if (!Number.isNaN(t) && t < now) return "overdue";
  }
  return "pending";
}

export default function InvoicesPage() {
  const router = useRouter();

  const canList   = useHasPermission(ENTITY_PERMS.invoices?.list   ?? "invoices.getAll");
  const canCreate = useHasPermission(ENTITY_PERMS.invoices?.create ?? "invoices.create");
  const canRead   = useHasPermission(ENTITY_PERMS.invoices?.read   ?? "invoices.getById");
  const canUpdate = useHasPermission(ENTITY_PERMS.invoices?.update ?? "invoices.update");
  const canDelete = useHasPermission(ENTITY_PERMS.invoices?.delete ?? "invoices.delete");

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | Status>("all");
  const [debouncedQ, setDebouncedQ] = useState("");

  const [rows, setRows] = useState<InvoiceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  // pagination (match quotations page style)
  const [page, setPage] = useState(1);
  const limit = 3; // fixed to mirror quotations page
  const [pagination, setPagination] = useState<any | null>(null);

  // Debounce user input to avoid hammering the API on each keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 400);
    return () => clearTimeout(t);
  }, [q]);

  // Load data; cancel in-flight requests when query/page changes
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        const search = debouncedQ || undefined;
        const { rows: list, pagination: pg } = await listInvoices(page, limit, search, { signal: ac.signal });
        setRows(list ?? []);
        setPagination(pg ?? null);
      } catch (e: any) {
        // Ignore aborted requests
        if (e?.code !== "ERR_CANCELED") {
          toast.error(e?.response?.data?.message || "Failed to load invoices");
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [page, debouncedQ]);

  // Reset to first page when search changes
  useEffect(() => {
    setPage(1);
  }, [q]);

  const stats = useMemo(() => {
    const total = rows.length;
    const paid = rows.filter((r) => deriveStatus(r) === "paid").length;
    const pending = rows.filter((r) => deriveStatus(r) === "pending").length;
    const overdue = rows.filter((r) => deriveStatus(r) === "overdue").length;
    return { total, paid, pending, overdue };
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const s = deriveStatus(r);
      return status === "all" || s === status;
    });
  }, [status, rows]);

  /* ---------------------- pagination helpers ---------------------- */
  const total = (pagination?.total as number | undefined) ?? rows.length;
  const currentPage = (pagination?.page as number | undefined) ?? page;
  const apiTotalPages = pagination?.totalPages as number | undefined;
  const computedTotalPages = Math.ceil((((pagination?.total ?? 0) as number) / limit));
  const totalPages = Math.max(1, apiTotalPages ?? (computedTotalPages || 1));
  const hasPrev = pagination ? Boolean(pagination.hasPrev) : currentPage > 1;
  const hasNext = pagination ? Boolean(pagination.hasNext) : currentPage < totalPages;
  const start = total === 0 ? 0 : (currentPage - 1) * limit + 1;
  const end = total === 0 ? 0 : Math.min(currentPage * limit, total);

  async function onDelete(r: InvoiceListItem) {
    const ok = window.confirm(`Delete invoice ${r.invoice_number || r.id}?`);
    if (!ok) return;
    try {
      await deleteInvoice(r.id);
      setRows((prev) => prev.filter((x) => x.id !== r.id));
      toast.success("Invoice deleted");
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Delete failed");
    }
  }

  function onView(r: InvoiceListItem) {
    toast.info(`Viewing ${r.invoice_number || r.id}`);
  }

 async function onDownload(r: InvoiceListItem) {
  try {
    // Get invoice data
    const inv = await getInvoiceById(r.id);

    // Get product mappings from dropdowns
    const { products: prodDD } = await loadAllDropdowns();
    const prodMap: Record<string, string> = Object.fromEntries(
      (prodDD || []).map((p) => [String(p.value), String(p.label)])
    );

    // Map items with titles and descriptions
    const mappedItems = (inv?.items ?? []).map((it: any) => {
      const pid = String(it?.product?.id ?? it?.product_id ?? "").trim();
      const title = it?.product?.title ?? 
                   it?.product?.name ?? 
                   it?.product_title ?? 
                   it?.title ?? 
                   (pid && prodMap[pid]) ?? 
                   (pid ? pid.slice(0, 8) : "—");
      
      const qty = Number(it?.quantity ?? 1);
      const price = Number(it?.unit_price ?? 0);
      const taxPct = Number(it?.tax?.price ?? it?.tax_rate ?? 0);
      const tax = (qty * price * taxPct) / 100;
      const total = qty * price + tax;

      return { 
        title, 
        description: it?.description || it?.cargo_description || "",
        qty, price, tax, total 
      };
    });

    // Calculate totals
    const subTotal = mappedItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const taxTotal = inv?.tax_total && Number(inv.tax_total) > 0 ? 
                    Number(inv.tax_total) : 
                    mappedItems.reduce((sum, item) => sum + item.tax, 0);
    
    // Calculate grand total
    let grandTotal = inv?.grand_total && Number(inv.grand_total) > 0 ? 
                    Number(inv.grand_total) : 
                    (subTotal || 0) + (taxTotal || 0);
    
    // Ensure grand total is never less than subtotal
    if (grandTotal < subTotal) grandTotal = subTotal;
    
    // Get tax rate
    const taxRate = mappedItems.length > 0 && mappedItems[0].tax > 0 ? 
                   Math.round((mappedItems[0].tax / (mappedItems[0].price * mappedItems[0].qty)) * 100) : 10;
    
    // Format dates
    const createdAt = inv?.created_at || new Date().toISOString();
    const validUntil = inv?.valid_until || "";
    
    // Generate PDF
    await downloadInvoicePdf({
      number: inv?.invoice_number || r.id,
      createdAt,
      validUntil,
      shipper: inv?.shipper_name || "",
      consignee: inv?.consignee_name || "",
      destination: inv?.destination || "",
      waybill: inv?.master_bill_no || "",
      items: mappedItems,
      subTotal, taxRate, taxTotal, grandTotal,
      clientName: inv?.customer?.name || "",
      clientEmail: inv?.customer?.email || "",
      companyName: "COMPANY Name",
      companyAddress: "25, Your Company Address",
      companyPhone: "00001231421"
    });
    
    toast.success("PDF exported");
  } catch (e: any) {
    console.error(e);
    toast.error("PDF export failed");
  }
}


  return (
    <PermissionBoundary screen="/dashboard/invoices" mode="block">
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Invoices</h1>
          <p className="mt-2 text-muted-foreground">Manage and track all your invoices in one place.</p>
        </div>
        {canCreate ? (
          <Link href="/dashboard/invoices/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Invoice
            </Button>
          </Link>
        ) : (
          <Button className="gap-2" disabled title="No permission to create">
            <Plus className="h-4 w-4" />
            Create Invoice
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Total Invoices" value={stats.total} icon={<FileText className="h-6 w-6" />} iconClass="bg-primary/10 text-primary" />
        <KpiCard title="Paid" value={stats.paid} icon={<CheckCircle2 className="h-6 w-6" />} iconClass="bg-emerald-500/10 text-emerald-600" />
        <KpiCard title="Pending" value={stats.pending} icon={<FileClock className="h-6 w-6" />} iconClass="bg-amber-500/10 text-amber-600" />
        <KpiCard title="Overdue" value={stats.overdue} icon={<XCircle className="h-6 w-6" />} iconClass="bg-red-500/10 text-red-600" />
      </div>

      <Card className="shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-2xl">All Invoices</CardTitle>
            <div className="flex gap-2">
              <div className="relative w-[350px] max-w-[50vw]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search invoices..."
                  className="h-9 pl-9"
                />
              </div>

              <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                <SelectTrigger className="h-11 w-40">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-6">
          {/* rounded corners kept; disable row hover; lock header hover */}
          <div className="mt-1 rounded-xl border overflow-hidden [&_tbody_tr:hover]:bg-transparent [&_thead_tr:hover]:bg-gray-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-200">
                  <TableHead className="rounded-tl-xl">Invoice #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10 rounded-tr-xl"></TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="p-8 text-center text-muted-foreground">Loading invoices…</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="p-8 text-center text-muted-foreground">No invoices found.</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((row, idx) => {
                    const id = row.invoice_number || row.id;
                    const clientName = row.customer?.name ?? "—";
                    const amount = money(row.grand_total);
                    const created = safeDate(row.created_at);
                    const due = safeDate((row as any)?.valid_until || (row as any)?.due);
                    const s = deriveStatus(row);
                    const isLast = idx === filtered.length - 1;

                    return (
                      <TableRow key={row.id} className="odd:bg-muted/30 even:bg-white hover:bg-transparent">
                        <TableCell className={`font-medium ${isLast ? "rounded-bl-xl" : ""}`}>{id}</TableCell>
                        <TableCell>
                          <div className="flex min-w-0 items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                                {clientName.split(" ").map((w) => w[0]).join("").slice(0, 2) || "CL"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="truncate font-medium">{clientName}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">{amount}</TableCell>
                        <TableCell className="text-muted-foreground">{created}</TableCell>
                        <TableCell className="text-muted-foreground">{due}</TableCell>
                        <TableCell>
                          <StatusPill s={s} />
                        </TableCell>
                        <TableCell className={`text-right ${isLast ? "rounded-br-xl" : ""}`}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              {canRead && (
                                <DropdownMenuItem onClick={() => onView(row)} className="cursor-pointer">
                                  <Eye className="mr-2 h-4 w-4" /> View
                                </DropdownMenuItem>
                              )}
                              {canUpdate && (
                                <DropdownMenuItem
                                  onClick={() => router.push(`/dashboard/invoices/${row.id}/edit`)}
                                  className="cursor-pointer"
                                >
                                  <Pencil className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                              )}
                              {canRead && (
                                <DropdownMenuItem onClick={() => onDownload(row)} className="cursor-pointer">
                                  <DownloadIcon className="mr-2 h-4 w-4" /> Download
                                </DropdownMenuItem>
                              )}
                              {canDelete && (
                                <DropdownMenuItem
                                  onClick={() => onDelete(row)}
                                  className="cursor-pointer text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              {`Showing ${start} to ${end} of ${total} invoices`}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!hasPrev || loading}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pgNum) => (
                  <Button
                    key={pgNum}
                    variant={currentPage === pgNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(pgNum)}
                    className="w-8 h-8 p-0"
                  >
                    {pgNum}
                  </Button>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasNext || loading}
                className="gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    </PermissionBoundary>
  );
}

function KpiCard({
  title, value, icon, iconClass,
}: { title: string; value: number | string; icon: ReactNode; iconClass: string; }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <div className="mt-2 text-3xl font-bold">{value}</div>
        </div>
        <div className={`rounded-xl p-3 ${iconClass}`}>{icon}</div>
      </CardContent>
    </Card>
  );
}
