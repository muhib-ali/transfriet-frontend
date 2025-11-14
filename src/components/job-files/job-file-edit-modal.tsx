// src/components/categories/category-edit-modal.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type JobFile = { title: string; description: string };

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: JobFile | null;              // prefilled values
  onUpdate: (updated: JobFile) => void; // emit updated values
};

export default function JobFileEditModal({
  open,
  onOpenChange,
  initial,
  onUpdate,
}: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // prefill when opening / when initial changes
  useEffect(() => {
    setTitle(initial?.title ?? "");
    setDescription(initial?.description ?? "");
  }, [initial, open]);

  const handleSave = () => {
    if (!title.trim()) return;
    onUpdate({ title: title.trim(), description: description.trim() });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Job File</DialogTitle>
          <DialogDescription>Update job files information</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-cat-title">Job File Title *</Label>
            <Input
              id="edit-cat-title"
              placeholder="Enter category title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-cat-desc">Description</Label>
            <Textarea
              id="edit-cat-desc"
              placeholder="Enter category description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Update</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
