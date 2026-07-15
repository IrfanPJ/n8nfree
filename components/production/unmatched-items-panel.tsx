"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createProductionItemAlias } from "@/actions/production-price-list";
import type { ProductionPriceListItem } from "@/types/production";

export function UnmatchedItemsPanel({
  unmatchedItems,
  priceListItems,
}: {
  unmatchedItems: string[];
  priceListItems: ProductionPriceListItem[];
}) {
  const router = useRouter();
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  if (unmatchedItems.length === 0) return null;

  async function mapItem(rawItem: string) {
    const priceListItemId = selections[rawItem];
    if (!priceListItemId) return;
    setSaving(rawItem);
    const result = await createProductionItemAlias(rawItem, priceListItemId);
    setSaving(null);
    if (result.success) {
      toast.success(`Mapped "${rawItem}"`);
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to save mapping");
    }
  }

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold">
          <AlertTriangle className="h-4 w-4" /> {unmatchedItems.length} item{unmatchedItems.length !== 1 ? "s" : ""} without a price list match
        </div>
        <p className="text-xs text-muted-foreground">
          These orders&apos; Item text didn&apos;t match anything in the price list, so their piece pay is AED 0. Map each to the correct item — it applies to every existing and future order with that exact text.
        </p>
        <div className="space-y-2">
          {unmatchedItems.map((raw) => (
            <div key={raw} className="flex items-center gap-2 flex-wrap">
              <span className="text-xs flex-1 min-w-[160px] truncate">{raw}</span>
              <Select value={selections[raw] ?? ""} onValueChange={(v) => setSelections((prev) => ({ ...prev, [raw]: v }))}>
                <SelectTrigger className="h-8 w-64 text-xs"><SelectValue placeholder="Map to price list item..." /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {priceListItems.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.item} (AED {p.unitPrice})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" disabled={!selections[raw] || saving === raw} onClick={() => mapItem(raw)}>
                {saving === raw ? "Saving..." : "Save"}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
