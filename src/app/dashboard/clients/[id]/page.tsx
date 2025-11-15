"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import PermissionBoundary from "@/components/permission-boundary";
import { ENTITY_PERMS } from "@/rbac/permissions-map";
import { useHasPermission } from "@/hooks/use-permission";

import { getClientById, type ClientItem } from "@/lib/clients.api";

function safeDate(d?: string | null) {
  if (!d) return "—";
  const t = Date.parse(d);
  return Number.isNaN(t) ? "—" : new Date(t).toLocaleDateString();
}

function StatusPill({ s }: { s: boolean | undefined }) {
  const isActive = Boolean(s);
  return isActive ? (
    <Badge className="rounded-full bg-blue-50 text-blue-700 border-blue-200" variant="outline">Active</Badge>
  ) : (
    <Badge className="rounded-full bg-slate-50 text-slate-600 border-slate-200" variant="outline">Inactive</Badge>
  );
}

export default function ClientViewPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const canRead = useHasPermission(ENTITY_PERMS.clients?.read ?? "clients/getById");

  const [loading, setLoading] = React.useState(true);
  const [client, setClient] = React.useState<ClientItem | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        if (!id) throw new Error("Missing id");
        const data = await getClientById(id);
        setClient(data);
      } catch (e: any) {
        toast.error(e?.response?.data?.message || "Failed to load client");
        router.push("/dashboard/clients");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="p-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="group h-9 rounded-full border-muted-foreground/20 bg-background/60 px-3 text-xs font-medium text-muted-foreground shadow-sm hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
        >
          <ArrowLeft className="mr-1 h-4 w-4 transition-transform duration-150 group-hover:-translate-x-0.5" />
          <span className="hidden sm:inline">Back to Clients</span>
          <span className="sm:hidden">Back</span>
        </Button>
        <div className="mt-6 text-muted-foreground">Loading client…</div>
      </div>
    );
  }

  const name = client?.name || "—";
  const email = client?.email || "—";
  const phone = client?.phone || "—";
  const address = client?.address || "—";
  const country = client?.country || "—";
  const created = safeDate(client?.created_at);
  const updated = safeDate(client?.updated_at);

  return (
    <PermissionBoundary screen="/dashboard/clients/[id]" mode="block">
      <div className="space-y-6 pb-6">
        <div className="flex items-start gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="group h-9 rounded-full border-muted-foreground/20 bg-background/60 px-3 text-xs font-medium text-muted-foreground shadow-sm hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
          >
            <ArrowLeft className="mr-1 h-4 w-4 transition-transform duration-150 group-hover:-translate-x-0.5" />
            <span className="hidden sm:inline">Back to Clients</span>
            <span className="sm:hidden">Back</span>
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Client Details</h1>
            <p className="mt-1 text-muted-foreground">{name}</p>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <div className="text-xs text-muted-foreground">Company</div>
                <div className="font-semibold">{name}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Email</div>
                <div className="font-semibold">{email}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Phone</div>
                <div className="font-semibold">{phone}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Status</div>
                <div className="mt-1"><StatusPill s={client?.is_active} /></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Address</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="text-xs text-muted-foreground">Street Address</div>
                <div className="font-semibold">{address}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Country</div>
                <div className="font-semibold">{country}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="text-xs text-muted-foreground">Created</div>
                <div className="font-semibold">{created}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Last Updated</div>
                <div className="font-semibold">{updated}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PermissionBoundary>
  );
}