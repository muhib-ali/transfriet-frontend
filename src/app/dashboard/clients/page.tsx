"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddClientDialog } from "@/components/clients/add-client-dialog";
import { AddClientForm } from "@/components/clients/add-client-form";
import PermissionGate from "@/components/permission-gate";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Building2, Building, Plus, Search as SearchIcon, Inbox, Phone, MoreHorizontal,
  Eye, FileDown, Pencil, Trash2, ChevronLeft, ChevronRight,
} from "lucide-react";

import { listClients, createClient, updateClient, deleteClient, getClientById } from "@/lib/clients.api";
import { ENTITY_PERMS } from "@/rbac/permissions-map";
import { useHasPermission } from "@/hooks/use-permission";
import PermissionBoundary from "@/components/permission-boundary";
/** ---------- types aligned with UI (kept same columns) ---------- */
type CStatus = "active" | "inactive";
type Row = {
  id: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  invoices: number;   // API has no invoices; keep 0/default for design
  status: CStatus;    // derived from is_active
};

/** ---------- static fallback (same as your demo) ---------- */
const STATIC_ROWS: Row[] = [
  { id: "c1", company: "Acme Corporation", email: "contact@acme.com", phone: "+1 234 567 8900", address: "123 Business St, NY", invoices: 45, status: "active" },
  { id: "c2", company: "TechStart Inc",    email: "hello@techstart.com", phone: "+1 234 567 8901", address: "456 Innovation Ave, CA", invoices: 23, status: "active" },
  { id: "c3", company: "Global Trade Co",  email: "info@globaltrade.com", phone: "+1 234 567 8902", address: "789 Commerce Blvd, TX", invoices: 67, status: "inactive" },
];

function StatusPill({ s }: { s: CStatus }) {
  return s === "active" ? (
    <Badge className="rounded-full bg-blue-50 text-blue-700 hover:bg-blue-50" variant="outline">
      Active
    </Badge>
  ) : (
    <Badge className="rounded-full bg-slate-50 text-slate-600 hover:bg-slate-50" variant="outline">
      Inactive
    </Badge>
  );
}

export default function ClientsPage() {
  const [rows, setRows] = useState<Row[]>(STATIC_ROWS);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  // pagination (fixed limit; mirror quotations design)
  const [page, setPage] = useState(1);
  const limit = 3;
  const [pagination, setPagination] = useState<any | null>(null);
  // edit dialog state
  const [openEdit, setOpenEdit] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // RBAC (optional)
  const canList   = useHasPermission(ENTITY_PERMS.clients?.list   ?? "clients/getAll");
  const canCreate = useHasPermission(ENTITY_PERMS.clients?.create ?? "clients/create");
  const canRead   = useHasPermission(ENTITY_PERMS.clients?.read   ?? "clients/getById");
  const canUpdate = useHasPermission(ENTITY_PERMS.clients?.update ?? "clients/update");
  const canDelete = useHasPermission(ENTITY_PERMS.clients?.delete ?? "clients/delete");

  // debounce input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  // reset page on new search
  useEffect(() => {
    setPage(1);
  }, [debouncedQ]);

  // load from API (fallback to static if no list perm / API fails)
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        if (!canList) {
          setRows(STATIC_ROWS);
          setPagination({ page, limit, total: STATIC_ROWS.length, totalPages: 1, hasNext: false, hasPrev: false });
          return;
        }
        const { rows: list, pagination: pg } = await listClients(page, limit, debouncedQ || undefined, { signal: ac.signal });
        setRows(
          (list ?? []).map((c) => ({
            id: c.id,
            company: c.name,
            email: c.email ?? "",
            phone: c.phone ?? "",
            address: c.address ?? "",
            invoices: 0, // design placeholder
            status: c.is_active ? "active" : "inactive",
          }))
        );
        setPagination(pg ?? null);
      } catch (e: any) {
        if (e?.code === "ERR_CANCELED" || e?.message === "canceled") return; // ignore cancel
        console.error(e);
        toast.error(e?.response?.data?.message || "Failed to load clients");
        setRows(STATIC_ROWS);
        setPagination({ page: 1, limit, total: STATIC_ROWS.length, totalPages: 1, hasNext: false, hasPrev: false });
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [canList, page, debouncedQ]);

  const filtered = useMemo(() => rows, [rows]);

  /* ---------------------- pagination helpers ---------------------- */
  const pagTotal = (pagination?.total as number | undefined) ?? rows.length;
  const pagCurrentPage = (pagination?.page as number | undefined) ?? page;
  const apiTotalPages = pagination?.totalPages as number | undefined;
  const computedTotalPages = Math.ceil((((pagination?.total ?? pagTotal) as number) / limit));
  const pagTotalPages = Math.max(1, apiTotalPages ?? (computedTotalPages || 1));
  const pagHasPrev = pagination ? Boolean(pagination.hasPrev) : pagCurrentPage > 1;
  const pagHasNext = pagination ? Boolean(pagination.hasNext) : pagCurrentPage < pagTotalPages;
  const pagStart = pagTotal === 0 ? 0 : (pagCurrentPage - 1) * limit + 1;
  const pagEnd = pagTotal === 0 ? 0 : Math.min(pagCurrentPage * limit, pagTotal);

  async function handleCreate(values: {
    name: string; email: string; phone: string; address: string; country: string;
  }) {
    try {
      if (!canCreate) {
        toast.error("You don’t have permission to create clients");
        return;
      }
      const created = await createClient({
        name: values.name,
        email: values.email,
        phone: values.phone,
        address: values.address,
        country: values.country,
      });
      toast.success("Client created");

      // refresh list
      const { rows } = await listClients(1, 10, q.trim() || undefined);
      setRows(
        rows.map((c) => ({
          id: c.id,
          company: c.name,
          email: c.email ?? "",
          phone: c.phone ?? "",
          address: c.address ?? "",
          invoices: 0,
          status: c.is_active ? "active" : "inactive",
        }))
      );
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Create failed");
    }
  }

  async function openEditDialog(id: string) {
    if (!canRead && !canUpdate) return;
    try {
      const c = await getClientById(id);
      setEditing({
        id: c.id,
        name: c.name ?? "",
        email: c.email ?? "",
        phone: c.phone ?? "",
        address: c.address ?? "",
        country: c.country ?? "",
      });
      setOpenEdit(true);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Failed to load client");
    }
  }

  async function handleUpdate(values: {
    name: string; email: string; phone: string; address: string; country: string;
  }) {
    if (!editing) return;
    try {
      setSavingEdit(true);
      await updateClient({
        id: editing.id,
        name: values.name,
        email: values.email,
        phone: values.phone,
        address: values.address,
        country: values.country,
      });
      toast.success("Client updated");
      setOpenEdit(false);
      setEditing(null);
      // refresh list for consistency
      const { rows } = await listClients(page, limit, q.trim() || undefined);
      setRows(
        rows.map((cc) => ({
          id: cc.id,
          company: cc.name,
          email: cc.email ?? "",
          phone: cc.phone ?? "",
          address: cc.address ?? "",
          invoices: 0,
          status: cc.is_active ? "active" : "inactive",
        }))
      );
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Update failed");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete(id: string) {
    if (!canDelete) return;
    try {
      await deleteClient(id);
      toast.success("Client deleted");
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Delete failed");
    }
  }

  // quick metrics (kept same look; computed from current rows)
  const total = rows.length;
  const active = rows.filter((c) => c.status === "active").length;
  const inactive = total - active;
  const thisMonth = 12; // static placeholder to keep same design

  return (
    <PermissionBoundary screen="/dashboard/clients" mode="block">
      <div className="space-y-6 scrollbar-stable">
      {/* Header (unchanged styling) */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clients</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your Clients and client relationships
          </p>
        </div>

        {/* Create: gate with permission; fallback is disabled button */}
        <PermissionGate
          route={ENTITY_PERMS.clients?.create ?? "clients/create"}
          fallback={(
            <Button className="gap-2" disabled title="No permission to create">
              <Plus className="h-4 w-4" />
              Add Client
            </Button>
          )}
        >
          <AddClientDialog onCreate={handleCreate} />
        </PermissionGate>
      </div>

      {/* Stats row (unchanged styling) */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">Total Clients</p>
              <p className="mt-2 text-3xl font-semibold">{total}</p>
            </div>
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="mt-2 text-3xl font-semibold">{active}</p>
            </div>
            <Building className="h-8 w-8 text-emerald-500" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">Inactive</p>
              <p className="mt-2 text-3xl font-semibold">{inactive}</p>
            </div>
            <Building className="h-8 w-8 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">This Month</p>
              <p className="mt-2 text-3xl font-semibold">+{thisMonth}</p>
            </div>
            <Plus className="h-8 w-8 text-amber-500" />
          </CardContent>
        </Card>
      </div>

      {/* Table (same columns; quotations-style card/pagination) */}
      <Card className="shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-2xl">All Clients</CardTitle>
            <div className="flex gap-2">
              <div className="relative w-[350px] max-w-[50vw]">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search clients..."
                  className="h-9 pl-9"
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-6">
          <div className="mt-1 rounded-xl border overflow-hidden [&_tbody_tr:hover]:bg-transparent [&_thead_tr:hover]:bg-gray-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-200">
                  <TableHead className="rounded-tl-xl">Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Invoices</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right rounded-tr-xl">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="p-8 text-center text-muted-foreground">
                      Loading clients…
                    </TableCell>
                  </TableRow>
                ) : filtered.map((c, idx) => {
                  const isLast = idx === filtered.length - 1;
                  return (
                  <TableRow key={c.id} className="odd:bg-muted/30 even:bg-white hover:bg-transparent">
                    <TableCell className={`font-medium ${isLast ? "rounded-bl-xl" : ""}`}>{c.company}</TableCell>

                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Inbox className="h-4 w-4 text-muted-foreground" />
                          <span>{c.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span>{c.phone}</span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-sm">{c.address}</TableCell>
                    <TableCell className="text-sm">{c.invoices}</TableCell>
                    <TableCell><StatusPill s={c.status} /></TableCell>

                    <TableCell className={`text-right ${isLast ? "rounded-br-xl" : ""}`}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem className="gap-2">
                            <Eye className="h-4 w-4" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2">
                            <FileDown className="h-4 w-4" />
                            Export
                          </DropdownMenuItem>
                          {canUpdate && (
                            <DropdownMenuItem className="gap-2" onClick={() => openEditDialog(c.id)}>
                              <Pencil className="h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <DropdownMenuItem
                              className="gap-2 text-destructive focus:text-destructive"
                              onClick={() => handleDelete(c.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );})}

                {!loading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="p-8 text-center text-muted-foreground">
                      No clients found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              {`Showing ${pagStart} to ${pagEnd} of ${pagTotal} clients`}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!pagHasPrev || loading}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: pagTotalPages }, (_, i) => i + 1).map((pgNum) => (
                  <Button
                    key={pgNum}
                    variant={pagCurrentPage === pgNum ? "default" : "outline"}
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
                disabled={!pagHasNext || loading}
                className="gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
      </CardContent>
      </Card>
      {/* Edit dialog (identical UI to AddClientDialog) */}
      <Dialog
        open={openEdit}
        onOpenChange={(o) => {
          if (!o) {
            setOpenEdit(false);
            setEditing(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
          </DialogHeader>
          {/* Reuse AddClientForm with initial values and Update label */}
          <AddClientForm
            onSubmit={handleUpdate}
            submitting={savingEdit}
            submitLabel="Update Client"
            initialValues={editing ?? undefined}
          />
        </DialogContent>
      </Dialog>
    </div>
    </PermissionBoundary>
    
  );
}
