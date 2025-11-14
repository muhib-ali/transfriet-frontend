// src/app/dashboard/permissions/page.tsx
"use client";

import * as React from "react";
import { toast } from "sonner";
import { Shield, Plus, Trash2, Pencil, Search, ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import FancyNavButton from "@/components/ui/fancy-nav-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { PermissionForm, GeneratedPermission, ModuleInfo } from "@/components/permissions/permission-form";
import { PermissionEditForm } from "@/components/permissions/permission-edit-form";

import {
  listPermissions,
  getPermissionById,
  createPermission,
  updatePermission,
  deletePermission,
  type PermissionItem,
} from "@/lib/permissions.api";

import { listModules } from "@/lib/modules.api"; // already implemented earlier
import PermissionBoundary from "@/components/permission-boundary";
import { ENTITY_PERMS } from "@/rbac/permissions-map";
import { useHasPermission } from "@/hooks/use-permission";

// Helper to map backend PermissionItem -> UI row
function toRow(p: PermissionItem, moduleMap: Map<string, string>): GeneratedPermission {
  return {
    id: p.id,
    name: p.title,
    moduleId: p.moduleId,
    moduleName: moduleMap.get(p.moduleId) || p.moduleId,
    action: p.slug,
    description: p.description ?? "",
  };
}

export default function PermissionsPage() {
  const [modules, setModules] = React.useState<ModuleInfo[]>([]);
  const [moduleNameById, setModuleNameById] = React.useState<Map<string, string>>(new Map());

  const [data, setData] = React.useState<GeneratedPermission[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [q, setQ] = React.useState("");
  const [openCreate, setOpenCreate] = React.useState(false);

  const [editOpen, setEditOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<GeneratedPermission | null>(null);

  // pagination - updated to use 7 items per page
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 7;
  // optional module filter (UI later if needed)
  const [moduleFilter] = React.useState<string | undefined>(undefined);

  // RBAC gates
  const canList   = useHasPermission(ENTITY_PERMS.permissions.list);
  const canCreate = useHasPermission(ENTITY_PERMS.permissions.create);
  const canRead   = useHasPermission(ENTITY_PERMS.permissions.read);
  const canUpdate = useHasPermission(ENTITY_PERMS.permissions.update);
  const canDelete = useHasPermission(ENTITY_PERMS.permissions.delete);

  // Load modules first (for names in table and forms)
  React.useEffect(() => {
    (async () => {
      try {
        const { rows } = await listModules(1, 100); // pull enough
        const mods: ModuleInfo[] = rows.map((m) => ({
          id: m.id,
          name: m.title,
          description: "", // fallback, not in backend
        }));
        setModules(mods);
        const map = new Map<string, string>();
        mods.forEach((m) => map.set(m.id, m.name));
        setModuleNameById(map);
      } catch (e: any) {
        console.error(e);
        toast.error(e?.response?.data?.message || "Failed to load modules");
      }
    })();
  }, []);

  // Load permissions - fetch all data for client-side pagination
  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        // Fetch all permissions for client-side pagination
        if (!canList) { setData([]); return; }
        const { rows } = await listPermissions({ page: 1, limit: 1000, moduleId: moduleFilter });
        setData(rows.map((p) => toRow(p, moduleNameById)));
      } catch (e: any) {
        console.error(e);
        toast.error(e?.response?.data?.message || "Failed to load permissions");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleFilter, moduleNameById, canList]);

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return data;
    return data.filter(
      (r) =>
        r.name.toLowerCase().includes(s) ||
        (r.moduleName ?? "").toLowerCase().includes(s) ||
        r.action.toLowerCase().includes(s) ||
        r.description.toLowerCase().includes(s)
    );
  }, [q, data]);

  // Pagination logic
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filtered.slice(startIndex, endIndex);

  // Reset to first page when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [q]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const goToPrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  /** Batch-create from generator form (1 API call per row) */
  const addGenerated = async (items: GeneratedPermission[]) => {
    try {
      if (!canCreate) return;
      // Throttle-friendly sequential creation
      for (const it of items) {
        await createPermission({
          moduleId: it.moduleId,
          title: it.name,
          slug: it.action,
          description: it.description,
        });
      }
      toast.success(`Created ${items.length} permission(s)`);
      // refresh
      const { rows } = await listPermissions({ page: 1, limit: 1000, moduleId: moduleFilter });
      setData(rows.map((p) => toRow(p, moduleNameById)));
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Create failed");
    }
  };

  const openEdit = async (row: GeneratedPermission) => {
    try {
      if (!canUpdate) return;
      const p = await getPermissionById(row.id);
      setEditing(toRow(p, moduleNameById));
      setEditOpen(true);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Failed to open permission");
    }
  };

  const saveEdit = async (p: GeneratedPermission) => {
    try {
      if (!canUpdate) return;
      await updatePermission({
        id: p.id,
        moduleId: p.moduleId,
        title: p.name,
        slug: p.action,
        description: p.description,
      });
      toast.success("Permission updated");
      // local update (optimistic)
      setData((prev) => prev.map((x) => (x.id === p.id ? p : x)));
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Update failed");
    }
  };

  const removeRow = async (id: string) => {
    try {
      if (!canDelete) return;
      await deletePermission(id);
      toast.success("Permission deleted");
      setData((prev) => prev.filter((x) => x.id !== id));
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Delete failed");
    }
  };

  const actionPill = (a: string) => {
    const map: Record<string, string> = {
      create: "bg-emerald-500/10 text-emerald-600",
      read: "bg-sky-500/10 text-sky-600",
      update: "bg-amber-500/10 text-amber-600",
      delete: "bg-red-500/10 text-red-600",
      readAll: "bg-indigo-500/10 text-indigo-600",
    };
    return (
      <Badge variant="secondary" className={`${map[a] || ""} capitalize`}>
        {a === "readAll" ? "read all" : a}
      </Badge>
    );
  };

  return (
    <PermissionBoundary screen="/dashboard/permissions" mode="block">

      <div className="space-y-6 scrollbar-stable">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Permissions</h1>
          <p className="text-muted-foreground">Manage system permissions and access control</p>
        </div>
        <Button className="gap-2" onClick={() => setOpenCreate(true)} disabled={!canCreate}>
          <Plus className="h-4 w-4" />
          Add permission
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-2xl">All Permissions</CardTitle>
            <div className="relative w-[350px] max-w-[50vw]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search permissions..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-9 pl-9"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-6">
          <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-200">
                <TableHead className="w-9 rounded-tl-xl" />
                <TableHead>Permission</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[120px] text-right rounded-tr-xl">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {paginatedData.map((row, idx) => {
                    const isLast = idx === paginatedData.length - 1;
                    return (
                    <TableRow key={row.id} className="odd:bg-muted/30 even:bg-white">
                      <TableCell>
                        <Shield className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                      <TableCell className={`font-medium ${isLast ? 'rounded-bl-xl' : ''}`}>{row.name}</TableCell>
                      <TableCell>{row.moduleName}</TableCell>
                      <TableCell>{actionPill(row.action)}</TableCell>
                      <TableCell className="text-muted-foreground">{row.description}</TableCell>
                      <TableCell className={`text-right ${isLast ? 'rounded-br-xl' : ''}`}>
                        <div className="flex justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="More actions">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              {canUpdate && (
                                <DropdownMenuItem className="gap-2" onClick={() => openEdit(row)}>
                                  <Pencil className="h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              {canDelete && (
                                <DropdownMenuItem
                                  className="gap-2 text-destructive focus:text-destructive"
                                  onClick={() => removeRow(row.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );})}
                  {!paginatedData.length && !loading && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No permissions found.
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )}
            </TableBody>
          </Table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, filtered.length)} of {filtered.length} permissions
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPrevious}
                  disabled={currentPage === 1}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => goToPage(page)}
                      className="w-8 h-8 p-0"
                    >
                      {page}
                    </Button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNext}
                  disabled={currentPage === totalPages}
                  className="gap-1"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create (auto-generate multiple) */}
      <PermissionForm
        open={openCreate}
        onOpenChange={setOpenCreate}
        modules={modules}
        onCreate={addGenerated}
      />

      {/* Edit single */}
      <PermissionEditForm
        open={editOpen}
        onOpenChange={setEditOpen}
        modules={modules}
        value={editing}
        onSave={saveEdit}
      />
      </div>
    </PermissionBoundary>
  );
}
