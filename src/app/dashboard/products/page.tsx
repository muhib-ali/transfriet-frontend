// src/app/dashboard/products/page.tsx
"use client";

import * as React from "react";
import * as Icons from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import PermissionBoundary from "@/components/permission-boundary";

import ProductFormDialog, {
  type ProductFormValue,
} from "@/components/products/product-form";

import {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  type ProductItem,
} from "@/lib/products.api";
import { listJobFiles } from "@/lib/job_files.api";

import { ENTITY_PERMS } from "@/rbac/permissions-map";
import { useHasPermission } from "@/hooks/use-permission";

function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        active
          ? "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
          : "bg-muted text-muted-foreground"
      )}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

type Row = {
  id: string;
  title: string;
  description?: string | null;
  price: number;
  job_file_id?: string | null;
  is_active: boolean;
  created_at?: string;
};

export default function ProductsPage() {
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [page] = React.useState(1);
  const [limit] = React.useState(10);
  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");

  // Dialog
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"create" | "edit">("create");
  const [current, setCurrent] = React.useState<Row | undefined>(undefined);

  // RBAC
  const canList = useHasPermission(
    ENTITY_PERMS.products?.list ?? "products.getAll"
  );
  const canCreate = useHasPermission(
    ENTITY_PERMS.products?.create ?? "products.create"
  );
  const canRead = useHasPermission(
    ENTITY_PERMS.products?.read ?? "products.getById"
  );
  const canUpdate = useHasPermission(
    ENTITY_PERMS.products?.update ?? "products.update"
  );
  const canDelete = useHasPermission(
    ENTITY_PERMS.products?.delete ?? "products.delete"
  );
  // const canEdit = canRead || canUpdate;

  // Job File dropdown options
  const [jobFileOptions, setJobFileOptions] = React.useState<
    { id: string; title: string }[]
  >([]);
  const jobFileMap = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const c of jobFileOptions) m.set(c.id, c.title);
    return m;
  }, [jobFileOptions]);

  const normalizeRows = (
    products: ProductItem[],
    jobFiles: Array<{ id: string; title: string }>
  ): Row[] => {
    // (map already created above; we just normalize product fields)
    return products.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description ?? "",
      price:
        typeof p.price === "string"
          ? parseFloat(p.price)
          : Number(p.price || 0),
      job_file_id: p.job_file_id ?? null,
      is_active: p.is_active ?? false,
      created_at: p.created_at,
    }));
  };

  const refresh = async (search?: string) => {
    const [{ rows: jobFiles }, { rows: prods }] = await Promise.all([
      listJobFiles(1, 100),
      listProducts(page, limit, search?.trim() || undefined),
    ]);
    setJobFileOptions(jobFiles.map((c) => ({ id: c.id, title: c.title })));
    setRows(normalizeRows(prods, jobFiles));
  };

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  const [jobFilesLoaded, setJobFilesLoaded] = React.useState(false);

  // Load job files once (for title mapping) to avoid extra requests per keystroke
  React.useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const { rows: jobFiles } = await listJobFiles(1, 100, undefined, {
          signal: ac.signal,
        });
        setJobFileOptions(jobFiles.map((c) => ({ id: c.id, title: c.title })));
        setJobFilesLoaded(true);
      } catch (e: any) {
        if (e?.code === "ERR_CANCELED" || e?.message === "canceled") return;
        console.error(e);
      }
    })();
    return () => ac.abort();
  }, []);

  // Load products; only one request per keystroke; job files are cached above
  React.useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        if (!canList) {
          setRows([]);
          return;
        }
        if (!jobFilesLoaded) return; // wait until job files are loaded once
        const { rows: prods } = await listProducts(
          page,
          limit,
          debouncedQuery || undefined,
          { signal: ac.signal }
        );
        setRows(normalizeRows(prods, jobFileOptions));
      } catch (e: any) {
        if (e?.code === "ERR_CANCELED" || e?.message === "canceled") return; // ignore aborts
        console.error(e);
        toast.error(e?.response?.data?.message || "Failed to load products");
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [page, limit, canList, debouncedQuery, jobFilesLoaded, jobFileOptions]);

  const filtered = React.useMemo(() => rows, [rows]);

  const Plus = (Icons as any).Plus;
  const Pencil = (Icons as any).Pencil;
  const Trash2 = (Icons as any).Trash2;
  const Search = (Icons as any).Search;
  const ChevronLeft = (Icons as any).ChevronLeft;
  const ChevronRight = (Icons as any).ChevronRight;
  const MoreHorizontal = (Icons as any).MoreHorizontal;
  const FileX2 = (Icons as any).FileX2;

  const openCreate = () => {
    if (!canCreate) return;
    setMode("create");
    setCurrent(undefined);
    setOpen(true);
  };

  const openEdit = async (row: Row) => {
    if (!canUpdate) return; // hard stop
    try {
      const p = await getProductById(row.id);
      setMode("edit");
      setCurrent({
        id: p.id,
        title: p.title,
        description: p.description ?? "",
        price:
          typeof p.price === "string"
            ? parseFloat(p.price)
            : Number(p.price || 0),
        job_file_id: p.job_file_id ?? null,
        is_active: p.is_active ?? false,
        created_at: p.created_at,
      });
      setOpen(true);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Failed to open product");
    }
  };

  const upsert = async (payload: ProductFormValue) => {
    try {
      if (mode === "create") {
        if (!canCreate) return;
        await createProduct({
          title: payload.title,
          description: payload.description,
          price: payload.price,
          job_file_id: payload.job_file_id ?? null,
        });
        toast.success("Product created");
      } else {
        if (!canUpdate) return;
        await updateProduct({
          id: payload.id!,
          title: payload.title,
          description: payload.description,
          price: payload.price,
          job_file_id: payload.job_file_id ?? null,
        });
        toast.success("Product updated");
      }
      await refresh(query);
      setOpen(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Save failed");
    }
  };

  const remove = async (id: string) => {
    if (!canDelete) return;
    try {
      await deleteProduct(id);
      toast.success("Product deleted");
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Delete failed");
    }
  };

  return (
    <PermissionBoundary screen="/dashboard/products" mode="block">
      <div className="space-y-6 scrollbar-stable">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">Products</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your product catalog
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2" disabled={!canCreate}>
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-2xl">All Products</CardTitle>
              <div className="flex gap-2">
                <div className="relative w-[350px] max-w-[50vw]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-9 pl-9"
                    placeholder="Search products..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-6">
            {/* Table */}
            <div className="mt-1 rounded-xl border overflow-hidden [&_tbody_tr:hover]:bg-transparent [&_thead_tr:hover]:bg-gray-200">
              <table className="w-full caption-bottom text-sm">
                <thead>
                  <tr className="text-left bg-gray-200">
                    <th className="p-4 font-medium rounded-tl-xl">Title</th>
                    <th className="p-4 font-medium">Job File</th>
                    <th className="p-4 font-medium">Price</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium text-right rounded-tr-xl">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-8 text-center text-muted-foreground"
                      >
                        Loading products…
                      </td>
                    </tr>
                  ) : !canList ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-8 text-center text-muted-foreground"
                      >
                        You don’t have permission to view products.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {filtered.map((p, idx) => {
                        const isLast = idx === filtered.length - 1;
                        const jobFileTitle = p.job_file_id
                          ? jobFileMap.get(p.job_file_id) ?? "—"
                          : "—";

                        return (
                          <tr
                            key={p.id}
                            className="odd:bg-muted/30 even:bg-white hover:bg-transparent"
                          >
                            <td
                              className={`p-4 font-medium ${
                                isLast ? "rounded-bl-xl" : ""
                              }`}
                            >
                              <div className="flex flex-col">
                                <span>{p.title}</span>
                                <span className="text-xs text-muted-foreground line-clamp-1">
                                  {p.description || "—"}
                                </span>
                              </div>
                            </td>
                            <td className="p-4 text-muted-foreground">
                              {jobFileTitle}
                            </td>
                            <td className="p-4 font-medium">
                              {p.price.toLocaleString()}
                            </td>
                            <td className="p-4">
                              <StatusPill active={p.is_active} />
                            </td>
                            <td
                              className={`p-4 ${
                                isLast ? "rounded-br-xl" : ""
                              }`}
                            >
                              <div className="flex justify-end">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      aria-label="More actions"
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align="end"
                                    className="w-40"
                                  >
                                    {canUpdate && (
                                      <DropdownMenuItem
                                        className="gap-2"
                                        onClick={() => openEdit(p)}
                                      >
                                        <Pencil className="h-4 w-4" />
                                        Edit
                                      </DropdownMenuItem>
                                    )}
                                    {canDelete && (
                                      <DropdownMenuItem
                                        className="gap-2 text-destructive focus:text-destructive"
                                        onClick={() => remove(p.id)}
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
                          <td
                            colSpan={5}
                            className="p-8 text-center text-muted-foreground"
                          >
                            <div className="flex flex-col items-center justify-center gap-3">
                              <Avatar className="h-16 w-16 border border-dashed border-muted-foreground/30 bg-muted/40">
                                <AvatarFallback>
                                  <FileX2 className="h-7 w-7 text-muted-foreground" />
                                </AvatarFallback>
                              </Avatar>
                              <div className="text-sm font-medium text-foreground">
                                No products found
                              </div>
                              <p className="text-xs text-muted-foreground max-w-xs">
                                {query
                                  ? "No products match your search. Try changing or clearing the search term."
                                  : "You haven’t added any products yet. Start by creating your first product."}
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls (UI only) */}
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                {`Showing ${filtered.length ? 1 : 0} to ${
                  filtered.length
                } of ${filtered.length} products`}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled className="gap-1">
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  <Button
                    variant="default"
                    size="sm"
                    className="w-8 h-8 p-0"
                  >
                    1
                  </Button>
                </div>
                <Button variant="outline" size="sm" disabled className="gap-1">
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Create / Edit dialog — permission gated */}
        <ProductFormDialog
          open={mode === "edit" ? (canUpdate && open) : (canCreate && open)}
          onOpenChange={(next) => {
            // block opening if lacking permission for the current mode
            if (mode === "edit" && !canUpdate) return;
            if (mode === "create" && !canCreate) return;
            setOpen(next);
            if (!next) setCurrent(undefined);
          }}
          mode={mode}
          jobFiles={jobFileOptions}
          initial={
            current && {
              id: current.id,
              title: current.title,
              description: current.description ?? "",
              price: current.price,
              job_file_id: current.job_file_id ?? null,
            }
          }
          onSubmit={upsert}
        />
      </div>
    </PermissionBoundary>
  );
}
