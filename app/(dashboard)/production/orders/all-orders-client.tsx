"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Plus, ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusPill } from "@/components/production/status-pill";
import { ProductionOrderDialog } from "@/components/production/production-order-dialog";
import { deleteProductionOrder } from "@/actions/production-orders";
import { debounce } from "@/lib/utils";
import { PRODUCTION_ORDER_STATUSES, PRODUCTION_STORES } from "@/types/production";
import type { ProductionOrderWithRelations, ProductionTailor, ProductionPriceListItem } from "@/types/production";
import type { PaginatedResult } from "@/types";

export function AllOrdersClient({
  initialData,
  tailors,
  priceListItems,
  initialFilters,
}: {
  initialData: PaginatedResult<ProductionOrderWithRelations>;
  tailors: ProductionTailor[];
  priceListItems: ProductionPriceListItem[];
  initialFilters: { search: string; status: string; store: string; tailorId: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialFilters.search);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ProductionOrderWithRelations | null>(null);

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (!value || value === "ALL") next.delete(key);
    else next.set(key, value);
    next.delete("page");
    router.push(`/production/orders?${next.toString()}`);
  }

  const debouncedSearch = useMemo(
    () => debounce((v: string) => updateParam("search", v), 400),
    [searchParams] // eslint-disable-line react-hooks/exhaustive-deps
  );

  function goToPage(page: number) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("page", String(page));
    router.push(`/production/orders?${next.toString()}`);
  }

  function clearFilters() {
    setSearch("");
    router.push("/production/orders");
  }

  const handleDelete = useCallback(async (id: string, invoiceNo: string) => {
    if (!confirm(`Delete order ${invoiceNo}? This can't be undone.`)) return;
    const result = await deleteProductionOrder(id);
    if (result.success) {
      toast.success("Order deleted");
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to delete order");
    }
  }, [router]);

  const { data: orders, total, page, pageSize, totalPages } = initialData;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">All Orders</h1>
          <p className="text-sm text-muted-foreground">Showing {orders.length} of {total} orders</p>
        </div>
        <Button onClick={() => { setEditingOrder(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-1.5" /> New Order
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          defaultValue={search}
          onChange={(e) => { setSearch(e.target.value); debouncedSearch(e.target.value); }}
          placeholder="Search invoice, item..."
          className="w-56 h-9"
        />
        <Select defaultValue={initialFilters.status} onValueChange={(v) => updateParam("status", v)}>
          <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="ALL">All Statuses</SelectItem>
            {PRODUCTION_ORDER_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
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
        <Button variant="ghost" size="sm" onClick={clearFilters}>Clear</Button>
      </div>

      <div className="rounded-lg border border-border overflow-x-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead>Store</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Tailor</TableHead>
              <TableHead>Received</TableHead>
              <TableHead>Delivery</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Remarks</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">No orders found.</TableCell></TableRow>
            ) : orders.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="text-muted-foreground">{o.sourceRowId ?? "—"}</TableCell>
                <TableCell className="font-medium">{o.invoiceNo}</TableCell>
                <TableCell>{o.store}</TableCell>
                <TableCell className="max-w-[200px]">
                  <div className="truncate">{o.itemRaw}</div>
                  {o.notes && <div className="text-xs text-muted-foreground truncate">{o.notes}</div>}
                </TableCell>
                <TableCell>{o.qty}</TableCell>
                <TableCell>{o.tailor?.name ?? "—"}</TableCell>
                <TableCell>{o.receivedDate}</TableCell>
                <TableCell>{o.deliveryDate ?? "—"}</TableCell>
                <TableCell><StatusPill status={o.status} /></TableCell>
                <TableCell className="max-w-[160px] truncate" title={o.remarks ?? undefined}>{o.remarks ?? "—"}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 justify-end">
                    <Button variant="ghost" size="icon-sm" onClick={() => { setEditingOrder(o); setDialogOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(o.id, o.invoiceNo)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => goToPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <ProductionOrderDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        order={editingOrder}
        tailors={tailors}
        priceListItems={priceListItems}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
