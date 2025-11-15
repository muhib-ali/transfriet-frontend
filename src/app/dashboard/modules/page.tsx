// src/app/dashboard/modules/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import * as Icons from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import FancyNavButton from "@/components/ui/fancy-nav-button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import ModuleFormDialog, { ModuleRow } from "@/components/modules/module-form";
import PermissionBoundary from "@/components/permission-boundary";

import {
  listModules,
  getModuleById,
  createModule,
  updateModule,
  deleteModule,
} from "@/lib/modules.api";

// ADD these imports at the top with others:
import { listPermissionsByModuleId, deletePermission } from "@/lib/permissions.api";


import { ENTITY_PERMS } from "@/rbac/permissions-map";
import { useHasPermission } from "@/hooks/use-permission";

function getSafeIcon(name?: string) {
  if (!name) return (Icons as any).Package;
  const I = (Icons as any)[name];
  return I || (Icons as any).Package || (Icons as any).Cube || (Icons as any).Boxes;
}

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

export default function ModulesPage() {
  const [rows, setRows] = useState<ModuleRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [page] = useState(1);
  const [limit] = useState(10);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [current, setCurrent] = useState<ModuleRow | undefined>(undefined);

  // RBAC
  const canList   = useHasPermission(ENTITY_PERMS.modules.list);
  const canCreate = useHasPermission(ENTITY_PERMS.modules.create);
  const canRead   = useHasPermission(ENTITY_PERMS.modules.read);
  const canUpdate = useHasPermission(ENTITY_PERMS.modules.update);
  const canDelete = useHasPermission(ENTITY_PERMS.modules.delete);

  // debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // initial load + backend search, with cancellation
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        if (!canList) { setRows([]); return; }
        const { rows } = await listModules(page, limit, debouncedQuery || undefined, { signal: ac.signal });
        setRows(rows.map((m: any) => ({
          id: m.id,
          name: m.title,
          slug: m.slug ?? "",
          description: m.description ?? "",
          icon: "Package",
          active: m.is_active ?? false,
        })));
      } catch (e: any) {
        if (e?.code === "ERR_CANCELED" || e?.message === "canceled") return;
        console.error(e);
        toast.error(e?.response?.data?.message || "Failed to load modules");
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [page, limit, canList, debouncedQuery]);

  const filtered = useMemo(() => rows, [rows]);

  const openCreate = () => {
    if (!canCreate) return;
    setMode("create");
    setCurrent(undefined);
    setOpen(true);
  };

  const openEdit = async (row: ModuleRow) => {
    if (!canUpdate) return;
    try {
      const m = await getModuleById(row.id);
      setMode("edit");
      setCurrent({
        id: m.id,
        name: m.title,
        slug: m.slug ?? "",
        description: m.description ?? "",
        icon: row.icon || "Package",
        active: m.is_active ?? false,
      });
      setOpen(true);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Failed to open module");
    }
  };

  const refresh = async () => {
    const { rows } = await listModules(page, limit);
    setRows(rows.map((mm: any) => ({
      id: mm.id,
      name: mm.title,
      slug: mm.slug ?? "",
      description: mm.description ?? "",
      icon: "Package",
      active: mm.is_active ?? false,
    })));
  };

  // Create / Update (DON'T send is_active; backend DTO me nahi hai)
  const upsert = async (m: ModuleRow) => {
    try {
      if (mode === "create") {
        await createModule({
          title: m.name,
          slug: m.slug,
          description: m.description || "",
        });
        toast.success("Module created");
      } else {
        await updateModule({
          id: m.id,
          title: m.name,
          slug: m.slug,
          description: m.description || "",
        });
        toast.success("Module updated");
      }
      await refresh();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Save failed");
    }
  };

  // Safe delete: preflight for FK (permissions) and block/cascade
// REPLACE the existing `remove` function with this one
const remove = async (moduleId: string) => {
  if (!canDelete) return;

  // optional user confirmation
  const ok = window.confirm(
    "This will delete all permissions under this module, then delete the module. Continue?"
  );
  if (!ok) return;

  try {
    // 1) fetch ALL permissions for this module (auto-paginates at limit=100)
    const perms = await listPermissionsByModuleId(moduleId);

    // 2) delete them one by one (you could parallelize, but serial is safer)
    for (const p of perms) {
      try {
        await deletePermission(p.id);
      } catch (e: any) {
        // If one fails, stop and show the reason
        console.error("Failed deleting permission", p.id, e);
        throw e;
      }
    }

    // 3) now delete the module
    await deleteModule(moduleId);

    // 4) update UI
    toast.success("Module and its permissions deleted");
    setRows((prev) => prev.filter((r) => r.id !== moduleId));
  } catch (e: any) {
    console.error(e);

    // Friendly messages for common cases
    const msg =
      e?.response?.data?.message ||
      e?.message ||
      "Delete failed";

    // If backend returns the FK message or custom text, show as-is
    toast.error(msg);
  }
};


  const Plus   = (Icons as any).Plus;
  const Pencil = (Icons as any).Pencil;
  const Trash2 = (Icons as any).Trash2;
  const Search = (Icons as any).Search;
  const ChevronLeft = (Icons as any).ChevronLeft;
  const ChevronRight = (Icons as any).ChevronRight;
  const MoreHorizontal = (Icons as any).MoreHorizontal;

  return (
    
         <PermissionBoundary screen="/dashboard/modules" mode="block">
            <div className="space-y-6 scrollbar-stable">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Modules</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage system modules and features
          </p>
        </div>
        {/* <FancyNavButton
          text="Add Module"
          icon={<Plus className="h-4 w-4" />}
          onClick={openCreate}
          disabled={!canCreate}
        /> */}
        <Button className="gap-2" onClick={openCreate} disabled={!canCreate}>
            <Plus className="h-4 w-4" />
            Add Module
          </Button>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-2xl">All Modules</CardTitle>
            <div className="relative w-[350px] max-w-[50vw]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-9 pl-9"
                placeholder="Search modules..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-6">
          {/* Table */}
          <div className="mt-1 rounded-xl border overflow-hidden [&_tbody_tr:hover]:bg-transparent [&_thead_tr:hover]:bg-gray-200">
            <table className="w-full caption-bottom text-sm">
              <thead >
                <tr className="text-left bg-gray-200">
                  <th className="p-4 font-medium rounded-tl-xl">Module</th>
                  <th className="p-4 font-medium">Description</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium text-right rounded-tr-xl">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                      Loading modules…
                    </td>
                  </tr>
                ) : !canList ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                      You don’t have permission to view modules.
                    </td>
                  </tr>
                ) : (
                  <>
                    {filtered.map((m) => {
                      const Icon = getSafeIcon(m.icon);
                      return (
                        <tr key={m.id} className="odd:bg-muted/30 even:bg-white">
                          <td className="p-4 rounded-bl-xl">
                            <div className="flex items-center gap-3">
                              <span className="grid h-10 w-10 place-items-center rounded-md bg-muted">
                                <Icon className="h-5 w-5" />
                              </span>
                              <div className="font-medium">
                                {m.name}
                                <div className="text-[11px] text-muted-foreground">slug: {m.slug}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-muted-foreground">{m.description}</td>
                          <td className="p-4"><StatusPill active={m.active} /></td>
                          <td className="p-4 rounded-br-xl">
                            <div className="flex justify-end">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="More actions">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                  {canUpdate && (
                                    <DropdownMenuItem className="gap-2" onClick={() => openEdit(m)}>
                                      <Pencil className="h-4 w-4" />
                                      Edit
                                    </DropdownMenuItem>
                                  )}
                                  {canDelete && (
                                    <DropdownMenuItem
                                      className="gap-2 text-destructive focus:text-destructive"
                                      onClick={() => remove(m.id)}
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
                        <td colSpan={4} className="p-8 text-center text-muted-foreground">
                          No modules found.
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination Controls (UI only; logic unchanged) */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              {`Showing ${filtered.length ? 1 : 0} to ${filtered.length} of ${filtered.length} modules`}
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

      <ModuleFormDialog
        open={open}
        onOpenChange={setOpen}
        mode={mode}
        initial={current}
        onSubmit={upsert}
      />
    </div>
         </PermissionBoundary>
  
  );
}
