"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function InvoiceSettings() {
  function onSave(e: React.FormEvent) {
    e.preventDefault();
    toast.success("Invoice settings saved");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice Configuration</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSave} className="grid gap-6">
          <div className="grid gap-2 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Invoice Number Prefix</label>
              <Input defaultValue="INV-" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Starting Number</label>
              <Input defaultValue="1000" type="number" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Default Payment Terms (days)</label>
            <Select defaultValue="30">
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="45">45 days</SelectItem>
                <SelectItem value="60">60 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Default Currency</label>
            <Select defaultValue="usd">
              <SelectTrigger><SelectValue placeholder="Currency" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="usd">USD ($)</SelectItem>
                <SelectItem value="eur">EUR (€)</SelectItem>
                <SelectItem value="gbp">GBP (£)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Default Invoice Note</label>
            <Textarea defaultValue="Thank you for your business..." rows={3} />
          </div>

          <div>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
