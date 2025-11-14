"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Props = {
  /** Optional external trigger button */
  trigger?: React.ReactNode;
  onAdded?: (p: {
    name: string;
    jobFile: string;
    price: number;
    description: string;
    stock: string;
  }) => void;
};

export default function AddProductDialog({ trigger, onAdded }: Props) {
  const [open, setOpen] = React.useState(false);

  const [form, setForm] = React.useState({
    name: "",
    jobFile: "",
    price: "",
    description: "",
    stock: "Unlimited",
  });

  function update<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  function submit() {
    const price = Number(form.price || 0);
    const payload = {
      name: form.name.trim(),
      jobFile: form.jobFile.trim() || "General",    
      price,
      description: form.description.trim(),
      stock: form.stock.trim() || "Unlimited",
    };

    onAdded?.(payload);
    toast.success("Product added");
    setOpen(false);
    // clear
    setForm({ name: "", jobFile: "", price: "", description: "", stock: "Unlimited" });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button>Add Product</Button>}
      </DialogTrigger>

      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add New Product/Service</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="prod-name">Name</Label>
            <Input
              id="prod-name"
              placeholder="Product or service name"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prod-job-file">Job File</Label>
            <Input
              id="prod-job-file"
              placeholder="e.g., Service, Design, Marketing"
              value={form.jobFile}
              onChange={(e) => update("jobFile", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prod-price">Price ($)</Label>
            <Input
              id="prod-price"
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={form.price}
              onChange={(e) => update("price", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prod-desc">Description</Label>
            <Textarea
              id="prod-desc"
              placeholder="Product description"
              rows={4}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prod-stock">Stock (or “Unlimited” for services)</Label>
            <Input
              id="prod-stock"
              placeholder="Unlimited"
              value={form.stock}
              onChange={(e) => update("stock", e.target.value)}
            />
          </div>

          <div className="pt-2">
            <Button className="w-full" onClick={submit}>
              Add Product
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
