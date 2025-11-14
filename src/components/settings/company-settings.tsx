"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function CompanySettings() {
  function onSave(e: React.FormEvent) {
    e.preventDefault();
    toast.success("Company settings saved");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>Company Information</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSave} className="grid grid-cols-1 gap-6">
          <div className="grid gap-2 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Company Name</label>
              <Input defaultValue="InvoicePro" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email</label>
              <Input defaultValue="contact@invoicepro.com" type="email" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Address</label>
            <Textarea defaultValue="123 Business Street, Suite 100 New York, NY 10001" rows={3} />
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Phone</label>
              <Input defaultValue="+1 (555) 123-4567" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Website</label>
              <Input defaultValue="www.invoicepro.com" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Tax ID / VAT Number</label>
            <Input placeholder="Enter tax identification number" />
          </div>

          <div>
            <Button type="submit" className="gap-2">Save Changes</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
