"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { KpiCard } from "@/components/production/kpi-card";
import { StatusPill } from "@/components/production/status-pill";
import { isActiveStatus, isPayableStatus } from "@/lib/production-calc";
import { PRODUCTION_STORES } from "@/types/production";
import type { ProductionOrderWithRelations, ProductionOverviewStats, ProductionTailor } from "@/types/production";

function money(n: number): string {
  return `AED ${n.toLocaleString("en-AE", { maximumFractionDigits: 0 })}`;
}

export function OverviewContent({
  stats,
  orders,
  tailor,
}: {
  stats: ProductionOverviewStats;
  orders: ProductionOrderWithRelations[];
  tailor?: ProductionTailor | null;
}) {
  const [store, setStore] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"deliveryDate" | "receivedDate">("deliveryDate");

  const activeOrders = useMemo(() => orders.filter((o) => isActiveStatus(o.status)), [orders]);

  const filteredActive = useMemo(() => {
    const rows = store === "ALL" ? activeOrders : activeOrders.filter((o) => o.store === store);
    return [...rows].sort((a, b) => {
      const av = a[sortBy] ?? "";
      const bv = b[sortBy] ?? "";
      return String(av).localeCompare(String(bv));
    });
  }, [activeOrders, store, sortBy]);

  const itemsAssigned = useMemo(() => {
    const map = new Map<string, { count: number; qty: number }>();
    for (const o of activeOrders) {
      const bucket = map.get(o.itemRaw) ?? { count: 0, qty: 0 };
      bucket.count += 1;
      bucket.qty += o.qty;
      map.set(o.itemRaw, bucket);
    }
    return [...map.entries()].sort((a, b) => b[1].qty - a[1].qty);
  }, [activeOrders]);

  const pieceRateEarnings = useMemo(
    () => orders.filter((o) => isPayableStatus(o.status)).reduce((s, o) => s + o.qty * (o.priceListItem?.unitPrice ?? 0), 0),
    [orders]
  );

  const kpis: Array<{ label: string; value: number; color: string }> = [
    { label: "Active Orders", value: stats.activeOrders, color: "text-blue-400" },
    { label: "Pcs in Hand", value: stats.pcsInHand, color: "text-blue-400" },
    { label: "Days to Finish", value: stats.daysToFinish, color: "text-[#D4AF37]" },
    { label: "Total Orders", value: stats.totalOrders, color: "text-foreground" },
    { label: "Pcs Completed", value: stats.pcsCompleted, color: "text-green-400" },
    { label: "Delayed", value: stats.delayed, color: stats.delayed > 0 ? "text-red-400" : "text-muted-foreground" },
    { label: "Trial Ready (Pcs)", value: stats.trialReadyPcs, color: "text-cyan-400" },
    { label: "Return Items (Pcs)", value: stats.returnItemsPcs, color: "text-red-400" },
    { label: "Cancelled (Orders)", value: stats.cancelledOrders, color: "text-muted-foreground" },
    { label: "Remaining (Not Completed)", value: stats.remaining, color: "text-amber-400" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpis.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} colorClassName={k.color} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Items Assigned</CardTitle>
          </CardHeader>
          <CardContent>
            {itemsAssigned.length === 0 ? (
              <p className="text-sm text-muted-foreground">No items assigned yet.</p>
            ) : (
              <ul className="space-y-2 max-h-64 overflow-y-auto">
                {itemsAssigned.map(([item, v]) => (
                  <li key={item} className="flex items-center justify-between text-sm gap-2">
                    <span className="truncate">{item}</span>
                    <span className="text-muted-foreground flex-shrink-0">{v.qty} pcs · {v.count} orders</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {tailor && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Cost to Company Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Monthly Salary</span><span>{money(tailor.monthlySalary)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Other Allowance</span><span>{money(tailor.otherAllowance)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">VISA Expense</span><span>{money(tailor.visaExpense)}</span></div>
              <div className="flex justify-between font-semibold pt-2 border-t border-border"><span>Total</span><span className="text-[#D4AF37]">{money(tailor.totalCostToCompany)}</span></div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Piece Rate Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-400 font-mono">{money(pieceRateEarnings)}</p>
            <p className="text-xs text-muted-foreground mt-1">All-time, payable statuses only</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Active Orders</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={store} onValueChange={setStore}>
              <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Stores</SelectItem>
                {PRODUCTION_STORES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="deliveryDate">Sort: Delivery</SelectItem>
                <SelectItem value="receivedDate">Sort: Received</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredActive.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">None</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Tailor</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActive.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">
                      <Link href={`/production/orders?search=${o.invoiceNo}`} className="hover:text-[#D4AF37]">{o.invoiceNo}</Link>
                    </TableCell>
                    <TableCell>{o.store}</TableCell>
                    <TableCell className="max-w-[220px] truncate">{o.itemRaw}</TableCell>
                    <TableCell>{o.qty}</TableCell>
                    <TableCell>{o.tailor?.name ?? "—"}</TableCell>
                    <TableCell>{o.deliveryDate ?? "—"}</TableCell>
                    <TableCell><StatusPill status={o.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
