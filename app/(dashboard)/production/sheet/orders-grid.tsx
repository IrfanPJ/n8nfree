"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductionOrderDialog } from "@/components/production/production-order-dialog";
import { updateProductionOrder, deleteProductionOrder } from "@/actions/production-orders";
import { PRODUCTION_ORDER_STATUSES, PRODUCTION_STORES } from "@/types/production";
import type { ProductionOrderWithRelations, ProductionTailor, ProductionPriceListItem } from "@/types/production";

const cellClass = "w-full bg-transparent border border-transparent hover:border-border focus:border-[#D4AF37] focus:bg-secondary/30 rounded px-1.5 py-1 text-xs outline-none";

type Row = {
  id: string;
  receivedDate: string;
  store: string;
  invoiceNo: string;
  notes: string;
  itemRaw: string;
  qty: number;
  tailorId: string;
  deliveryDate: string;
  status: string;
  remarks: string;
};

function toRow(o: ProductionOrderWithRelations): Row {
  return {
    id: o.id,
    receivedDate: o.receivedDate,
    store: o.store,
    invoiceNo: o.invoiceNo,
    notes: o.notes ?? "",
    itemRaw: o.itemRaw,
    qty: o.qty,
    tailorId: o.tailorId ?? "",
    deliveryDate: o.deliveryDate ?? "",
    status: o.status,
    remarks: o.remarks ?? "",
  };
}

export function OrdersGrid({
  orders,
  tailors,
  priceListItems,
}: {
  orders: ProductionOrderWithRelations[];
  tailors: ProductionTailor[];
  priceListItems: ProductionPriceListItem[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(orders.map(toRow));
  const [newOrderOpen, setNewOrderOpen] = useState(false);

  // Resync when the parent re-fetches (e.g. after adding/deleting a row via
  // router.refresh()) — a plain useState initializer only runs once.
  useEffect(() => setRows(orders.map(toRow)), [orders]);

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function saveRow(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    const result = await updateProductionOrder(id, {
      receivedDate: row.receivedDate,
      store: row.store,
      invoiceNo: row.invoiceNo,
      notes: row.notes,
      itemRaw: row.itemRaw,
      qty: row.qty,
      tailorId: row.tailorId || undefined,
      deliveryDate: row.deliveryDate,
      status: row.status,
      remarks: row.remarks,
    });
    if (!result.success) toast.error(result.error ?? "Failed to save row");
  }

  async function removeRow(id: string) {
    if (!confirm("Delete this order? This can't be undone.")) return;
    const result = await deleteProductionOrder(id);
    if (!result.success) { toast.error(result.error ?? "Failed to delete order"); return; }
    setRows((prev) => prev.filter((r) => r.id !== id));
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="overflow-auto max-h-[70vh] border border-border rounded-lg">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-card z-10">
            <tr className="border-b border-border">
              {["Received", "Store", "Invoice", "Notes", "Item", "Qty", "Tailor", "Delivery", "Status", "Remarks", ""].map((h) => (
                <th key={h} className="text-left font-semibold text-muted-foreground px-2 py-2 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border/50 hover:bg-secondary/20">
                <td className="p-0.5"><input type="date" className={cellClass} value={row.receivedDate} onChange={(e) => updateRow(row.id, { receivedDate: e.target.value })} onBlur={() => saveRow(row.id)} /></td>
                <td className="p-0.5">
                  <select className={cellClass} value={row.store} onChange={(e) => { updateRow(row.id, { store: e.target.value }); saveRow(row.id); }}>
                    {PRODUCTION_STORES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="p-0.5"><input className={`${cellClass} w-20`} value={row.invoiceNo} onChange={(e) => updateRow(row.id, { invoiceNo: e.target.value })} onBlur={() => saveRow(row.id)} /></td>
                <td className="p-0.5"><input className={`${cellClass} w-28`} value={row.notes} onChange={(e) => updateRow(row.id, { notes: e.target.value })} onBlur={() => saveRow(row.id)} /></td>
                <td className="p-0.5"><input className={`${cellClass} w-48`} value={row.itemRaw} onChange={(e) => updateRow(row.id, { itemRaw: e.target.value })} onBlur={() => saveRow(row.id)} /></td>
                <td className="p-0.5"><input type="number" min={1} className={`${cellClass} w-14`} value={row.qty} onChange={(e) => updateRow(row.id, { qty: Number(e.target.value) })} onBlur={() => saveRow(row.id)} /></td>
                <td className="p-0.5">
                  <select className={`${cellClass} w-28`} value={row.tailorId} onChange={(e) => { updateRow(row.id, { tailorId: e.target.value }); saveRow(row.id); }}>
                    <option value="">Unassigned</option>
                    {tailors.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </td>
                <td className="p-0.5"><input type="date" className={cellClass} value={row.deliveryDate} onChange={(e) => updateRow(row.id, { deliveryDate: e.target.value })} onBlur={() => saveRow(row.id)} /></td>
                <td className="p-0.5">
                  <select className={`${cellClass} w-36`} value={row.status} onChange={(e) => { updateRow(row.id, { status: e.target.value }); saveRow(row.id); }}>
                    {PRODUCTION_ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="p-0.5"><input className={`${cellClass} w-40`} value={row.remarks} onChange={(e) => updateRow(row.id, { remarks: e.target.value })} onBlur={() => saveRow(row.id)} /></td>
                <td className="p-0.5 text-right">
                  <button onClick={() => removeRow(row.id)} className="text-muted-foreground hover:text-destructive p-1" title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button variant="outline" size="sm" onClick={() => setNewOrderOpen(true)}>
        <Plus className="h-4 w-4 mr-1.5" /> New Order
      </Button>

      <ProductionOrderDialog
        open={newOrderOpen}
        onOpenChange={setNewOrderOpen}
        order={null}
        tailors={tailors}
        priceListItems={priceListItems}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
