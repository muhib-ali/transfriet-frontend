"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { ChevronDown, ChevronRight, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { getRolePerms, updateRolePerms } from "@/lib/roles.api";
import type { RoleModulePerm } from "@/types/admin.types";
import { toast } from "sonner";

export function RolePermissionsDialog({
  roleId,
  roleTitle,
  open,
  onOpenChange,
  onSaved,
}: {
  roleId: string;
  roleTitle: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: (updated: RoleModulePerm[]) => void;
}) {
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [modules, setModules] = React.useState<RoleModulePerm[]>([]);
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        setLoading(true);
        const perms = await getRolePerms(roleId);
        setModules(perms);
        const exp: Record<string, boolean> = {};
        perms.forEach((m) => {
          exp[m.module_slug] = m.permissions.some((p) => p.is_allowed);
        });
        setExpanded(exp);
      } catch (e: any) {
        console.error(e);
        toast.error(e?.response?.data?.message || "Failed to load permissions");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, roleId]);

  const totalSelected = modules.reduce(
    (sum, m) => sum + m.permissions.filter((p) => p.is_allowed).length,
    0
  );

  function toggleModule(slug: string) {
    setExpanded((prev) => ({ ...prev, [slug]: !prev[slug] }));
  }

  function togglePermission(moduleSlug: string, permId: string, checked: boolean) {
    setModules((prev) =>
      prev.map((m) =>
        m.module_slug !== moduleSlug
          ? m
          : {
              ...m,
              permissions: m.permissions.map((p) =>
                p.id === permId ? { ...p, is_allowed: checked } : p
              ),
            }
      )
    );
  }

  async function handleSave() {
    try {
      setSaving(true);
      await updateRolePerms({
        roleId,
        current: [],
        next: modules,
      });
      toast.success("Permissions updated");
      const fresh = await getRolePerms(roleId);
      setModules(fresh);
      onSaved(fresh);
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Failed to update permissions");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Fixed size container + internal scroll */}
      <DialogContent
        className={cn(
          "p-0",
          // fixed width on sm+, nearly full width on mobile
          "w-[95vw] max-w-none sm:w-[720px] sm:max-w-[720px]",
          // fixed height with viewport ratio
          "h-[80vh] max-h-[80vh]",
          // grid layout: sticky header, scrollable body, fixed footer
          "grid grid-rows-[auto,1fr,auto]"
        )}
      >
        {/* Sticky header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b sticky top-0 bg-background z-10">
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permissions — {roleTitle}
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="px-6 py-4 overflow-y-auto">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Toggle which actions this role can access.
                </div>
                <Badge variant="secondary">{totalSelected} allowed</Badge>
              </div>

              <div className="space-y-3">
                {modules.map((m) => {
                  const isOpen = expanded[m.module_slug];
                  const selected = m.permissions.filter((p) => p.is_allowed).length;
                  return (
                    <div key={m.module_slug} className="rounded-xl border bg-card p-3">
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleModule(m.module_slug)}
                        onKeyDown={(e) =>
                          (e.key === "Enter" || e.key === " ") && toggleModule(m.module_slug)
                        }
                        className={cn(
                          "flex cursor-pointer items-center justify-between rounded-lg p-2 hover:bg-muted/50"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {isOpen ? (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          )}
                          <div className="font-medium capitalize">{m.module_slug}</div>
                        </div>
                        <Badge variant={selected ? "default" : "outline"}>
                          {selected} selected
                        </Badge>
                      </div>

                      {isOpen && (
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          {m.permissions.map((p) => (
                            <label
                              key={p.id}
                              className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/40"
                            >
                              <div>
                                <div className="font-medium">{p.permission_slug}</div>
                                <div className="mt-1 text-xs text-muted-foreground">id: {p.id}</div>
                              </div>
                              <Switch
                                checked={p.is_allowed}
                                onCheckedChange={(v) => togglePermission(m.module_slug, p.id, v)}
                              />
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Fixed footer */}
        <div className="px-6 py-4 border-t flex justify-end gap-2 sticky bg-background">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
