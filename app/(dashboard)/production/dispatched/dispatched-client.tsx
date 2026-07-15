"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusPill } from "@/components/production/status-pill";
import { PrintExportButtons } from "@/components/production/print-export-buttons";
import { PRODUCTION_STORES } from "@/types/production";
import type { ProductionOrderWithRelations, ProductionTailor } from "@/types/production";

export function DispatchedClient({
  orders,
  tailors,
  initialFilters,
}: {
  orders: ProductionOrderWithRelations[];
  tailors: ProductionTailor[];
  initialFilters: { store: string; tailorId: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (!value || value === "ALL") next.delete(key);
    else next.set(key, value);
    router.push(`/production/dispatched?${next.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Dispatched &amp; Delivered</h1>
          <p className="text-sm text-muted-foreground">{orders.length} completed orders</p>
        </div>
        <PrintExportButtons />
      </div>

      <div className="flex flex-wrap items-center gap-2 no-print">
        <Select defaultValue={initialFilters.store} onValueChange={(v) => updateParam("store", v)}>
          <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Stores</SelectItem>
            {PRODUCTION_STORES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select defaultValue={initialFilters.tailorId} onValueChange={(v) => updateParam("tailorId", v)}>
          <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Tailors</SelectItem>
            {tailors.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border overflow-x-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Store</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Tailor</TableHead>
              <TableHead>Received</TableHead>
              <TableHead>Delivery</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No orders found.</TableCell></TableRow>
            ) : orders.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-medium">{o.invoiceNo}</TableCell>
                <TableCell>{o.store}</TableCell>
                <TableCell className="max-w-[220px] truncate">{o.itemRaw}</TableCell>
                <TableCell>{o.qty}</TableCell>
                <TableCell>{o.tailor?.name ?? "—"}</TableCell>
                <TableCell>{o.receivedDate}</TableCell>
                <TableCell>{o.deliveryDate ?? "—"}</TableCell>
                <TableCell><StatusPill status={o.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
