"use client";

import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { PieLabelRenderProps } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OrderStatusData } from "@/types";

interface OrderStatusChartProps {
  data: OrderStatusData[];
}

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = (props: PieLabelRenderProps) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
  if (!cx || !cy || !midAngle || !innerRadius || !outerRadius || !percent) return null;
  if ((percent as number) < 0.05) return null;
  const cxN = Number(cx);
  const cyN = Number(cy);
  const innerR = Number(innerRadius);
  const outerR = Number(outerRadius);
  const midA = Number(midAngle);
  const pct = Number(percent);
  const radius = innerR + (outerR - innerR) * 0.5;
  const x = cxN + radius * Math.cos(-midA * RADIAN);
  const y = cyN + radius * Math.sin(-midA * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={600}>
      {`${(pct * 100).toFixed(0)}%`}
    </text>
  );
};

export function OrderStatusChart({ data }: OrderStatusChartProps) {
  const filteredData = data.filter((d) => d.count > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Orders by Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        {filteredData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
            No order data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={filteredData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={80}
                innerRadius={40}
                dataKey="count"
                nameKey="status"
              >
                {filteredData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "hsl(0 0% 8%)",
                  border: "1px solid hsl(0 0% 16%)",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "hsl(0 0% 95%)",
                }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: "11px", color: "hsl(0 0% 55%)" }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
