"use client";

import { InvoiceFormModal } from "@/components/invoice-form-modal";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Users,
  Plus,
  MoreHorizontal,
  Eye,
  Download as DownloadIcon,
} from "lucide-react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { toast } from "sonner";

const monthlyData = [
  { name: "Jan", revenue: 4000 },
  { name: "Feb", revenue: 3000 },
  { name: "Mar", revenue: 4800 },
  { name: "Apr", revenue: 5200 },
  { name: "May", revenue: 6100 },
  { name: "Jun", revenue: 5600 },
];

const statusData = [
  { name: "Paid", value: 65, color: "#22c55e" },
  { name: "Pending", value: 20, color: "#f59e0b" },
  { name: "Overdue", value: 10, color: "#ef4444" },
  { name: "Draft", value: 5, color: "#64748b" },
];

const invoices = [
  { id: "INV-2024-001", client: "Acme Corporation", amount: "$2,450.00", status: "paid", due: "2/15/2024" },
  { id: "INV-2024-002", client: "TechStart Inc.", amount: "$1,200.00", status: "pending", due: "2/12/2024" },
  { id: "INV-2024-003", client: "Design Studio Co.", amount: "$850.00", status: "overdue", due: "2/08/2024" },
  { id: "INV-2024-004", client: "Marketing Plus", amount: "$3,100.00", status: "draft", due: "2/10/2024" },
];

function StatusBadge({ s }: { s: string }) {
  const map: Record<string, string> = {
    paid: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    overdue: "bg-red-500/10 text-red-600 border-red-500/20",
    draft: "bg-muted/60 text-muted-foreground border-border",
  };
  return (
    <Badge variant="outline" className={`capitalize ${map[s] || ""}`}>
      {s}
    </Badge>
  );
}

export default function Page() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back! Here&apos;s what&apos;s happening with your invoices today.
          </p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="gap-2">
            <Users className="h-4 w-4" />
            Add Client
          </Button>

          <InvoiceFormModal
            trigger={
              <Button className="gap-2 bg-blue-500">
                <Plus className="h-4 w-4" />
                New Invoice
              </Button>
            }
          />
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">$124,563</div>
            <div className="mt-1 text-xs text-emerald-600">
              ▲ +12.5% <span className="text-muted-foreground">This month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">1,247</div>
            <div className="mt-1 text-xs text-emerald-600">
              ▲ +8.2% <span className="text-muted-foreground">This month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Active Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">342</div>
            <div className="mt-1 text-xs text-emerald-600">
              ▲ +5.1% <span className="text-muted-foreground">This month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Pending Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">23</div>
            <div className="mt-1 text-xs text-red-600">
              ▼ -3.2% <span className="text-muted-foreground">Awaiting payment</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-sm  lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Monthly Revenue &amp; Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 ">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid  strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <RTooltip
                    contentStyle={{
                      background: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                  />
                  <Bar  dataKey="revenue" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Invoice Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} innerRadius={60} outerRadius={100} dataKey="value" paddingAngle={2}>
                    {statusData.map((s, i) => (
                      <Cell key={i} fill={s.color} />
                    ))}
                  </Pie>
                  <RTooltip
                    contentStyle={{
                      background: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                    formatter={(value, _name, props) => [`${value}%`, (props?.payload as any)?.name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* legend */}
            <div className="mt-3 grid grid-cols-2 gap-3">
              {statusData.map((s) => (
                <div key={s.name} className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: s.color }} />
                  <span className="text-sm text-muted-foreground">{s.name}</span>
                  <span className="text-sm font-medium">{s.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent invoices */}
      <Card className="shadow-sm">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Invoices</CardTitle>
          <Button variant="outline" size="sm">
            View All
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                          {inv.client
                            .split(" ")
                            .map((w) => w[0])
                            .join("")
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{inv.client}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold">{inv.amount}</TableCell>
                  <TableCell>
                    <StatusBadge s={inv.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{inv.due}</TableCell>

                  {/* kebab menu */}
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem
                          onClick={() => toast.info(`Viewing ${inv.id}`)}
                          className="cursor-pointer"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => toast.success(`Downloading ${inv.id}`)}
                          className="cursor-pointer"
                        >
                          <DownloadIcon className="mr-2 h-4 w-4" />
                          Download
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
