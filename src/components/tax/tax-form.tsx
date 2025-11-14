// src/components/tax/tax-form.tsx
"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export type TaxFormValue = {
  id?: string;
  title: string;
  value: number;      // percent/value
  is_active: boolean;
};

export default function TaxFormDialog({
  open,
  onOpenChange,
  mode,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  initial?: TaxFormValue;
  onSubmit: (val: TaxFormValue) => void;
}) {
  const [title, setTitle] = React.useState(initial?.title ?? "");
  const [value, setValue] = React.useState<number>(initial?.value ?? 0);
  const [active, setActive] = React.useState(initial?.is_active ?? true);

  React.useEffect(() => {
    if (!open) return;
    setTitle(initial?.title ?? "");
    setValue(initial?.value ?? 0);
    setActive(initial?.is_active ?? true);
  }, [open, initial]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: TaxFormValue = {
      id: initial?.id,
      title: title.trim(),
      value: Number.isFinite(value) ? value : 0,
      is_active: active,
    };
    onSubmit(payload);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0">
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle>{mode === "create" ? "Create New Tax" : "Edit Tax"}</DialogTitle>
        </DialogHeader>

      <form onSubmit={handleSubmit} className="flex max-h-[90vh] flex-col">
  <div className="px-6 pb-6 overflow-y-auto max-h-[calc(90vh-144px)] space-y-4">
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="tax-title">Title *</Label>
        <Input
          id="tax-title"
          placeholder="VAT"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
    </div>

    <div className="space-y-2">
      <Label htmlFor="tax-value">Value (%) *</Label>
      <Input
        id="tax-value"
        type="number"
        inputMode="decimal"
        step="0.01"
        min={0}
        value={Number.isFinite(value) ? String(value) : ""}
        onChange={(e) => setValue(Number(e.target.value))}
        placeholder="17"
        required
      />
    </div>

    <div className="flex items-center justify-between rounded-lg border p-3">
      <div>
        <div className="font-medium">Active Status</div>
        <p className="text-xs text-muted-foreground">
          Enable this tax for use in invoices
        </p>
      </div>
      <Switch checked={active} onCheckedChange={setActive} />
    </div>
  </div>

  <div className="sticky flex justify-end gap-2 border-t bg-background px-6 py-4">
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
