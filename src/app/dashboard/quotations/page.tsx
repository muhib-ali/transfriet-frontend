// src/app/dashboard/quotations/page.tsx
"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Send,
  Pencil,
  Trash2,
  FileText,
  CheckCircle2,
  FileClock,
  XCircle,
  SendHorizontal,
  Loader2,
  Receipt as ReceiptIcon,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
} from "lucide-react";

import {
  listQuotations,
  deleteQuotation,
  getQuotationById,
} from "@/lib/quotations.api";

import {
  createInvoice,
  type CreateInvoiceFromQuotationInput,
  type InvoiceItemInput,
} from "@/lib/invoices.api";
import PermissionBoundary from "@/components/permission-boundary";
import { ENTITY_PERMS } from "@/rbac/permissions-map";
import { useHasPermission } from "@/hooks/use-permission";

/* ------------------------------------------------------------------ */
/* Types and helpers                                                   */
/* ------------------------------------------------------------------ */

type QStatus = "pending" | "accepted" | "sent" | "rejected";

function StatusPill({ s }: { s: QStatus }) {
  const map: Record<QStatus, { label: string; cls: string; icon: ReactNode }> = {
    pending: {
      label: "Pending",
      cls: "bg-amber-500/10 text-amber-700 border-amber-500/20",
      icon: <FileClock className="h-3.5 w-3.5" />,
    },
    accepted: {
      label: "Accepted",
      cls: "bg-blue-500/10 text-blue-700 border-blue-500/20",
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    },
    sent: {
      label: "Sent",
      cls: "bg-slate-500/10 text-slate-700 border-slate-500/20",
      icon: <SendHorizontal className="h-3.5 w-3.5" />,
    },
    rejected: {
      label: "Rejected",
      cls: "bg-red-500/10 text-red-700 border-red-500/20",
      icon: <XCircle className="h-3.5 w-3.5" />,
    },
  };
  const m = map[s];
  return (
    <Badge variant="outline" className={`gap-1.5 px-3 ${m.cls}`}>
      {m.icon}
      {m.label}
    </Badge>
  );
}

function money(v: string | number | null | undefined) {
  const n = typeof v === "string" ? Number(v) : v ?? 0;
  if (!isFinite(n as number)) return "$0.00";
  return `$${(n as number).toFixed(2)}`;
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function QuotationsPage() {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | QStatus>("all");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // backend data
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  // pagination (fixed limit; no dropdown)
  const [page, setPage] = useState(1);
  const limit = 3;
  const [pagination, setPagination] = useState<any | null>(null);

  // KPIs (derived)
  const stats = useMemo(() => {
    const totalCount = pagination?.total ?? rows.length;
    const accepted = rows.filter((r) => r.isInvoiceCreated).length;
    const pending = totalCount - accepted;
    const rejected = 0;
    return { total: totalCount, accepted, pending, rejected };
  }, [rows, pagination]);

  // Debounce user input to avoid hammering the API on each keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 400);
    return () => clearTimeout(t);
  }, [query]);

  // Load data; cancel in-flight requests when query/page changes
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        const search = debouncedQuery || undefined;
        const { rows: list, pagination: pg } = await listQuotations(
          page,
          limit,
          search,
          { signal: ac.signal }
        );
        setRows(list ?? []);
        setPagination(pg ?? null);
      } catch (e: any) {
        // Ignore aborted requests
        if (e?.code !== "ERR_CANCELED") {
          toast.error(e?.response?.data?.message || "Failed to load quotations");
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [page, debouncedQuery]);

  // Reset to first page when search changes
  useEffect(() => {
    setPage(1);
  }, [query]);

  const deriveStatus = (r: any): QStatus => {
    if (r?.isInvoiceCreated) return "accepted";
    return "pending";
  };

  const viewClient = (r: any) => {
    const id = r?.id;
    if (!id) return toast.error("Missing quotation id");
    router.push(`/dashboard/quotations/${encodeURIComponent(id)}`);
  };

  const editQuote = (r: any) => {
    const id = r?.id;
    if (!id) return toast.error("Missing quotation id");
    router.push(`/dashboard/quotations/${encodeURIComponent(id)}/edit`);
  };

  const sendToClient = (r: any) =>
    toast.success(`Sent ${r?.quote_number ?? r?.id} to client`);

  const convertToInvoice = async (r: any) => {
    if (convertingId) return;

    const qid = r?.id;
    if (!qid) {
      toast.error("Invalid quotation id.");
      return;
    }

    const coerceId = (v: any): string | undefined => {
      if (!v) return undefined;
      if (typeof v === "string" && v.trim() !== "") return v;
      if (typeof v === "number") return String(v);
      if (typeof v === "object" && v.id) return String(v.id);
      return undefined;
    };

    const pickId = (...vals: any[]): string | undefined => {
      for (const v of vals) {
        const id = coerceId(v);
        if (id) return id;
      }
      return undefined;
    };

    try {
      setConvertingId(qid);

      const q = await getQuotationById(qid);

      const customer_id: string | undefined = pickId(
        q?.customer,
        q?.customer_id,
        q?.customerId,
        q?.customer_id_fk,
        r?.customer,
        r?.customer_id,
        r?.customerId
      );

      const job_file_id: string | undefined = pickId(
        q?.job_file,
        q?.jobFile,
        q?.job,
        q?.job_file_id,
        q?.jobFileId,
        q?.job_id,
        q?.jobId,
        r?.job_file,
        r?.jobFile,
        r?.job,
        r?.job_file_id,
        r?.jobFileId,
        r?.job_id,
        r?.jobId
      );

      const items: InvoiceItemInput[] = (q?.items ?? [])
        .filter((it: any) => it?.product?.id || it?.product_id)
        .map((it: any) => ({
          product_id: coerceId(it?.product?.id ?? it?.product_id)!,
          tax_id: coerceId(it?.tax?.id ?? it?.tax_id) ?? null,
          quantity: Number(it?.quantity ?? 0),
          unit_price: Number(it?.unit_price ?? it?.price ?? 0),
        }))
        .filter((it: InvoiceItemInput) => it.product_id && it.quantity > 0);

      if (!customer_id) {
        toast.error("Quotation has no customer linked, cannot convert to invoice.");
        setConvertingId(null);
        return;
      }

      if (!job_file_id) {
        toast.error("Quotation has no job file linked, cannot convert to invoice.");
        setConvertingId(null);
        return;
      }

      if (items.length === 0) {
        toast.error("Quotation has no items, cannot convert to invoice.");
        setConvertingId(null);
        return;
      }

      const validUntilSrc =
        q?.valid_until ||
        r?.valid_until ||
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const payload: CreateInvoiceFromQuotationInput = {
        quotation_id: qid,
        customer_id,
        job_file_id,
        valid_until: new Date(validUntilSrc).toISOString(),
        items,
      };

      await createInvoice(payload);

      setRows((prev) =>
        prev.map((x) =>
          x.id === qid ? { ...x, isInvoiceCreated: true } : x
        )
      );

      toast.success(
        `Quotation ${r?.quote_number ?? r?.id} converted to invoice`
      );
    } catch (e: any) {
      console.error("convertToInvoice error", e);
      toast.error(e?.response?.data?.message ?? "Convert to invoice failed");
    } finally {
      setConvertingId(null);
    }
  };

  const removeQuote = async (r: any) => {
    try {
      const ok = window.confirm("Delete this quotation?");
      if (!ok) return;
      await deleteQuotation(r.id);
      const { rows: list, pagination: pg } = await listQuotations(
        page,
        limit,
        query.trim() || undefined
      );
      setRows(list ?? []);
      setPagination(pg ?? null);
      toast.success("Quotation deleted");
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Delete failed");
    }
  };

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const s = deriveStatus(r);
      const matchesS = status === "all" || s === status;
      return matchesS;
    });
  }, [rows, status]);

  /* ---------------- Export helpers (CSV / PDF) ---------------- */

  const handleExportCSV = () => {
    if (!filtered.length) {
      toast.info("No quotations to export.");
      return;
    }

    const esc = (val: any) =>
      `"${String(val ?? "").replace(/"/g, '""')}"`;

    const headers = [
      "Quote #",
      "Client",
      "Amount",
      "Created",
      "Valid Until",
      "Status",
    ];

    const rowsData = filtered.map((r) => {
      const id = r?.quote_number ?? r?.id ?? "";
      const client = r?.customer?.name ?? "";
      const created = r?.created_at
        ? new Date(r.created_at).toLocaleDateString()
        : "";
      const validUntil = r?.valid_until
        ? new Date(r.valid_until).toLocaleDateString()
        : "";
      const amount = money(r?.grand_total);
      const s = deriveStatus(r);
      const statusLabel = s.charAt(0).toUpperCase() + s.slice(1);
      return [id, client, amount, created, validUntil, statusLabel];
    });

    const csv =
      [headers.map(esc).join(",")]
        .concat(rowsData.map((row) => row.map(esc).join(",")))
        .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "quotations.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Quotations exported as CSV.");
  };

  const handleExportPDF = () => {
    if (!filtered.length) {
      toast.info("No quotations to export.");
      return;
    }

    const popup = window.open("", "_blank");
    if (!popup) {
      toast.error("Popup blocked. Please allow popups to export PDF.");
      return;
    }

    const rowsHtml = filtered
      .map((r) => {
        const id = r?.quote_number ?? r?.id ?? "";
        const client = r?.customer?.name ?? "";
        const created = r?.created_at
          ? new Date(r.created_at).toLocaleDateString()
          : "";
        const validUntil = r?.valid_until
          ? new Date(r.valid_until).toLocaleDateString()
          : "";
        const amount = money(r?.grand_total);
        const s = deriveStatus(r);
        const statusLabel = s.charAt(0).toUpperCase() + s.slice(1);

        return `
          <tr>
            <td>${id}</td>
            <td>${client}</td>
            <td>${amount}</td>
            <td>${created}</td>
            <td>${validUntil}</td>
            <td>${statusLabel}</td>
          </tr>
        `;
      })
      .join("");

    popup.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Quotations Export</title>
        <style>
          body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 24px; }
          h1 { font-size: 20px; margin-bottom: 16px; }
          table { border-collapse: collapse; width: 100%; font-size: 12px; }
          th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
          th { background: #f3f4f6; }
          tr:nth-child(even) { background: #fafafa; }
        </style>
      </head>
      <body>
        <h1>Quotations</h1>
        <table>
          <thead>
            <tr>
              <th>Quote #</th>
              <th>Client</th>
              <th>Amount</th>
              <th>Created</th>
              <th>Valid Until</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </body>
      </html>
    `);
    popup.document.close();
    popup.focus();
    popup.print(); // user can "Save as PDF"
  };

  /* ---------------------- pagination helpers ---------------------- */
  const total = (pagination?.total as number | undefined) ?? rows.length;
  const currentPage = (pagination?.page as number | undefined) ?? page;
  const apiTotalPages = pagination?.totalPages as number | undefined;
  const computedTotalPages = Math.ceil(
    (((pagination?.total ?? 0) as number) / limit)
  );
  const totalPages = Math.max(1, apiTotalPages ?? (computedTotalPages || 1));
  const hasPrev = pagination ? Boolean(pagination.hasPrev) : currentPage > 1;
  const hasNext = pagination ? Boolean(pagination.hasNext) : currentPage < totalPages;
  const start = total === 0 ? 0 : (currentPage - 1) * limit + 1;
  const end = total === 0 ? 0 : Math.min(currentPage * limit, total);

  // permissions (mirror tax page pattern)
  const canList   = useHasPermission(ENTITY_PERMS.quotations?.list   ?? "quotations/getAll");
  const canCreate = useHasPermission(ENTITY_PERMS.quotations?.create ?? "quotations/create");
  const canRead   = useHasPermission(ENTITY_PERMS.quotations?.read   ?? "quotations/getById");
  const canUpdate = useHasPermission(ENTITY_PERMS.quotations?.update ?? "quotations/update");
  const canDelete = useHasPermission(ENTITY_PERMS.quotations?.delete ?? "quotations/delete");

  return (
    <PermissionBoundary screen="/dashboard/quotations" mode="block">
      <div className="space-y-6">
        {/* Heading */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Quotations</h1>
            <p className="mt-2 text-muted-foreground">
              Create and manage price quotations for clients
            </p>
          </div>
          {canCreate ? (
            <Link href="/dashboard/quotations/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Quotation
              </Button>
            </Link>
          ) : (
            <Button className="gap-2" disabled>
              <Plus className="h-4 w-4" />
              New Quotation
            </Button>
          )}
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="Total Quotations"
            value={total}
            icon={<FileText className="h-6 w-6" />}
            iconClass="bg-primary/10 text-primary"
          />
          <KpiCard
            title="Accepted"
            value={stats.accepted}
            icon={<CheckCircle2 className="h-6 w-6" />}
            iconClass="bg-emerald-500/10 text-emerald-600"
          />
          <KpiCard
            title="Pending"
            value={stats.pending}
            icon={<FileClock className="h-6 w-6" />}
            iconClass="bg-amber-500/10 text-amber-600"
          />
          <KpiCard
            title="Rejected"
            value={stats.rejected}
            icon={<XCircle className="h-6 w-6" />}
            iconClass="bg-red-500/10 text-red-600"
          />
        </div>

        {/* Table */}
        <Card className="shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-2xl">All Quotations</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative w-[260px] sm:w-[320px] max-w-[60vw]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search quotations..."
                    className="h-9 pl-9"
                  />
                </div>

                {/* Status filter */}
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as any)}
                >
                  <SelectTrigger className="h-9 w-36">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>

                {/* Export dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 rounded-full border-muted-foreground/30 bg-background/60 px-3 text-xs font-medium text-muted-foreground shadow-sm hover:border-primary/40 hover:bg-primary/5 hover:text-primary gap-1.5"
                    >
                      <Download className="h-4 w-4" />
                      <span className="hidden sm:inline">Export</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      Export current view
                    </div>
                    <DropdownMenuItem
                      onClick={handleExportCSV}
                      className="cursor-pointer"
                    >
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Export as CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleExportPDF}
                      className="cursor-pointer"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Export as PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-6">
            {/* rounded corners kept; disable row hover; lock header hover */}
            <div className="mt-1 rounded-xl border overflow-hidden [&_tbody_tr:hover]:bg-transparent [&_thead_tr:hover]:bg-gray-200">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-200">
                    <TableHead className="rounded-tl-xl">Quote #</TableHead>
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
                      <TableCell
                        colSpan={7}
                        className="p-8 text-center text-muted-foreground"
                      >
                        Loading quotations…
                      </TableCell>
                    </TableRow>
                  ) : !canList ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="p-8 text-center text-muted-foreground"
                      >
                        You don’t have permission to view quotations.
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="p-8 text-center text-muted-foreground"
                      >
                        No quotations found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((r, idx) => {
                      const id = r?.quote_number ?? r?.id;
                      const client = r?.customer?.name ?? "—";
                      const created = r?.created_at
                        ? new Date(r.created_at).toLocaleDateString()
                        : "—";
                      const validUntil = r?.valid_until
                        ? new Date(r.valid_until).toLocaleDateString()
                        : "—";
                      const amount = money(r?.grand_total);
                      const s = deriveStatus(r);
                      const busy = convertingId === r.id;
                      const isLast = idx === filtered.length - 1;

                      return (
                        <TableRow
                          key={r.id}
                          className="odd:bg-muted/30 even:bg-white hover:bg-transparent"
                        >
                          <TableCell className={isLast ? "rounded-bl-xl" : ""}>
                            <span className="font-medium">{id}</span>
                          </TableCell>
                          <TableCell>{client}</TableCell>
                          <TableCell className="font-semibold">
                            {amount}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {created}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {validUntil}
                          </TableCell>
                          <TableCell>
                            <StatusPill s={s} />
                          </TableCell>

                          <TableCell
                            className={`text-right ${isLast ? "rounded-br-xl" : ""}`}
                          >
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Open menu</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                {canRead && (
                                  <DropdownMenuItem
                                    onClick={() => viewClient(r)}
                                    className="cursor-pointer"
                                  >
                                    <Eye className="mr-2 h-4 w-4" /> View
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => sendToClient(r)}
                                  className="cursor-pointer"
                                >
                                  <Send className="mr-2 h-4 w-4" /> Send to Client
                                </DropdownMenuItem>
                                {canUpdate && (
                                  <DropdownMenuItem
                                    onClick={() => editQuote(r)}
                                    className="cursor-pointer"
                                  >
                                    <Pencil className="mr-2 h-4 w-4" /> Edit
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  disabled={busy || r?.isInvoiceCreated}
                                  onClick={() => convertToInvoice(r)}
                                  className={`cursor-pointer ${
                                    r?.isInvoiceCreated ? "opacity-60" : ""
                                  }`}
                                >
                                  {busy ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <ReceiptIcon className="mr-2 h-4 w-4" />
                                  )}
                                  {r?.isInvoiceCreated
                                    ? "Already Converted"
                                    : "Convert to Invoice"}
                                </DropdownMenuItem>
                                {canDelete && (
                                  <DropdownMenuItem
                                    onClick={() => removeQuote(r)}
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
                {`Showing ${start} to ${end} of ${total} quotations`}
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
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (pgNum) => (
                      <Button
                        key={pgNum}
                        variant={currentPage === pgNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPage(pgNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pgNum}
                      </Button>
                    )
                  )}
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

/* ------------------------------------------------------------------ */
/* Small KPI card component                                            */
/* ------------------------------------------------------------------ */
function KpiCard({
  title,
  value,
  icon,
  iconClass,
}: {
  title: string;
  value: number | string;
  icon: ReactNode;
  iconClass: string;
}) {
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
