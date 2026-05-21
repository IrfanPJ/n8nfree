"use client";

import React from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, Legend,
} from "recharts";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Star } from "lucide-react";

interface AnalyticsClientProps {
  chartData: Array<{ month: string; revenue: number; orders: number }>;
  topCustomers: Array<{ name: string; orders: number; revenue: number; isVIP: boolean }>;
  garmentTypes: Array<{ type: string; count: number }>;
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-xl text-sm">
      <p className="text-muted-foreground mb-2 text-xs">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground text-xs">{p.name}:</span>
          <span className="font-semibold text-xs">
            {p.name.toLowerCase().includes("revenue") ? formatCurrency(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export function AnalyticsClient({ chartData, topCustomers, garmentTypes }: AnalyticsClientProps) {
  const totalRevenue = chartData.reduce((s, d) => s + d.revenue, 0);
  const totalOrders = chartData.reduce((s, d) => s + d.orders, 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const bestMonth = chartData.reduce((a, b) => (a.revenue > b.revenue ? a : b), chartData[0]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">12-month business performance overview</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "12M Revenue", value: formatCurrency(totalRevenue), sub: "Total collected", variant: "gold" },
          { label: "Total Orders", value: totalOrders.toLocaleString(), sub: "Last 12 months", variant: "default" },
          { label: "Avg Order Value", value: formatCurrency(avgOrderValue), sub: "Per transaction", variant: "success" },
          { label: "Best Month", value: bestMonth?.month ?? "—", sub: formatCurrency(bestMonth?.revenue ?? 0), variant: "default" },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className={kpi.variant === "gold" ? "glass-gold" : ""}>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{kpi.label}</p>
                <p className={`text-2xl font-bold ${kpi.variant === "gold" ? "text-[#D4AF37]" : kpi.variant === "success" ? "text-green-400" : ""}`}>
                  {kpi.value}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Revenue chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Revenue Trend (12 months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="grad12m" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 16%)" />
              <XAxis dataKey="month" tick={{ fill: "hsl(0 0% 55%)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "hsl(0 0% 55%)", fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#D4AF37" strokeWidth={2.5}
                fill="url(#grad12m)" dot={{ fill: "#D4AF37", strokeWidth: 0, r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Orders chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Monthly Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 16%)" />
                <XAxis dataKey="month" tick={{ fill: "hsl(0 0% 55%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(0 0% 55%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="orders" name="Orders" fill="#60a5fa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Garment types */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Garment Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            {garmentTypes.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={garmentTypes} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 16%)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "hsl(0 0% 55%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="type" tick={{ fill: "hsl(0 0% 55%)", fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Count" fill="#D4AF37" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Customers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Top Customers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topCustomers.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">No customer data</p>
            ) : (
              topCustomers.map((c, i) => (
                <div key={c.name} className="flex items-center gap-4">
                  <span className="w-5 text-center text-xs text-muted-foreground font-mono">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{c.name}</span>
                      {c.isVIP && <Star className="w-3 h-3 text-[#D4AF37] fill-[#D4AF37]" />}
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary mt-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#D4AF37] to-[#F5E27D]"
                        style={{ width: `${Math.min(100, (c.orders / (topCustomers[0]?.orders || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold">{formatCurrency(c.revenue)}</p>
                    <p className="text-xs text-muted-foreground">{c.orders} orders</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
