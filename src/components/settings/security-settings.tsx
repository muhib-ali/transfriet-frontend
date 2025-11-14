"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

export function SecuritySettings() {
  const [twoFA, setTwoFA] = useState(false);

  function onUpdate(e: React.FormEvent) {
    e.preventDefault();
    toast.success("Security settings updated");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Security Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onUpdate} className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Current Password</label>
            <Input type="password" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">New Password</label>
            <Input type="password" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Confirm New Password</label>
            <Input type="password" />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Two-Factor Authentication</p>
              <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
            </div>
            <Switch checked={twoFA} onCheckedChange={setTwoFA} />
          </div>

          <Button type="submit">Update Password</Button>
        </form>
      </CardContent>
    </Card>
  );
}
