"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanySettings,InvoiceSettings, NotificationSettings ,PaymentSettings,SecuritySettings , AppearanceSettings} from "@/components/settings";


export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="mb-2">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your application settings and preferences
        </p>
      </div>

      <Tabs defaultValue="company" className="w-full">
        <TabsList className="flex w-full flex-wrap gap-2 bg-transparent p-0">
          <TabsTrigger value="company" className="rounded-lg">Company</TabsTrigger>
          <TabsTrigger value="invoice" className="rounded-lg">Invoice</TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-lg">Notifications</TabsTrigger>
          <TabsTrigger value="payment" className="rounded-lg">Payment</TabsTrigger>
          <TabsTrigger value="security" className="rounded-lg">Security</TabsTrigger>
          <TabsTrigger value="appearance" className="rounded-lg">Appearance</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="mt-4">
          <CompanySettings />
        </TabsContent>

        <TabsContent value="invoice" className="mt-4">
          <InvoiceSettings />
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <NotificationSettings />
        </TabsContent>

        <TabsContent value="payment" className="mt-4">
          <PaymentSettings />
        </TabsContent>

        <TabsContent value="security" className="mt-4">
          <SecuritySettings />
        </TabsContent>

        <TabsContent value="appearance" className="mt-4">
          <AppearanceSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
