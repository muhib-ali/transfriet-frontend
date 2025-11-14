"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, TrendingUp, CalendarDays, CreditCard } from "lucide-react";

type Status = "completed" | "pending" | "failed";
type PaymentMethod = "Credit Card" | "Bank Transfer" | "PayPal";

type Payment = {
  invoice: string;
  client: string;
  amount: number;
  method: PaymentMethod;
  date: string; // MM/DD/YYYY
  status: Status;
};

const rows: Payment[] = [
  {
    invoice: "INV-2024-001",
    client: "Acme Corporation",
    amount: 5000,
    method: "Credit Card",
    date: "3/15/2024",
    status: "completed",
  },
  {
    invoice: "INV-2024-002",
    client: "TechStart Inc",
    amount: 3500,
    method: "Bank Transfer",
    date: "3/14/2024",
    status: "completed",
  },
  {
    invoice: "INV-2024-003",
    client: "Global Trade Co",
    amount: 7500,
    method: "PayPal",
    date: "3/13/2024",
    status: "pending",
  },
  {
    invoice: "INV-2024-004",
    client: "Innovation Labs",
    amount: 2000,
    method: "Credit Card",
    date: "3/12/2024",
    status: "completed",
  },
];

export default function PaymentsPage() {
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState<"all" | Status>("all");

  const filtered = rows.filter((r) => {
    const q = query.toLowerCase();
    const matchesQ =
      r.invoice.toLowerCase().includes(q) ||
      r.client.toLowerCase().includes(q) ||
      r.method.toLowerCase().includes(q);
    const matchesStatus = status === "all" ? true : r.status === status;
    return matchesQ && matchesStatus;
  });

  const totalRevenue = rows.reduce((a, b) => a + b.amount, 0);
  const thisMonth = 22200; // static demo value to match the mock
  const pending = rows
    .filter((r) => r.status === "pending")
    .reduce((a, b) => a + b.amount, 0);
  const transactions = rows.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Payments</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Track and manage all payment transactions
            </p>
          </div>

          <Button className="gap-2">
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Total Revenue"
          value={`$${totalRevenue.toLocaleString()}`}
          icon={<CreditCard className="h-5 w-5 text-emerald-600" />}
          foot="+12.5%"
        />
        <KpiCard
          title="This Month"
          value={`$${thisMonth.toLocaleString()}`}
          icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
          foot="+8.2%"
        />
        <KpiCard
          title="Pending"
          value={`$${pending.toLocaleString()}`}
          icon={<CalendarDays className="h-5 w-5 text-amber-600" />}
          foot="-"
        />
        <KpiCard
          title="Transactions"
          value={transactions.toLocaleString()}
          icon={<Download className="h-5 w-5 text-slate-500" />}
          foot="+156"
        />
      </div>

      {/* Recent payments table */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Recent Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <div className="w-full max-w-md">
              <Input
                placeholder="Search payments..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <Select
              value={status}
              onValueChange={(v) => setStatus(v as typeof status)}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.invoice}>
                  <TableCell className="font-medium">{r.invoice}</TableCell>
                  <TableCell>{r.client}</TableCell>
                  <TableCell className="font-semibold">
                    ${r.amount.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="rounded-full px-2">
                      {r.method}
                    </Badge>
                  </TableCell>
                  <TableCell>{r.date}</TableCell>
                  <TableCell>
                    <StatusPill s={r.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center">
                    <div className="text-muted-foreground">
                      No payments found.
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- small bits ---------- */

function KpiCard({
  title,
  value,
  icon,
  foot,
}: {
  title: string;
  value: string;
  icon?: React.ReactNode;
  foot?: string;
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
          {title}
          {icon ? <span className="ml-1">{icon}</span> : null}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        {foot ? (
          <div className="mt-1 text-xs text-muted-foreground">{foot}</div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function StatusPill({ s }: { s: Status }) {
  const map: Record<
    Status,
    { label: string; cls: string }
  > = {
    completed: {
      label: "Completed",
      cls: "bg-blue-600 text-white hover:bg-blue-600",
    },
    pending: {
      label: "Pending",
      cls: "bg-amber-500/15 text-amber-700 border border-amber-500/30",
    },
    failed: {
      label: "Failed",
      cls: "bg-red-500/15 text-red-700 border border-red-500/30",
    },
  };

  return (
    <Badge className={`rounded-full px-3 ${map[s].cls}`}>{map[s].label}</Badge>
  );
}
