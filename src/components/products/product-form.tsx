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
  price: number;
  job_file_id?: string | null;
  title_en: string;
  description_en?: string;
  title_ar: string;
  description_ar?: string;
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
  const [titleEn, setTitleEn] = React.useState(initial?.title_en ?? "");
  const [descEn, setDescEn] = React.useState(initial?.description_en ?? "");
  const [titleAr, setTitleAr] = React.useState(initial?.title_ar ?? "");
  const [descAr, setDescAr] = React.useState(initial?.description_ar ?? "");
  const [price, setPrice] = React.useState<string>(
    initial?.price !== undefined ? String(initial.price) : ""
  );
  const [jobFileId, setJobFileId] = React.useState<string | undefined>(
    initial?.job_file_id ?? undefined
  );

  React.useEffect(() => {
    setTitleEn(initial?.title_en ?? "");
    setDescEn(initial?.description_en ?? "");
    setTitleAr(initial?.title_ar ?? "");
    setDescAr(initial?.description_ar ?? "");
    setPrice(initial?.price !== undefined ? String(initial.price) : "");
    setJobFileId(initial?.job_file_id ?? undefined);
  }, [initial, open]);

  const handleSave = async () => {
    if (!titleEn.trim() || !titleAr.trim()) {
      // basic required validation; optionally show toast in parent
      return;
    }
    await onSubmit({
      id: initial?.id,
      price: Number(price || 0),
      job_file_id: jobFileId ?? null,
      title_en: titleEn.trim(),
      description_en: descEn.trim(),
      title_ar: titleAr.trim(),
      description_ar: descAr.trim(),
    });
  };

  const isSaveDisabled =
    !titleEn.trim() || !titleAr.trim() || !price || Number(price) <= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create Product" : "Edit Product"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Add a new product with English and Arabic details"
              : "Update product information in both languages"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* English Title */}
          <div className="space-y-2">
            <Label htmlFor="prod-title-en">Title (English) *</Label>
            <Input
              id="prod-title-en"
              placeholder="Product title in English"
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
            />
          </div>

          {/* Arabic Title */}
          <div className="space-y-2">
            <Label htmlFor="prod-title-ar">عنوان (Arabic Title) *</Label>
            <Input
              id="prod-title-ar"
              placeholder="عنوان المنتج بالعربية"
              dir="rtl"
              value={titleAr}
              onChange={(e) => setTitleAr(e.target.value)}
            />
          </div>

          {/* English Description */}
          <div className="space-y-2">
            <Label htmlFor="prod-desc-en">Description (English)</Label>
            <Textarea
              id="prod-desc-en"
              rows={3}
              placeholder="Product description in English"
              value={descEn}
              onChange={(e) => setDescEn(e.target.value)}
            />
          </div>

          {/* Arabic Description */}
          <div className="space-y-2">
            <Label htmlFor="prod-desc-ar">الوصف (Arabic Description)</Label>
            <Textarea
              id="prod-desc-ar"
              rows={3}
              placeholder="وصف المنتج بالعربية"
              dir="rtl"
              value={descAr}
              onChange={(e) => setDescAr(e.target.value)}
            />
          </div>

          {/* Price */}
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

          {/* Job File */}
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
            <Button onClick={handleSave} disabled={isSaveDisabled}>
              {mode === "create" ? "Create" : "Update"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
