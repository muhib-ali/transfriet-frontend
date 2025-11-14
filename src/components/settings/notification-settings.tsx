"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useState } from "react";

export function NotificationSettings() {
  const [email, setEmail] = useState(true);
  const [received, setReceived] = useState(true);
  const [overdue, setOverdue] = useState(true);
  const [newClient, setNewClient] = useState(false);

  function onSave() {
    toast.success("Notification preferences updated");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <p className="font-medium">Email Notifications</p>
            <p className="text-sm text-muted-foreground">
              Receive email updates for important events
            </p>
          </div>
          <Switch checked={email} onCheckedChange={setEmail} />
        </div>

        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <p className="font-medium">Payment Received</p>
            <p className="text-sm text-muted-foreground">
              Get notified when payments are received
            </p>
          </div>
          <Switch checked={received} onCheckedChange={setReceived} />
        </div>

        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <p className="font-medium">Overdue Invoices</p>
            <p className="text-sm text-muted-foreground">Alert for overdue invoices</p>
          </div>
          <Switch checked={overdue} onCheckedChange={setOverdue} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">New Client Registration</p>
            <p className="text-sm text-muted-foreground">Notify when new clients are added</p>
          </div>
          <Switch checked={newClient} onCheckedChange={setNewClient} />
        </div>

        <Button onClick={onSave}>Save Changes</Button>
      </CardContent>
    </Card>
  );
}
