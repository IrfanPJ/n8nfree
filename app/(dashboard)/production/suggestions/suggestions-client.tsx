"use client";

import { useMemo, useState } from "react";
import { Columns3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PrintExportButtons } from "@/components/production/print-export-buttons";
import { cn } from "@/lib/utils";
import type { CapacitySlot, ProductionRecommendation } from "@/actions/production-orders";
import type { ProductionTailor } from "@/types/production";

const COLUMNS = [
  { key: "priority", label: "Priority" },
  { key: "invoice", label: "Invoice" },
  { key: "item", label: "Item" },
  { key: "qty", label: "Qty" },
  { key: "received", label: "Received Date" },
  { key: "due", label: "Due Date" },
  { key: "urgency", label: "Urgency" },
] as const;
type ColumnKey = (typeof COLUMNS)[number]["key"];

export function SuggestionsClient({
  capacity,
  recommendations,
  tailors,
}: {
  capacity: CapacitySlot[];
  recommendations: ProductionRecommendation[];
  tailors: ProductionTailor[];
}) {
  const [tailorFilter, setTailorFilter] = useState("ALL");
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(new Set(COLUMNS.map((c) => c.key)));

  const filteredRecs = useMemo(
    () => (tailorFilter === "ALL" ? recommendations : recommendations.filter((r) => r.tailorId === tailorFilter)),
    [recommendations, tailorFilter]
  );

  function toggleColumn(key: ColumnKey) {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Suggestions</h1>
        <p className="text-sm text-muted-foreground">Capacity gaps and next-into-production recommendations</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Open Capacity &amp; Available Slots</h2>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tailor</TableHead>
                  <TableHead>Daily Capacity</TableHead>
                  <TableHead>Committed Pcs</TableHead>
                  <TableHead>Busy Until</TableHead>
                  <TableHead>Open Window</TableHead>
                  <TableHead>Available Capacity</TableHead>
                  <TableHead>Suggestion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {capacity.map((c) => (
                  <TableRow key={c.tailorId}>
                    <TableCell className="font-medium">{c.tailorName}</TableCell>
                    <TableCell>{c.capacityPcsPerDay != null ? `${c.capacityPcsPerDay} pcs/day` : "Not specified"}</TableCell>
                    <TableCell>{c.committedPcs}</TableCell>
                    <TableCell>{c.busyUntil}</TableCell>
                    <TableCell className={c.openWindow === "Open now" ? "text-green-400" : "text-muted-foreground"}>{c.openWindow}</TableCell>
                    <TableCell>{c.availableCapacityLabel}</TableCell>
                    <TableCell className={cn(c.openWindow === "Open now" ? "text-green-400" : "text-muted-foreground", "text-sm")}>{c.suggestion}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Next-Into-Production Recommendation</h2>
            <div className="flex items-center gap-2 no-print">
              <Select value={tailorFilter} onValueChange={setTailorFilter}>
                <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Tailors</SelectItem>
                  {tailors.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm"><Columns3 className="h-4 w-4 mr-1.5" /> Columns</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {COLUMNS.map((c) => (
                    <DropdownMenuCheckboxItem
                      key={c.key}
                      checked={visibleColumns.has(c.key)}
                      onCheckedChange={() => toggleColumn(c.key)}
                    >
                      {c.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <PrintExportButtons />
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {visibleColumns.has("priority") && <TableHead>Priority</TableHead>}
                  {visibleColumns.has("invoice") && <TableHead>Invoice</TableHead>}
                  {visibleColumns.has("item") && <TableHead>Item</TableHead>}
                  {visibleColumns.has("qty") && <TableHead>Qty</TableHead>}
                  {visibleColumns.has("received") && <TableHead>Received Date</TableHead>}
                  {visibleColumns.has("due") && <TableHead>Due Date</TableHead>}
                  {visibleColumns.has("urgency") && <TableHead>Urgency</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecs.length === 0 ? (
                  <TableRow><TableCell colSpan={visibleColumns.size || 1} className="text-center text-muted-foreground py-8">None</TableCell></TableRow>
                ) : filteredRecs.map((r) => (
                  <TableRow key={r.orderId}>
                    {visibleColumns.has("priority") && <TableCell className="font-mono">{r.priority}</TableCell>}
                    {visibleColumns.has("invoice") && <TableCell className="font-medium">{r.invoiceNo}</TableCell>}
                    {visibleColumns.has("item") && <TableCell className="max-w-[220px] truncate">{r.itemRaw}</TableCell>}
                    {visibleColumns.has("qty") && <TableCell>{r.qty}</TableCell>}
                    {visibleColumns.has("received") && <TableCell>{r.receivedDate}</TableCell>}
                    {visibleColumns.has("due") && <TableCell>{r.deliveryDate ?? "—"}</TableCell>}
                    {visibleColumns.has("urgency") && (
                      <TableCell className={r.isDelayed ? "text-red-400 font-semibold" : "text-muted-foreground"}>{r.urgencyLabel}</TableCell>
                    )}
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
