// src/components/categories/category-form.tsx
"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type JobFileFormValue = {
  id?: string;
  title: string;
  description?: string;
  subcategory_id?: string | null;
};

type ParentOption = { id: string; title: string };

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  initial?: JobFileFormValue;
  parents: ParentOption[]; // for dropdown
  onSubmit: (payload: JobFileFormValue) => Promise<void> | void;
};

export default function JobFileFormDialog({
  open,
  onOpenChange,
  mode,
  initial,
  parents,
  onSubmit,
}: Props) {
  const [title, setTitle] = React.useState(initial?.title ?? "");
  const [description, setDescription] = React.useState(initial?.description ?? "");
  const [parentId, setParentId] = React.useState<string | undefined>(
    initial?.subcategory_id ?? undefined
  );

  React.useEffect(() => {
    setTitle(initial?.title ?? "");
    setDescription(initial?.description ?? "");
    setParentId(initial?.subcategory_id ?? undefined);
  }, [initial, open]);

  const handleSave = async () => {
    if (!title.trim()) return;
    await onSubmit({
      id: initial?.id,
      title: title.trim(),
      description: description.trim(),
      subcategory_id: parentId ?? null,
    });
  };

  return (  
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create Job File" : "Edit Job File"}</DialogTitle>
          <DialogDescription>
            {mode === "create" ? "Add a new job file" : "Update job file information"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="job-file-title">Title *</Label>
            <Input
              id="job-file-title"
              placeholder="Enter job file title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="job-file-desc">Description</Label>
            <Textarea
              id="job-file-desc"
              placeholder="Enter job file description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Parent Category</Label>
            <Select
              value={parentId ?? "none"}
              onValueChange={(v) => setParentId(v === "none" ? undefined : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select parent (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {parents.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>{mode === "create" ? "Create" : "Update"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
