"use client";

import { ReactNode, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AddClientForm, ClientFormValues } from "./add-client-form";
import { toast } from "sonner";

type Props = {
  trigger?: ReactNode;
  onCreate?: (values: ClientFormValues) => Promise<void> | void;
};

export function AddClientDialog({ trigger, onCreate }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(values: ClientFormValues) {
    try {
      setSaving(true);
      if (onCreate) await onCreate(values);
      toast.success("Client added");
      setOpen(false);
    } catch (e) {
      toast.error("Failed to add client");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Client
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Client</DialogTitle>
        </DialogHeader>

        <AddClientForm onSubmit={handleSubmit} submitting={saving} />
      </DialogContent>
    </Dialog>
  );
}
