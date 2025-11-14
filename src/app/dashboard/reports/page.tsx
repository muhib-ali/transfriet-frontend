"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { Download, TrendingUp, DollarSign, Users2 } from "lucide-react";

// ----------------- sample data (last 6 months) -----------------
const baseMonthly = [
  { m: "Jan", revenue: 12000, expenses: 5200 },
  { m: "Feb", revenue: 15000, expenses: 6900 },
  { m: "Mar", revenue: 18000, expenses: 7400 },
  { m: "Apr", revenue: 16000, expenses: 7200 },
  { m: "May", revenue: 22000, expenses: 8600 },
  { m: "Jun", revenue: 24000, expenses: 9200 },
];

const categoryShare = [
  { name: "Web Development", value: 35, color: "#3b82f6" },
  { name: "Design", value: 25, color: "#f59e0b" },
  { name: "Marketing", value: 20, color: "#10b981" },
  { name: "Consulting", value: 15, color: "#6366f1" },
  { name: "Other", value: 5, color: "#94a3b8" },
];

const paymentDist = [
  { method: "Credit Card", amount: 48600, pct: 45 },
  { method: "Bank Transfer", amount: 37800, pct: 35 },
  { method: "PayPal", amount: 16200, pct: 15 },
  { method: "Other", amount: 5400, pct: 5 },
];

const topClients = [
  { name: "Acme Corporation", amount: 45000, invoices: 45 },
  { name: "TechStart Inc", amount: 38500, invoices: 32 },
  { name: "Global Trade Co", amount: 32200, invoices: 28 },
  { name: "Design Studio Co", amount: 21900, invoices: 19 },
];

// ----------------- utils -----------------
const fmt = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const short = (n: number) => n >= 1000 ? `$${(n/1000).toFixed(1)}k` : `$${n}`;

// ----------------- page -----------------
export default function ReportsPage() {
  const [range, setRange] = useState<"3m" | "6m" | "12m">("6m");

  const chartData = useMemo(() => {
    // Extend/shrink data based on range (demo)
    if (range === "3m") return baseMonthly.slice(-3).map(d => ({ ...d, profit: d.revenue - d.expenses }));
    if (range === "12m") {
      const prev = baseMonthly.map(d => ({ ...d }));
      // Duplicate to make 12 months (fake rolling)
      const months = ["Jul","Aug","Sep","Oct","Nov","Dec"];
      const tail = months.map((m, i) => {
        const ref = baseMonthly[i % baseMonthly.length];
        const factor = 0.9 + (i * 0.05);
        const revenue = Math.round(ref.revenue * factor);
        const expenses = Math.round(ref.expenses * (0.9 + i*0.03));
        return { m, revenue, expenses };
      });
      return [...prev, ...tail].map(d => ({ ...d, profit: d.revenue - d.expenses }));
    }
    return baseMonthly.map(d => ({ ...d, profit: d.revenue - d.expenses }));
  }, [range]);

  const totals = useMemo(() => {
    const revenue = chartData.reduce((s, d) => s + d.revenue, 0);
    const expenses = chartData.reduce((s, d) => s + d.expenses, 0);
    const profit = revenue - expenses;
    return { revenue, profit };
  }, [chartData]);

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports &amp; Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive business insights and financial reports
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={range} onValueChange={(v: any) => setRange(v)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Last 6 Months" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3m">Last 3 Months</SelectItem>
              <SelectItem value="6m">Last 6 Months</SelectItem>
              <SelectItem value="12m">Last 12 Months</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-3xl font-bold">{fmt.format(totals.revenue)}</div>
            <DollarSign className="h-6 w-6 text-primary" />
          </CardContent>
          <CardContent className="pt-0">
            <div className="text-xs text-emerald-600">+15.3%</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Profit</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-3xl font-bold">{fmt.format(totals.profit)}</div>
            <TrendingUp className="h-6 w-6 text-primary" />
          </CardContent>
          <CardContent className="pt-0">
            <div className="text-xs text-emerald-600">+22.8%</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Invoices Sent</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-3xl font-bold">342</div>
            <div className="text-xs text-emerald-600">+12</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Active Clients</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-3xl font-bold">156</div>
            <Users2 className="h-6 w-6 text-primary" />
          </CardContent>
          <CardContent className="pt-0">
            <div className="text-xs text-emerald-600">+8</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Revenue/Expenses/Profit line chart */}
        <Card className="shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Revenue, Expenses &amp; Profit</CardTitle>
          </CardHeader>
          <CardContent className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="m" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={short as any} />
                <RTooltip
                  contentStyle={{
                    background: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                  }}
                  formatter={(v: any, name) => [fmt.format(Number(v)), name]}
                />
                <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#3b82f6" strokeWidth={3} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#f59e0b" strokeWidth={3} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="profit" name="Profit" stroke="#10b981" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue by Category pie */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Revenue by Category</CardTitle>
          </CardHeader>
          <CardContent className="h-[360px]">
            <ResponsiveContainer width="100%" height="70%">
              <PieChart>
                <Pie
                  data={categoryShare}
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {categoryShare.map((c, i) => (
                    <Cell key={i} fill={c.color} />
                  ))}
                </Pie>
                <RTooltip
                  contentStyle={{
                    background: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                  }}
                  formatter={(v: any, _n, p: any) => [`${v}%`, p?.payload?.name]}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="mt-2 space-y-1">
              {categoryShare.map((c) => (
                <div key={c.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ background: c.color }} />
                    <span className="text-muted-foreground">{c.name}</span>
                  </div>
                  <span className="font-medium">{c.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top clients */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Top Performing Clients</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topClients.map((c) => (
              <div key={c.name} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.invoices} invoices</p>
                </div>
                <div className="font-semibold">{fmt.format(c.amount)}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Payment method distribution */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Payment Methods Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={paymentDist}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="method" width={120} stroke="hsl(var(--muted-foreground))" />
                <RTooltip
                  contentStyle={{
                    background: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                  }}
                  formatter={(v: any, _n, p: any) => [`${fmt.format(Number(v))} (${p?.payload?.pct}%)`, "Amount"]}
                />
                <Bar dataKey="amount" radius={[6, 6, 6, 6]} fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-2 text-right text-xs text-muted-foreground">
              Values show total collected and share (%)
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
