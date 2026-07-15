"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateProductionPriceListItem, createProductionPriceListItem, deleteProductionPriceListItem } from "@/actions/production-price-list";
import type { ProductionPriceListItem } from "@/types/production";

const cellClass = "w-full bg-transparent border border-transparent hover:border-border focus:border-[#D4AF37] focus:bg-secondary/30 rounded px-1.5 py-1 text-xs outline-none";
const NEW_ID_PREFIX = "new-";

type Row = { id: string; item: string; unitPrice: number; estimatedHoursPerPiece: string };

function toRow(p: ProductionPriceListItem): Row {
  return { id: p.id, item: p.item, unitPrice: p.unitPrice, estimatedHoursPerPiece: p.estimatedHoursPerPiece?.toString() ?? "" };
}

function newRow(): Row {
  return { id: `${NEW_ID_PREFIX}${crypto.randomUUID()}`, item: "", unitPrice: 0, estimatedHoursPerPiece: "" };
}

export function PriceListGrid({ priceListItems }: { priceListItems: ProductionPriceListItem[] }) {
  const [rows, setRows] = useState<Row[]>(priceListItems.map(toRow));

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, newRow()]);
  }

  async function removeRow(id: string) {
    if (id.startsWith(NEW_ID_PREFIX)) {
      setRows((prev) => prev.filter((r) => r.id !== id));
      return;
    }
    if (!confirm("Delete this price list item? Orders using it will become unmatched, not deleted.")) return;
    const result = await deleteProductionPriceListItem(id);
    if (!result.success) { toast.error(result.error ?? "Failed to delete"); return; }
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  async function saveRow(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row || !row.item.trim()) return; // nothing to save yet for a blank new row

    const payload = {
      item: row.item,
      unitPrice: row.unitPrice,
      estimatedHoursPerPiece: row.estimatedHoursPerPiece ? Number(row.estimatedHoursPerPiece) : undefined,
    };

    if (id.startsWith(NEW_ID_PREFIX)) {
      const result = await createProductionPriceListItem(payload);
      if (!result.success) { toast.error(result.error ?? "Failed to add item"); return; }
      if (result.data) setRows((prev) => prev.map((r) => (r.id === id ? { ...r, id: result.data!.id } : r)));
    } else {
      const result = await updateProductionPriceListItem(id, payload);
      if (!result.success) toast.error(result.error ?? "Failed to save row");
    }
  }

  return (
    <div className="space-y-2">
      <div className="overflow-auto max-h-[70vh] border border-border rounded-lg">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-card z-10">
            <tr className="border-b border-border">
              {["Item", "Unit Price (AED)", "Est. Hours/Pc", ""].map((h) => (
                <th key={h} className="text-left font-semibold text-muted-foreground px-2 py-2 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border/50 hover:bg-secondary/20">
                <td className="p-0.5"><input className={`${cellClass} w-72`} placeholder="New item name..." value={row.item} onChange={(e) => updateRow(row.id, { item: e.target.value })} onBlur={() => saveRow(row.id)} /></td>
                <td className="p-0.5"><input type="number" step="0.01" className={`${cellClass} w-20`} value={row.unitPrice} onChange={(e) => updateRow(row.id, { unitPrice: Number(e.target.value) })} onBlur={() => saveRow(row.id)} /></td>
                <td className="p-0.5"><input type="number" step="0.1" placeholder="—" className={`${cellClass} w-20`} value={row.estimatedHoursPerPiece} onChange={(e) => updateRow(row.id, { estimatedHoursPerPiece: e.target.value })} onBlur={() => saveRow(row.id)} /></td>
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
      <Button variant="outline" size="sm" onClick={addRow}>
        <Plus className="h-4 w-4 mr-1.5" /> Add Item
      </Button>
    </div>
  );
}
