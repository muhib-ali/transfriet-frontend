// src/app/dashboard/roles/page.tsx
"use client";

import * as React from "react";
import { toast } from "sonner";
import { Shield, Plus, Pencil, Trash2, Search, Lock, Save, ChevronDown, ChevronLeft, ChevronRight, X, ChevronRight as ChevronRt, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import FancyNavButton from "@/components/ui/fancy-nav-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import PermissionBoundary from "@/components/permission-boundary";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";

import {
  listRoles,
  createRole,
  updateRole,
  deleteRole,
  getRoleById,
  getRolePerms,
  updateRolePerms,
} from "@/lib/roles.api";

import type { AdminRole } from "@/types/admin.types";
import { RoleForm, RoleData } from "@/components/roles/role-form";
import { RolePermissionsDialog } from "@/components/roles/role-permissions-dialog";

import { ENTITY_PERMS } from "@/rbac/permissions-map";
import { useHasPermission } from "@/hooks/use-permission";

// PermissionsDisplay component to show permissions grouped by modules
function PermissionsDisplay({
  roleId,
  roleTitle,
  canViewRolePerms,
  canUpdateRolePerms,
  onSaved,
}: {
  roleId: string;
  roleTitle: string;
  canViewRolePerms: boolean;
  canUpdateRolePerms: boolean;
  onSaved: (updated: any[]) => void;
}) {
  const [modules, setModules] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  // map of { [module_slug]: boolean }, all false by default
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = React.useState("");

  // Fetch permissions for the selected role
  React.useEffect(() => {
    async function fetchPermissions() {
      if (!roleId) return;

      setLoading(true);
      try {
        const perms = await getRolePerms(roleId);
        setModules(perms);

        // ❌ previously: expand modules that had allowed permissions
        // ✅ now: keep all accordions CLOSED by default
        const allClosed: Record<string, boolean> = {};
        perms.forEach((m: any) => {
          allClosed[m.module_slug] = false;
        });
        setExpanded(allClosed);
      } catch (error) {
        console.error("Error fetching permissions:", error);
        toast.error("Failed to load permissions");
      } finally {
        setLoading(false);
      }
    }

    fetchPermissions();
  }, [roleId]);

  // Calculate total selected permissions
  const totalSelected = modules.reduce(
    (sum, m) => sum + m.permissions.filter((p: any) => p.is_allowed).length,
    0
  );

  // Filter modules based on search query
  const filteredModules = React.useMemo(() => {
    if (!searchQuery.trim()) return modules;

    return modules.filter((m: any) =>
      m.module_slug.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [modules, searchQuery]);

  // Toggle module expansion
  function toggleModule(slug: string) {
    setExpanded((prev) => ({ ...prev, [slug]: !prev[slug] }));
  }

  // Toggle permission
  function togglePermission(moduleSlug: string, permId: string, checked: boolean) {
    if (!canUpdateRolePerms) return;

    setModules((prev: any[]) =>
      prev.map((m: any) =>
        m.module_slug !== moduleSlug
          ? m
          : {
              ...m,
              permissions: m.permissions.map((p: any) =>
                p.id === permId ? { ...p, is_allowed: checked } : p
              ),
            }
      )
    );
  }

  // Save permissions
  async function handleSave() {
    if (!canUpdateRolePerms) return;

    setSaving(true);
    try {
      await updateRolePerms({
        roleId,
        current: [],
        next: modules,
      });
      toast.success("Permissions updated");
      const fresh = await getRolePerms(roleId);
      setModules(fresh);
      onSaved(fresh);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update permissions");
    } finally {
      setSaving(false);
    }
  }

  // Clear search
  function clearSearch() {
    setSearchQuery("");
  }

  if (loading) {
    return <div className="py-4 text-sm text-muted-foreground">Loading permissions...</div>;
  }

  if (!canViewRolePerms && !canUpdateRolePerms) {
    return (
      <div className="py-4 text-sm text-muted-foreground">
        You don't have permission to view or update role permissions.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Toggle which actions this role can access.</div>
        <Badge variant="secondary">{totalSelected} allowed</Badge>
      </div>

      {/* Search bar for modules */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search modules..."
          className="w-full pl-8 pr-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Clear search</span>
          </button>
        )}
      </div>

      <div className="space-y-3">
        {filteredModules.length === 0 ? (
          <div className="py-4 text-sm text-muted-foreground text-center">
            No modules found matching "{searchQuery}"
          </div>
        ) : (
          filteredModules.map((m: any) => {
            const isOpen = !!expanded[m.module_slug];
            const selected = m.permissions.filter((p: any) => p.is_allowed).length;
            return (
              <div key={m.module_slug} className="rounded-xl border bg-card p-3">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleModule(m.module_slug)}
                  onKeyDown={(e) =>
                    (e.key === "Enter" || e.key === " ") && toggleModule(m.module_slug)
                  }
                  className="flex cursor-pointer items-center justify-between rounded-lg p-1 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-1">
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRt className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div className="font-medium capitalize text-sm">{m.module_slug}</div>
                  </div>
                  <Badge variant={selected ? "default" : "outline"} className="text-xs">
                    {selected} selected
                  </Badge>
                </div>

                {isOpen && (
                  <div className="mt-2 grid gap-1 md:grid-cols-2">
                    {m.permissions.map((p: any) => (
                      <label
                        key={p.id}
                        className="flex items-center justify-between rounded-lg border p-1.5 hover:bg-muted/40 text-sm"
                      >
                        <div>
                          <div className="font-medium text-sm">{p.permission_slug}</div>
                        </div>
                        <Switch
                          checked={p.is_allowed}
                          onCheckedChange={(v) => togglePermission(m.module_slug, p.id, v)}
                          disabled={!canUpdateRolePerms}
                        />
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {canUpdateRolePerms && (
        <div className="flex justify-end gap-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function RolesPage() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const [roles, setRoles] = React.useState<AdminRole[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [query, setQuery] = React.useState("");
  const [page] = React.useState(1);
  const [limit] = React.useState(10);

  const [openCreate, setOpenCreate] = React.useState(false);
  const [editRole, setEditRole] = React.useState<AdminRole | null>(null);

  const [openPerms, setOpenPerms] = React.useState(false);
  const [permRole, setPermRole] = React.useState<AdminRole | null>(null);

  // cache of "allowed permissions count" per role (lazy-loaded)
  const [permCountMap, setPermCountMap] = React.useState<Record<string, number>>({});

  const canList = useHasPermission(ENTITY_PERMS.roles.list);
  const canCreate = useHasPermission(ENTITY_PERMS.roles.create);
  const canRead = useHasPermission(ENTITY_PERMS.roles.read);
  const canUpdate = useHasPermission(ENTITY_PERMS.roles.update);
  const canDelete = useHasPermission(ENTITY_PERMS.roles.delete);
  const canViewRolePerms = useHasPermission(ENTITY_PERMS.roles.extras.getRolePerms);
  const canUpdateRolePerms = useHasPermission(ENTITY_PERMS.roles.extras.updateRolePerms);

  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  React.useEffect(() => {
    if (!mounted) return;
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        if (!canList) {
          setRoles([]);
          setPermCountMap({});
          return;
        }
        const { rows } = await listRoles(page, limit, debouncedQuery || undefined, { signal: ac.signal });
        setRoles(rows);
      } catch (e: any) {
        if (e?.code === "ERR_CANCELED" || e?.message === "canceled") return;
        console.error(e);
        toast.error(e?.response?.data?.message || "Failed to load roles");
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [mounted, canList, page, limit, debouncedQuery]);

  const filtered = roles;

  const displayPermCount = (r: AdminRole) =>
    typeof permCountMap[r.id] === "number" ? `${permCountMap[r.id]} permissions` : "—";

  async function handleCreate(data: RoleData) {
    if (!mounted || !canCreate) return;
    try {
      await createRole({ title: data.name });
      toast.success("Role created");
      const { rows } = await listRoles(page, limit);
      setRoles(rows);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Create failed");
    }
  }

  async function openEdit(roleId: string) {
    if (!mounted || ( !canUpdate)) return;
    try {
      const role = await getRoleById(roleId);
      setEditRole(role);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Failed to open role");
    }
  }

  async function handleUpdate(data: RoleData) {
    if (!mounted || !canUpdate || !editRole?.id) return;
    try {
      await updateRole({ id: editRole.id, title: data.name });
      toast.success("Role updated");
      const { rows } = await listRoles(page, limit);
      setRoles(rows);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Update failed");
    }
  }

  async function handleDelete(id: string) {
    if (!mounted || !canDelete) return;
    try {
      await deleteRole(id);
      toast.success("Role deleted");
      setRoles((prev) => prev.filter((r) => r.id !== id));
      setPermCountMap((prev) => {
        const cp = { ...prev };
        delete cp[id];
        return cp;
      });
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Delete failed");
    }
  }

  function openPermDialog(r: AdminRole) {
    if (!mounted || (!canViewRolePerms && !canUpdateRolePerms)) return;

    // Lazy-load the count for this role if missing, without bursting the API
    (async () => {
      if (permCountMap[r.id] == null) {
        try {
          const perms = await getRolePerms(r.id);
          const c = perms.reduce(
            (sum: number, m: any) => sum + m.permissions.filter((p: any) => p.is_allowed).length,
            0
          );
          setPermCountMap((prev) => ({ ...prev, [r.id]: c }));
        } catch {
          // ignore; keep undefined
        }
      }
    })();

    setPermRole(r);
    setOpenPerms(true);
  }

  const renderCreatedAt = (iso: string) => {
    if (!mounted) return "—";
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  const [activeTab, setActiveTab] = React.useState("roles");

  return (
    <PermissionBoundary screen="/dashboard/roles" mode="block">
      <div className="space-y-6 scrollbar-stable">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold truncate">Roles</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage user roles and permissions</p>
          </div>

          {/* Header actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {mounted && !canCreate && (
              <Badge variant="outline" className="gap-1">
                <Lock className="h-3.5 w-3.5" />
                No create access
              </Badge>
            )}
            {mounted && activeTab === "roles" && (
              <Button className="gap-2" onClick={() => setOpenCreate(true)} disabled={!canCreate}>
                <Plus className="h-4 w-4" />
                Add Role
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="roles" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="roles">Roles</TabsTrigger>
            <TabsTrigger value="permissions">Role Permissions</TabsTrigger>
          </TabsList>

          <TabsContent value="roles">
            <Card className="shadow-sm">
              <CardHeader className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-2xl">All Roles</CardTitle>
                  <div className="relative w-[350px] max-w-[50vw]">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="h-9 pl-9"
                      placeholder="Search roles..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-6">
                {loading ? (
                  <div className="text-sm text-muted-foreground">Loading roles…</div>
                ) : mounted && !canList ? (
                  <div className="text-sm text-muted-foreground">You don't have permission to view roles.</div>
                ) : (
                  <>
                    <div className="relative w-full overflow-x-auto rounded-xl border">
                      <table className="w-full caption-bottom text-sm">
                        <thead className="[&_tr]:border-b">
                          <tr className="text-left bg-gray-200">
                            <th className="p-4 font-medium rounded-tl-xl">Role</th>
                            <th className="p-4 font-medium">Created At</th>
                            <th className="p-4 font-medium">Permissions</th>
                            <th className="p-4 font-medium text-right rounded-tr-xl">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((r, idx) => {
                            const isLast = idx === filtered.length - 1;
                            return (
                              <tr key={r.id} className="odd:bg-muted/30 even:bg-white">
                                <td className={`p-4 ${isLast ? "rounded-bl-xl" : ""}`}>
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-9 w-9 shrink-0">
                                      <AvatarFallback className="bg-primary/10 text-primary">
                                        <Shield className="h-4 w-4" />
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                      <div className="font-medium truncate">{r.title}</div>
                                      <div className="text-xs text-muted-foreground truncate">slug: {r.slug}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-4 text-sm text-muted-foreground">{renderCreatedAt(r.created_at)}</td>
                                <td className="p-4">
                                  <Badge>{displayPermCount(r)}</Badge>
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
                                          <DropdownMenuItem className="gap-2" onClick={() => openEdit(r.id)}>
                                            <Pencil className="h-4 w-4" />
                                            Edit
                                          </DropdownMenuItem>
                                        )}
                                        {canDelete && (
                                          <DropdownMenuItem
                                            className="gap-2 text-destructive focus:text-destructive"
                                            onClick={() => handleDelete(r.id)}
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
                                No roles found.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    {/* Pagination Controls (UI only; logic unchanged) */}
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-muted-foreground">
                        {`Showing ${filtered.length ? 1 : 0} to ${filtered.length} of ${filtered.length} roles`}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" disabled className="gap-1">
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <div className="flex items-center gap-1">
                          <Button variant="default" size="sm" className="w-8 h-8 p-0">
                            1
                          </Button>
                        </div>
                        <Button variant="outline" size="sm" disabled className="gap-1">
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="permissions">
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Role Permissions</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-sm text-muted-foreground">Loading roles…</div>
                ) : mounted && !canList ? (
                  <div className="text-sm text-muted-foreground">You don't have permission to view roles.</div>
                ) : (
                  <div className="space-y-6">
                    {/* Role Selector */}
                    <div className="w-full max-w-md">
                      <label htmlFor="role-select" className="block text-sm font-medium mb-2">
                        Select Role
                      </label>
                      <select
                        id="role-select"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        onChange={(e) => {
                          const selectedRole = roles.find((r) => r.id === e.target.value);
                          if (selectedRole) {
                            setPermRole(selectedRole);
                            // Lazy compute count
                            (async () => {
                              if (permCountMap[selectedRole.id] == null) {
                                try {
                                  const perms = await getRolePerms(selectedRole.id);
                                  const c = perms.reduce(
                                    (sum: number, m: any) =>
                                      sum + m.permissions.filter((p: any) => p.is_allowed).length,
                                    0
                                  );
                                  setPermCountMap((prev) => ({ ...prev, [selectedRole.id]: c }));
                                } catch {
                                  // ignore
                                }
                              }
                            })();
                          }
                        }}
                        value={permRole?.id || ""}
                      >
                        <option value="" disabled>
                          -- Select a role --
                        </option>
                        {filtered.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Permissions Display */}
                    {permRole && (
                      <PermissionsDisplay
                        roleId={permRole.id}
                        roleTitle={permRole.title}
                        canViewRolePerms={canViewRolePerms}
                        canUpdateRolePerms={canUpdateRolePerms}
                        onSaved={(updated) => {
                          const count = updated.reduce(
                            (s: number, m: any) => s + m.permissions.filter((p: any) => p.is_allowed).length,
                            0
                          );
                          setPermCountMap((prev) =>
                            permRole ? { ...prev, [permRole.id]: count } : prev
                          );
                        }}
                      />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create dialog */}
        <RoleForm
          mode="create"
          open={openCreate}
          onOpenChange={setOpenCreate}
          onSubmit={(form) => handleCreate(form)}
        />

        {/* Edit dialog */}
        <RoleForm
          mode="edit"
          open={!!editRole}
          onOpenChange={(v) => !v && setEditRole(null)}
          initialData={
            editRole ? { id: editRole.id, name: editRole.title, description: "", grants: {} } : undefined
          }
          onSubmit={(form) => handleUpdate(form)}
        />

        {/* Permissions dialog */}
        {permRole && (
          <RolePermissionsDialog
            roleId={permRole.id}
            roleTitle={permRole.title}
            open={openPerms}
            onOpenChange={(v) => {
              if (!v) {
                setOpenPerms(false);
                setPermRole(null);
              } else {
                setOpenPerms(v);
              }
            }}
            onSaved={(updated) => {
              const count = updated.reduce(
                (s: number, m: any) => s + m.permissions.filter((p: any) => p.is_allowed).length,
                0
              );
              setPermCountMap((prev) => (permRole ? { ...prev, [permRole.id]: count } : prev));
            }}
          />
        )}
      </div>
    </PermissionBoundary>
  );
}
