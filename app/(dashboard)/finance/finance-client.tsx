"use client";

import React from "react";
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface FinanceStats {
  revenueMTD: number;
  expensesMTD: number;
  netProfitMTD: number;
  outstanding: number;
  invoiceRevenue: number;
  posRevenue: number;
}

interface MonthlyData {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

interface TopClient {
  name: string;
  total: number;
}

function formatAED(n: number) {
  return `AED ${n.toLocaleString("en-AE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const COLORS = ["#D4AF37", "#60a5fa"];

function StatCard({ title, value, sub, color, icon }: {
  title: string; value: number; sub?: string; color: string; icon: React.ReactNode;
}) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", color)}>
            {icon}
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
        </div>
        <p className="text-2xl font-bold">{formatAED(value)}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-lg text-xs">
      <p className="font-semibold mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-medium">{formatAED(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export function FinanceClient({
  stats, monthly, topClients,
}: {
  stats: FinanceStats;
  monthly: MonthlyData[];
  topClients: TopClient[];
}) {
  const revenueByCategory = [
    { name: "Invoices", value: stats.invoiceRevenue },
    { name: "POS Sales", value: stats.posRevenue },
  ].filter((d) => d.value > 0);

  const maxClient = topClients[0]?.total ?? 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Finance</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Revenue, expenses and profitability — month to date</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Revenue MTD"
          value={stats.revenueMTD}
          sub="Invoices + POS sales"
          color="bg-[#D4AF37]/15"
          icon={<DollarSign className="w-4 h-4 text-[#D4AF37]" />}
        />
        <StatCard
          title="Expenses MTD"
          value={stats.expensesMTD}
          sub="Purchases this month"
          color="bg-red-500/15"
          icon={<TrendingDown className="w-4 h-4 text-red-400" />}
        />
        <StatCard
          title="Net Profit MTD"
          value={stats.netProfitMTD}
          sub={stats.netProfitMTD >= 0 ? "Profitable" : "Loss this month"}
          color={stats.netProfitMTD >= 0 ? "bg-green-500/15" : "bg-red-500/15"}
          icon={<TrendingUp className={cn("w-4 h-4", stats.netProfitMTD >= 0 ? "text-green-400" : "text-red-400")} />}
        />
        <StatCard
          title="Outstanding"
          value={stats.outstanding}
          sub="Unpaid invoices"
          color="bg-orange-500/15"
          icon={<AlertCircle className="w-4 h-4 text-orange-400" />}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly Revenue chart */}
        <Card className="lg:col-span-2 border-border/50">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Monthly Revenue (AED)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={monthly}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f87171" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#D4AF37" strokeWidth={2} fill="url(#revGrad)" dot={false} />
                <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#f87171" strokeWidth={2} fill="url(#expGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue by Category */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Revenue by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueByCategory.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={revenueByCategory} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                    {revenueByCategory.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatAED(Number(v))} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Clients */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Top Clients by Revenue (AED)</CardTitle>
        </CardHeader>
        <CardContent>
          {topClients.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">No invoices yet</div>
          ) : (
            <div className="space-y-3">
              {topClients.map((client, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{client.name}</span>
                    <span className="text-[#D4AF37] font-semibold">{formatAED(client.total)}</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#D4AF37]"
                      style={{ width: `${(client.total / maxClient) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
