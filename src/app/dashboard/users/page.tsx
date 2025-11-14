// src/app/dashboard/users/page.tsx
"use client";

import * as React from "react";
import { toast } from "sonner";
import { Search, Pencil, Trash2, Plus, Shield, ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import PermissionBoundary from "@/components/permission-boundary";
import UserForm, {
  UserInput,
  UserRow,
  RoleOption,
} from "@/components/users/user-form";
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  getUserById,
} from "@/lib/users.api";
import { listRoles } from "@/lib/roles.api";
import apiClient from "@/lib/api-client"; // for dropdowns fallback

import { ENTITY_PERMS } from "@/rbac/permissions-map";
import { useHasPermission } from "@/hooks/use-permission";

/**
 * FancyNavButton - adapted from provided snippet. Uses a native <button>
 * Props: text, icon, active, onClick, disabled
 */
import FancyNavButton from "@/components/ui/fancy-nav-button";

export default function UsersPage() {
  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [users, setUsers] = React.useState<UserRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  // pagination (simple)
  const [page] = React.useState(1);
  const [limit] = React.useState(10);

  // roles for dropdown
  const [roleOptions, setRoleOptions] = React.useState<RoleOption[]>([]);
  const roleTitleMap = React.useMemo(
    () =>
      roleOptions.reduce<Record<string, string>>((acc, r) => {
        acc[r.id] = r.title;
        return acc;
      }, {}),
    [roleOptions]
  );

  // dialogs
  const [editing, setEditing] = React.useState<UserRow | null>(null);
  const [openCreate, setOpenCreate] = React.useState(false);
  const [openEdit, setOpenEdit] = React.useState(false);

  // RBAC
  const canListUsers = useHasPermission(ENTITY_PERMS.users.list);
  const canCreate = useHasPermission(ENTITY_PERMS.users.create);
  const canRead = useHasPermission(ENTITY_PERMS.users.read);
  const canUpdate = useHasPermission(ENTITY_PERMS.users.update);
  const canDelete = useHasPermission(ENTITY_PERMS.users.delete);
  const canListRoles = useHasPermission(ENTITY_PERMS.roles?.list); // admin roles endpoint

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // load roles + users
  React.useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);

        // ---- Roles for the dropdown (safe) ----
        try {
          if (canListRoles) {
            const { rows: rolesRows } = await listRoles(1, 100, undefined, { signal: ac.signal });
            setRoleOptions(rolesRows.map((r) => ({ id: r.id, title: r.title })));
          } else {
            const { data } = await apiClient.get<{
              data: { roles: { id: string; title: string }[] };
            }>("/dropdowns/getAllRoles", { signal: ac.signal });
            const roles = data?.data?.roles ?? [];
            setRoleOptions(roles.map((r) => ({ id: r.id, title: r.title })));
          }
        } catch (e: any) {
          if (e?.code === "ERR_CANCELED" || e?.message === "canceled") return;
          if (e?.response?.status !== 403) {
            console.error(e);
            toast.error(e?.response?.data?.message || "Failed to load roles list");
          }
          setRoleOptions([]);
        }

        // ---- Users (independent from roles fetch) ----
        if (!canListUsers) {
          setUsers([]);
          return;
        }
        const { rows } = await listUsers(page, limit, debouncedQuery || undefined, { signal: ac.signal });
        setUsers(
          rows.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            roleId: u.roleId,
            role_title: u.role_title ?? "",
            is_active: u.is_active,
          }))
        );
      } catch (e: any) {
        if (e?.code === "ERR_CANCELED" || e?.message === "canceled") return;
        console.error(e);
        toast.error(e?.response?.data?.message || "Failed to load users");
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [page, limit, canListUsers, canListRoles, debouncedQuery]);

  const filtered = users;

  // CREATE
  async function handleCreate(data: UserInput) {
    if (!canCreate) return;
    try {
      await createUser({
        roleId: data.roleId,
        name: data.name.trim(),
        email: data.email.trim(),
        password: data.password!.trim(),
      });
      toast.success("User created");

      const { rows } = await listUsers(page, limit, debouncedQuery || undefined);
      setUsers(
        rows.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          roleId: u.roleId,
          role_title: u.role_title ?? "",
          is_active: u.is_active,
        }))
      );
      setOpenCreate(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Create failed");
    }
  }

  // EDIT OPEN
  async function openEditDialog(id: string) {
    if (!canUpdate) return;
    try {
      const u = await getUserById(id);
      setEditing({
        id: u.id,
        name: u.name,
        email: u.email,
        roleId: u.roleId,
        role_title: u.role_title ?? "",
        is_active: u.is_active,
      });
      setOpenEdit(true);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Failed to open user");
    }
  }

  // UPDATE  (⚠️ do NOT send is_active — backend forbids it)
  async function handleUpdate(data: UserInput) {
    if (!canUpdate || !editing?.id) return;
    try {
      await updateUser({
        id: editing.id,
        roleId: data.roleId,
        name: data.name.trim(),
        email: data.email.trim(),
        password: data.password?.trim() ? data.password.trim() : undefined,
      });
      toast.success("User updated");

      const { rows } = await listUsers(page, limit, debouncedQuery || undefined);
      setUsers(
        rows.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          roleId: u.roleId,
          role_title: u.role_title ?? "",
          is_active: u.is_active,
        }))
      );
      setOpenEdit(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Update failed");
    }
  }

  // DELETE
  async function handleDelete(id: string) {
    if (!canDelete) return;
    try {
      await deleteUser(id);
      toast.success("User deleted");
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Delete failed");
    }
  }

  return (
    <PermissionBoundary screen="/dashboard/users" mode="block">
        <div className="space-y-6 scrollbar-stable">
      {/* Page header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Users</h1>
          <p className="text-muted-foreground">Manage system users and their roles</p>
        </div>
        {/* Fancy Add User button (replaces default Button) */}
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild>
            {/* <FancyNavButton
              text="Add User"
              icon={<Plus className="mr-2 h-4 w-4" />}
              onClick={() => setOpenCreate(true)}
              active={false}
              disabled={!canCreate}
            /> */}
             <Button className="gap-2" onClick={() => setOpenCreate(true)} disabled={!canCreate} >
                        <Plus className="h-4 w-4" />
                        Add User
                      </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
            </DialogHeader>
            <UserForm
              mode="create"
              roles={roleOptions}
              submitLabel="Create"
              onCancel={() => setOpenCreate(false)}
              onSubmit={handleCreate}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Card */}
      <Card className="shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-2xl">All Users</CardTitle>
            <div className="relative w-full sm:w-[350px] max-w-[50vw]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search users..."
                className="h-9 pl-9"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-6">
          {/* Table */}
          <div className="relative w-full overflow-x-auto rounded-xl border">
            <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b">
              <tr className="text-muted-foreground bg-gray-200">
                <th className="h-12 px-6 text-left font-medium rounded-tl-xl">User</th>
                <th className="h-12 px-6 text-left font-medium">Email</th>
                <th className="h-12 px-6 text-left font-medium">Role</th>
                <th className="h-12 px-6 text-left font-medium">Status</th>
                <th className="h-12 px-6 text-left font-medium rounded-tr-xl">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-10 text-center text-muted-foreground"
                  >
                    Loading users…
                  </td>
                </tr>
              ) : !canListUsers ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-10 text-center text-muted-foreground"
                  >
                    You don’t have permission to view users.
                  </td>
                </tr>
              ) : (
                <>
                  {filtered.map((u, idx) => {
                    const isLast = idx === filtered.length - 1;
                    return (
                    <tr key={u.id} className="odd:bg-muted/30 even:bg-white">
                      <td className={`px-6 py-4 ${isLast ? 'rounded-bl-xl' : ''}`}>
                        <div className="flex items-center gap-3">
                          <Initials avatarFor={u.name} />
                          <div className="font-medium">{u.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">{u.email}</td>
                      <td className="px-6 py-4">
                        <Badge variant="secondary" className="gap-1">
                          <Shield className="h-3.5 w-3.5" />
                          {/* Prefer backend label, else map fallback */}
                          {u.role_title || roleTitleMap[u.roleId] || "—"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          className={cn(
                            "capitalize",
                            u.is_active
                              ? "bg-blue-600 text-primary-foreground"
                              : "bg-muted text-foreground"
                          )}
                        >
                          {u.is_active ? "active" : "inactive"}
                        </Badge>
                      </td>
                      <td className={`px-6 py-4 ${isLast ? 'rounded-br-xl' : ''}`}>
                        <div className="flex justify-end">
                          {/* Keep Dialog mounted; open via state on dropdown click */}
                          <Dialog
                            open={openEdit && editing?.id === u.id}
                            onOpenChange={(o) => { if (!o) setOpenEdit(false); }}
                          >
                            <DialogContent className="max-h-[85vh] overflow-auto">
                              <DialogHeader>
                                <DialogTitle>Edit User</DialogTitle>
                              </DialogHeader>
                              <UserForm
                                mode="edit"
                                roles={roleOptions}
                                initial={editing ?? undefined}
                                submitLabel="Update"
                                onCancel={() => setOpenEdit(false)}
                                onSubmit={handleUpdate}
                              />
                            </DialogContent>
                          </Dialog>

                          {/* Actions dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="More actions">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              {canUpdate && (
                                <DropdownMenuItem className="gap-2" onClick={() => openEditDialog(u.id)}>
                                  <Pencil className="h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              {canDelete && (
                                <DropdownMenuItem
                                  className="gap-2 text-destructive focus:text-destructive"
                                  onClick={() => handleDelete(u.id)}
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
                  );})}

                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-10 text-center text-muted-foreground"
                      >
                        No users found.
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
              {`Showing ${filtered.length ? 1 : 0} to ${filtered.length} of ${filtered.length} users`}
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
    </div>
    </PermissionBoundary>
  
  );
}

/** Small initials avatar */
function Initials({ avatarFor }: { avatarFor: string }) {
  const parts = avatarFor.trim().split(/\s+/);
  const letters = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  return (
    <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
      {letters.toUpperCase()}
    </div>
  );
}
