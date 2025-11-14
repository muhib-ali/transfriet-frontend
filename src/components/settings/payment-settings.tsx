"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

export function PaymentSettings() {
  const [stripe, setStripe] = useState(true);
  const [paypal, setPaypal] = useState(true);
  const [bank, setBank] = useState(true);

  function onSave() {
    toast.success("Payment methods saved");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Methods</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <p className="font-medium">Credit Card (Stripe)</p>
            <p className="text-sm text-muted-foreground">Accept credit card payments via Stripe</p>
          </div>
          <Switch checked={stripe} onCheckedChange={setStripe} />
        </div>

        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <p className="font-medium">PayPal</p>
            <p className="text-sm text-muted-foreground">Accept PayPal payments</p>
          </div>
          <Switch checked={paypal} onCheckedChange={setPaypal} />
        </div>

        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <p className="font-medium">Bank Transfer</p>
            <p className="text-sm text-muted-foreground">Allow direct bank transfers</p>
          </div>
          <Switch checked={bank} onCheckedChange={setBank} />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Bank Account Details</label>
          <Textarea placeholder="Enter your bank account details for direct transfers..." rows={4} />
        </div>

        <Button onClick={onSave}>Save Changes</Button>
      </CardContent>
    </Card>
  );
}
