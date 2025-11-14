// src/app/dashboard/taxes/page.tsx
"use client";

import * as React from "react";
import * as Icons from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import TaxFormDialog, { type TaxFormValue } from "@/components/tax/tax-form";
import { listTaxes, getTaxById, createTax, updateTax, deleteTax } from "@/lib/taxes.api";
import PermissionBoundary from "@/components/permission-boundary";
import { ENTITY_PERMS } from "@/rbac/permissions-map";
import { useHasPermission } from "@/hooks/use-permission";

function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        active ? "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300" : "bg-muted text-muted-foreground"
      )}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

type Row = {
  id: string;
  title: string;
  value: number;
  is_active: boolean;
  created_at?: string;
};

export default function TaxesPage() {
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [page] = React.useState(1);
  const [limit] = React.useState(10);
  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");

  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"create" | "edit">("create");
  const [current, setCurrent] = React.useState<Row | undefined>(undefined);

  const canList   = useHasPermission(ENTITY_PERMS.taxes?.list   ?? "taxes.getAll");
  const canCreate = useHasPermission(ENTITY_PERMS.taxes?.create ?? "taxes.create");
  const canRead   = useHasPermission(ENTITY_PERMS.taxes?.read   ?? "taxes.getById");
  const canUpdate = useHasPermission(ENTITY_PERMS.taxes?.update ?? "taxes.update");
  const canDelete = useHasPermission(ENTITY_PERMS.taxes?.delete ?? "taxes.delete");
  // const canEdit = canRead || canUpdate;

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  React.useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        if (!canList) {
          setRows([]);
          return;
        }
        const { rows } = await listTaxes(page, limit, debouncedQuery || undefined, { signal: ac.signal });
        setRows(
          rows.map((t) => ({
            id: t.id,
            title: t.title,
            value: typeof t.value === "string" ? parseFloat(t.value) : t.value,
            is_active: t.is_active ?? false,
            created_at: t.created_at,
          }))
        );
      } catch (e: any) {
        if (e?.code === "ERR_CANCELED" || e?.message === "canceled") return;
        console.error(e);
        toast.error(e?.response?.data?.message || "Failed to load taxes");
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [page, limit, canList, debouncedQuery]);

  const filtered = React.useMemo(() => rows, [rows]);

  const Plus = (Icons as any).Plus;
  const Pencil = (Icons as any).Pencil;
  const Trash2 = (Icons as any).Trash2;
  const Search = (Icons as any).Search;
  const ChevronLeft = (Icons as any).ChevronLeft;
  const ChevronRight = (Icons as any).ChevronRight;
  const MoreHorizontal = (Icons as any).MoreHorizontal;

  const openCreate = () => {
    if (!canCreate) return;
    setMode("create");
    setCurrent(undefined);
    setOpen(true);
  };

  const openEdit = async (row: Row) => {
    if (!canUpdate) return;
    try {
      const t = await getTaxById(row.id);
      setMode("edit");
      setCurrent({
        id: t.id,
        title: t.title,
        
        value: typeof t.value === "string" ? parseFloat(t.value) : t.value,
        is_active: t.is_active ?? false,
        created_at: t.created_at,
      });
      setOpen(true);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Failed to open tax");
    }
  };

  const upsert = async (payload: TaxFormValue) => {
    try {
      if (mode === "create") {
        if (!canCreate) return;
        await createTax({
          title: payload.title,
          
          value: payload.value,
        });
        toast.success("Tax created");
      } else {
        if (!canUpdate) return;
        await updateTax({
          id: payload.id!,
          title: payload.title,

          value: payload.value,
        });
        toast.success("Tax updated");
      }

      const { rows } = await listTaxes(page, limit, query.trim() || undefined);
      setRows(
        rows.map((t) => ({
          id: t.id,
          title: t.title,
          
          value: typeof t.value === "string" ? parseFloat(t.value) : t.value,
          is_active: t.is_active ?? false,
          created_at: t.created_at,
        }))
      );
      setOpen(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Save failed");
    }
  };

  const remove = async (id: string) => {
    if (!canDelete) return;
    try {
      await deleteTax(id);
      toast.success("Tax deleted");
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Delete failed");
    }
  };

  return (
    <PermissionBoundary screen="/dashboard/tax" mode="block">
      <div className="space-y-6 scrollbar-stable">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">Taxes</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage tax rates and configurations</p>
          </div>
          <Button className="gap-2" onClick={openCreate} disabled={!canCreate}>
            <Plus className="h-4 w-4" />
            Add tax
          </Button>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-2xl">All Taxes</CardTitle>
              <div className="relative w-[350px] max-w-[50vw]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-9 pl-9"
                  placeholder="Search taxes..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-6">
            <div className="relative w-full overflow-x-auto rounded-xl border">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="text-left bg-gray-200">
                    <th className="p-4 font-medium rounded-tl-xl">Title</th>
                    <th className="p-4 font-medium">Value</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium text-right rounded-tr-xl">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">Loading taxes…</td>
                    </tr>
                  ) : !canList ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">You don’t have permission to view taxes.</td>
                    </tr>
                  ) : (
                    <>
                      {filtered.map((t, idx) => {
                        const isLast = idx === filtered.length - 1;
                        return (
                          <tr key={t.id} className="odd:bg-muted/30 even:bg-white">
                            <td className={`p-4 font-medium ${isLast ? "rounded-bl-xl" : ""}`}>{t.title}</td>
                            <td className="p-4">{t.value}%</td>
                            <td className="p-4">
                              <StatusPill active={t.is_active} />
                            </td>
                            <td className={`p-4 ${isLast ? "rounded-br-xl" : ""}`}>
                              <div className="flex justify-end">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="More actions">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-40">
                                    {canUpdate && (
                                      <DropdownMenuItem className="gap-2" onClick={() => openEdit(t)}>
                                        <Pencil className="h-4 w-4" />
                                        Edit
                                      </DropdownMenuItem>
                                    )}
                                    {canDelete && (
                                      <DropdownMenuItem
                                        className="gap-2 text-destructive focus:text-destructive"
                                        onClick={() => remove(t.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                        Delete
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filtered.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-muted-foreground">No taxes found.</td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                {`Showing ${filtered.length ? 1 : 0} to ${filtered.length} of ${filtered.length} taxes`}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled className="gap-1">
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  <Button variant="default" size="sm" className="w-8 h-8 p-0">1</Button>
                </div>
                <Button variant="outline" size="sm" disabled className="gap-1">
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <TaxFormDialog
          open={mode === "edit" ? (canUpdate && open) : (canCreate && open)}
          onOpenChange={(next) => {
            if (mode === "edit" && !canUpdate) return;
            if (mode === "create" && !canCreate) return;
            setOpen(next);
            if (!next) setCurrent(undefined);
          }}
          mode={mode}
          initial={
            current && {
              id: current.id,
              title: current.title,
              
              value: current.value,
              is_active: current.is_active,
            }
          }
          onSubmit={upsert}
        />
      </div>
    </PermissionBoundary>
  );
}
