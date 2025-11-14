"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

/** Types */
export type PermissionAction = "create" | "read" | "update" | "delete";
export type ModuleKey = "user" | "tickets" | "reports" | "invoices";

export interface RoleData {
  id?: string;
  name: string;
  description: string;
  grants: Partial<Record<ModuleKey, PermissionAction[]>>;
}

export interface RoleFormProps {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialData?: RoleData | null;
  onSubmit: (data: RoleData) => void;
}

/** Static modules->permissions (mock) */
const MODULES: Record<
  ModuleKey,
  { title: string; blurb: string; actions: PermissionAction[] }
> = {
  user:     { title: "User Management",    blurb: "Manage system users and their access", actions: ["create","read","update","delete"] },
  tickets:  { title: "Ticket Management",  blurb: "Manage support tickets and their lifecycle", actions: ["create","read","update","delete"] },
  reports:  { title: "Reporting",          blurb: "Generate and view system reports", actions: ["read"] },
  invoices: { title: "Invoice Management", blurb: "Create and manage invoices", actions: ["create","read","update","delete"] },
};

export function RoleForm({ mode, open, onOpenChange, initialData, onSubmit }: RoleFormProps) {
  const [name, setName] = React.useState(initialData?.name ?? "");
  const [desc, setDesc] = React.useState(initialData?.description ?? "");
  const [expanded, setExpanded] = React.useState<Record<ModuleKey, boolean>>({
    user: true, tickets: false, reports: false, invoices: false,
  });
  const [grants, setGrants] = React.useState<RoleData["grants"]>(
    initialData?.grants ?? {}
  );

  React.useEffect(() => {
    if (!open) return;
    setName(initialData?.name ?? "");
    setDesc(initialData?.description ?? "");
    setGrants(initialData?.grants ?? {});
  }, [open, initialData]);

  function toggleModule(module: ModuleKey) {
    setExpanded((p) => ({ ...p, [module]: !p[module] }));
  }

  function toggleAction(module: ModuleKey, action: PermissionAction, checked: boolean) {
    setGrants((prev) => {
      const existing = new Set(prev[module] ?? []);
      if (checked) existing.add(action);
      else existing.delete(action);
      const next = Array.from(existing);
      return { ...prev, [module]: next };
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: RoleData = {
      id: initialData?.id,
      name: name.trim(),
      description: desc.trim(),
      grants,
    };
    onSubmit(payload);
    onOpenChange(false);
  }

  const totalPerms = Object.values(grants).reduce((sum, arr) => sum + (arr?.length ?? 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* p-0 so we can build our own sticky header/footer + scrollable body */}
      <DialogContent className="sm:max-w-3xl p-0">
        {/* Fixed header */}
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {mode === "create" ? "Create New Role" : "Edit Role"}
          </DialogTitle>
        </DialogHeader>

        {/* Form with scrollable body and sticky footer */}
        <form onSubmit={handleSubmit} className="flex max-h-[90vh] flex-col">
          {/* Scrollable body: header( ~64px ) + footer( ~96px ) reserved */}
          <div className="px-6 pb-6 overflow-y-auto max-h-[calc(90vh-160px)]">
            {/* Top fields */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="role-name">Role Name *</Label>
                <Input
                  id="role-name"
                  placeholder="Enter role name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="role-desc">Description *</Label>
                <Input
                  id="role-desc"
                  placeholder="Brief description of the role"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  required
                />
              </div>
            </div>

            <Separator className="my-4" />

            {/* Modules & permissions */}
           
          </div>

          {/* Sticky footer (always visible) */}
          <div className="sticky flex justify-end gap-3 border-t bg-background px-6 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{mode === "create" ? "Create" : "Update"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
