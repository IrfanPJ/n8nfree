"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusPill } from "@/components/production/status-pill";
import { PrintExportButtons } from "@/components/production/print-export-buttons";
import { getProductionPayReport, type PayReportResult, type PayReportFilters } from "@/actions/production-orders";
import { PRODUCTION_ORDER_STATUSES, PRODUCTION_STORES } from "@/types/production";
import type { ProductionTailor } from "@/types/production";

function money(n: number): string {
  return `AED ${n.toLocaleString("en-AE", { maximumFractionDigits: 0 })}`;
}

export function PayReportClient({
  initialReport,
  tailors,
}: {
  initialReport: PayReportResult;
  tailors: ProductionTailor[];
}) {
  const [filters, setFilters] = useState<PayReportFilters>({});
  const [report, setReport] = useState(initialReport);
  const [isPending, startTransition] = useTransition();

  function setFilter<K extends keyof PayReportFilters>(key: K, value: PayReportFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  }

  function generate() {
    startTransition(async () => {
      const result = await getProductionPayReport(filters);
      setReport(result);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Pay Report</h1>
          <p className="text-sm text-muted-foreground">Piece-rate earnings by tailor, filterable by date range</p>
        </div>
        <PrintExportButtons />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end no-print">
            <div>
              <Label className="text-xs">From Date</Label>
              <Input type="date" onChange={(e) => setFilter("fromDate", e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">To Date</Label>
              <Input type="date" onChange={(e) => setFilter("toDate", e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Tailor</Label>
              <Select onValueChange={(v) => setFilter("tailorId", v === "ALL" ? undefined : v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder="All Tailors" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Tailors</SelectItem>
                  {tailors.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Store</Label>
              <Select onValueChange={(v) => setFilter("store", v === "ALL" ? undefined : v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder="All Stores" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Stores</SelectItem>
                  {PRODUCTION_STORES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select onValueChange={(v) => setFilter("status", v === "ALL" ? undefined : v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  {PRODUCTION_ORDER_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Item Type</Label>
              <Input placeholder="e.g. SHIRT" onChange={(e) => setFilter("itemType", e.target.value)} className="h-9" />
            </div>
          </div>
          <div className="flex justify-end mt-3 no-print">
            <Button onClick={generate} disabled={isPending}>{isPending ? "Generating..." : "Generate"}</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold font-mono">{report.totalOrders}</p>
          <p className="text-[10px] uppercase text-muted-foreground">Total Orders</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold font-mono">{report.totalPieces}</p>
          <p className="text-[10px] uppercase text-muted-foreground">Total Pieces</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold font-mono text-[#D4AF37]">{money(report.totalPayValue)}</p>
          <p className="text-[10px] uppercase text-muted-foreground">Total Pay Value</p>
        </CardContent></Card>
      </div>

      {report.summaryByTailor.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {report.summaryByTailor.map((s) => (
            <Card key={s.tailorId}>
              <CardContent className="p-4 space-y-2">
                <p className="font-semibold">{s.tailorName}</p>
                <p className="text-2xl font-bold font-mono text-green-400">{money(s.totalPay)}</p>
                <p className="text-xs text-muted-foreground">{s.orderCount} orders · {s.pcsCount} pcs</p>
                {s.deltaVsSalary < 0 && (
                  <p className="text-xs text-red-400">▼ {money(Math.abs(s.deltaVsSalary))} vs salary</p>
                )}
                <p className="text-xs text-muted-foreground">CTC: {money(s.ctc)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SL</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Tailor</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rate/Pc</TableHead>
                  <TableHead>Pay Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.rows.length === 0 ? (
                  <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground py-8">No orders match this filter.</TableCell></TableRow>
                ) : report.rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-muted-foreground">{r.sl}</TableCell>
                    <TableCell className="font-medium">{r.invoiceNo}</TableCell>
                    <TableCell>{r.store}</TableCell>
                    <TableCell className="max-w-[180px] truncate">{r.itemRaw}</TableCell>
                    <TableCell className="max-w-[140px] truncate">{r.notes ?? "—"}</TableCell>
                    <TableCell>{r.qty}</TableCell>
                    <TableCell>{r.tailorName ?? "—"}</TableCell>
                    <TableCell>{r.receivedDate}</TableCell>
                    <TableCell>{r.deliveryDate ?? "—"}</TableCell>
                    <TableCell><StatusPill status={r.status} /></TableCell>
                    <TableCell>{money(r.ratePerPc)}</TableCell>
                    <TableCell className="font-semibold">{money(r.payValue)}</TableCell>
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
