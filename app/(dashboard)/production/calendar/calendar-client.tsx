"use client";

import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusPill } from "@/components/production/status-pill";
import { PrintExportButtons } from "@/components/production/print-export-buttons";
import { cn } from "@/lib/utils";
import type { CalendarChip, CalendarData } from "@/actions/production-orders";

function formatDayLabel(iso: string, index: number): string {
  if (index === 0) return "Today";
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-AE", { weekday: "short", day: "numeric", month: "short" });
}

function daysLateColor(n: number): string {
  if (n >= 14) return "text-red-500 font-bold";
  if (n >= 7) return "text-red-400 font-semibold";
  if (n > 0) return "text-amber-400";
  return "text-muted-foreground";
}

export function CalendarClient({ data }: { data: CalendarData }) {
  const [activeChip, setActiveChip] = useState<CalendarChip | "all">("all");

  const filteredOrders = useMemo(
    () => (activeChip === "all" ? data.attentionOrders : data.attentionOrders.filter((o) => o.chip === activeChip)),
    [data.attentionOrders, activeChip]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Calendar</h1>
          <p className="text-sm text-muted-foreground">Delivery outlook for the next 6 days</p>
        </div>
        <PrintExportButtons />
      </div>

      <div className="flex flex-wrap gap-3 no-print">
        {([
          { key: "critical" as const, label: "Critical (Overdue)", count: data.critical, color: "border-red-500/30 bg-red-500/10 text-red-400" },
          { key: "urgent" as const, label: "Urgent (Today/Tomorrow)", count: data.urgent, color: "border-amber-500/30 bg-amber-500/10 text-amber-400" },
          { key: "nearing" as const, label: "Nearing (2-3 Days)", count: data.nearing, color: "border-blue-500/30 bg-blue-500/10 text-blue-400" },
        ]).map((chip) => (
          <button
            key={chip.key}
            onClick={() => setActiveChip(activeChip === chip.key ? "all" : chip.key)}
            className={cn(
              "rounded-lg border px-4 py-2 text-left transition-all",
              chip.color,
              activeChip === chip.key ? "ring-2 ring-offset-2 ring-offset-background ring-current" : ""
            )}
          >
            <p className="text-2xl font-bold font-mono">{chip.count}</p>
            <p className="text-[10px] uppercase tracking-wide">{chip.label}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {data.days.map((day, i) => (
          <Card key={day.date} className={i === 0 ? "border-[#D4AF37]/40" : ""}>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{formatDayLabel(day.date, i)}</p>
                <span className="text-xs font-bold rounded-full bg-secondary px-2 py-0.5">{day.orders.length}</span>
              </div>
              {day.orders.some((o) => o.isWeeklyOffConflict) && (
                <div className="flex items-start gap-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-1.5 text-[10px] text-amber-400">
                  <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                  Weekly Off — due date falls on a non-working day
                </div>
              )}
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {day.orders.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">None</p>
                ) : day.orders.map((o) => (
                  <div key={o.id} className="rounded-md border border-border/60 p-2 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold truncate">{o.invoiceNo}</span>
                      <StatusPill status={o.status} className="text-[8px] px-1.5 py-0" />
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">{o.itemRaw}</p>
                    <p className="text-[10px] text-muted-foreground">{o.tailorName ?? "Unassigned"}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Overdue / Delayed Orders</h2>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Tailor</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Days Late</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">None</TableCell></TableRow>
                ) : filteredOrders.map((o, idx) => (
                  <TableRow key={o.id}>
                    <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="font-medium">{o.invoiceNo}</TableCell>
                    <TableCell>{o.store}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{o.itemRaw}</TableCell>
                    <TableCell>{o.qty}</TableCell>
                    <TableCell>{o.tailorName ?? "—"}</TableCell>
                    <TableCell>{o.receivedDate}</TableCell>
                    <TableCell>{o.deliveryDate}</TableCell>
                    <TableCell className={cn("font-mono", daysLateColor(o.daysLate))}>{o.daysLate > 0 ? `${o.daysLate}d` : "—"}</TableCell>
                    <TableCell><StatusPill status={o.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
