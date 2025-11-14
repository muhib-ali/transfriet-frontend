"use client";

import { TrendingUp, TrendingDown, DollarSign, FileText, Users, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const metrics = [
  { title: "Total Revenue", value: "$124,563", change: "+12.5%", trend: "up", icon: DollarSign, description: "This month" },
  { title: "Total Invoices", value: "1,247", change: "+8.2%", trend: "up", icon: FileText, description: "This month" },
  { title: "Active Clients", value: "342", change: "+5.1%", trend: "up", icon: Users, description: "This month" },
  { title: "Pending Invoices", value: "23", change: "-3.2%", trend: "down", icon: Clock, description: "Awaiting payment" },
] as const;

export function DashboardMetrics() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        const TrendIcon = metric.trend === "up" ? TrendingUp : TrendingDown;
        const trendColor = metric.trend === "up" ? "text-success" : "text-destructive";
        return (
          <Card
            key={metric.title}
            className="bg-gradient-card border-0 shadow-soft transition-all duration-300 hover:shadow-medium group"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                {metric.title}
              </CardTitle>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary/10 transition-colors group-hover:bg-gradient-primary/20">
                <Icon className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-1 text-2xl font-bold text-foreground">{metric.value}</div>
              <div className="flex items-center gap-2 text-xs">
                <div className={`flex items-center gap-1 ${trendColor}`}>
                  <TrendIcon className="h-3 w-3" />
                  <span className="font-medium">{metric.change}</span>
                </div>
                <span className="text-muted-foreground">{metric.description}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
