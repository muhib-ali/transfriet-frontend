// src/components/products/product-form.tsx
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

export type ProductFormValue = {
  id?: string;
  title: string;

  description?: string;
  price: number;
  job_file_id?: string | null;
};

type JobFileOption = { id: string; title: string };

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  initial?: ProductFormValue;
  jobFiles: JobFileOption[];
  onSubmit: (payload: ProductFormValue) => Promise<void> | void;
};

export default function ProductFormDialog({
  open,
  onOpenChange,
  mode,
  initial,
  jobFiles,
  onSubmit,
}: Props) {
  const [title, setTitle] = React.useState(initial?.title ?? "");

  const [description, setDescription] = React.useState(initial?.description ?? "");
  const [price, setPrice] = React.useState<string>(
    initial?.price !== undefined ? String(initial.price) : ""
  );
  const [jobFileId, setJobFileId] = React.useState<string | undefined>(
    initial?.job_file_id ?? undefined
  );

  React.useEffect(() => {
    setTitle(initial?.title ?? "");

    setDescription(initial?.description ?? "");
    setPrice(initial?.price !== undefined ? String(initial.price) : "");
    setJobFileId(initial?.job_file_id ?? undefined);
  }, [initial, open]);

  const handleSave = async () => {
    if (!title.trim()) return;
    await onSubmit({
      id: initial?.id,
      title: title.trim(),
      description: description.trim(),
      price: Number(price || 0),
      job_file_id: jobFileId ?? null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create Product" : "Edit Product"}</DialogTitle>
          <DialogDescription>
            {mode === "create" ? "Add a new product" : "Update product information"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prod-title">Title *</Label>
            <Input
              id="prod-title"
              placeholder="Product title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          

          <div className="space-y-2">
            <Label htmlFor="prod-desc">Description</Label>
            <Textarea
              id="prod-desc"
              rows={3}
              placeholder="Product description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prod-price">Price *</Label>
            <Input
              id="prod-price"
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Job File</Label>
            <Select
              value={jobFileId ?? "none"}
              onValueChange={(v) => setJobFileId(v === "none" ? undefined : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select job file (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {jobFiles.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title}
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
