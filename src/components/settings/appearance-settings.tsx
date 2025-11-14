"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function AppearanceSettings() {
  function onSave() {
    toast.success("Appearance saved");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Theme</label>
          <Select defaultValue="light">
            <SelectTrigger><SelectValue placeholder="Theme" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Language</label>
          <Select defaultValue="en">
            <SelectTrigger><SelectValue placeholder="Language" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="ur">Urdu</SelectItem>
              <SelectItem value="hi">Hindi</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Date Format</label>
          <Select defaultValue="mdy">
            <SelectTrigger><SelectValue placeholder="Date format" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mdy">MM/DD/YYYY</SelectItem>
              <SelectItem value="dmy">DD/MM/YYYY</SelectItem>
              <SelectItem value="ymd">YYYY/MM/DD</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={onSave}>Save Changes</Button>
      </CardContent>
    </Card>
  );
}
