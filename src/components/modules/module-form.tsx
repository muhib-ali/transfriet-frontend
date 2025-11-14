// src/components/modules/module-form.tsx
"use client";

import * as React from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export type ModuleRow = {
  id: string;
  name: string;         // maps -> title
  slug: string;         // NEW: backend needs this
  description: string;
  icon: string;         // UI-only
  active: boolean;      // maps -> is_active
};

export type ModuleFormProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  initial?: Partial<ModuleRow>;
  onSubmit: (data: ModuleRow) => void;
};

function slugify(s: string) {
  return s
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^A-Za-z0-9_-]/g, "")
    .replace(/^-+|-+$/g, "");
}

export default function ModuleFormDialog({
  open,
  onOpenChange,
  mode,
  initial,
  onSubmit,
}: ModuleFormProps) {
  const [name, setName] = React.useState(initial?.name ?? "");
  const [slug, setSlug] = React.useState(initial?.slug ?? "");
  const [desc, setDesc] = React.useState(initial?.description ?? "");
  const [icon, setIcon] = React.useState(initial?.icon ?? "Package");
  const [active, setActive] = React.useState(initial?.active ?? true);

  // reset when different row is edited / opened
  React.useEffect(() => {
    setName(initial?.name ?? "");
    setSlug(initial?.slug ?? "");
    setDesc(initial?.description ?? "");
    setIcon(initial?.icon ?? "Package");
    setActive(initial?.active ?? true);
  }, [initial, open]);

  // auto-suggest slug from name if slug empty
  React.useEffect(() => {
    if (mode === "create" && !slug.trim()) {
      setSlug(slugify(name));
    }
  }, [name, mode, slug]);

  const title = mode === "create" ? "Create New Module" : "Edit Module";
  const cta   = mode === "create" ? "Create" : "Update";

  const disabled = !name.trim() || !slug.trim() || !desc.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Add a new module to your system"
              : "Update module information"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="m-name">Module Name *</Label>
            <Input
              id="m-name"
              placeholder="e.g., Claim Management"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="m-slug">Slug *</Label>
            <Input
              id="m-slug"
              placeholder="claimManagement"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              Backend requires a slug (e.g. <b>claimManagement</b>)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="m-desc">Description *</Label>
            <Textarea
              id="m-desc"
              placeholder="Describe what this module does"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="m-icon">Icon Name (UI-only)</Label>
            <Input
              id="m-icon"
              placeholder="Package"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              Lucide icon name (e.g. <b>Package</b>, <b>Boxes</b>, <b>Cube</b>, <b>Users</b>).
            </p>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label className="mb-0">Active Status</Label>
              <p className="text-xs text-muted-foreground">Enable this module for use</p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              const payload: ModuleRow = {
                id: initial?.id ?? crypto.randomUUID(), // UI id (backend returns its own id)
                name: name.trim(),
                slug: slug.trim(),
                description: desc.trim(),
                icon: icon.trim() || "Package",
                active,
              };
              onSubmit(payload);
              onOpenChange(false);
            }}
            disabled={disabled}
          >
            {cta}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
