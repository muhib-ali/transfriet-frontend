"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ModuleInfo, GeneratedPermission } from "./permission-form";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  modules: ModuleInfo[];
  value: GeneratedPermission | null;
  onSave: (p: GeneratedPermission) => void;
};

export function PermissionEditForm({ open, onOpenChange, modules, value, onSave }: Props) {
  const [draft, setDraft] = React.useState<GeneratedPermission | null>(value);

  React.useEffect(() => setDraft(value), [value]);

  if (!draft) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Permission</DialogTitle>
          <DialogDescription>Update permission information.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Permission Name</Label>
            <Input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Module</Label>
            <Select
              value={draft.moduleId}
              onValueChange={(v) => {
                const mod = modules.find((m) => m.id === v)!;
                setDraft({ ...draft, moduleId: v, moduleName: mod.name });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose module" />
              </SelectTrigger>
              <SelectContent>
                {modules.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Action</Label>
            <Input
              value={draft.action}
              onChange={(e) => setDraft({ ...draft, action: e.target.value })}
              placeholder="create / read / update / delete / readAll / custom_key"
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => {
              onSave(draft);
              onOpenChange(false);
            }}
          >
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
