"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateProductionTailor, createProductionTailor, setProductionTailorActive } from "@/actions/production-tailors";
import type { ProductionTailor } from "@/types/production";

const cellClass = "w-full bg-transparent border border-transparent hover:border-border focus:border-[#D4AF37] focus:bg-secondary/30 rounded px-1.5 py-1 text-xs outline-none";
const NEW_ID_PREFIX = "new-";

type Row = {
  id: string;
  name: string;
  jobTitles: string; // comma-joined for editing
  capacityRaw: string;
  totalWorkingHours: number;
  weeklyOffDay: string;
  monthlySalary: number;
  otherAllowance: number;
  visaExpense: number;
  isActive: boolean;
};

function toRow(t: ProductionTailor): Row {
  return {
    id: t.id,
    name: t.name,
    jobTitles: t.jobTitles.join(", "),
    capacityRaw: t.capacityRaw ?? "",
    totalWorkingHours: t.totalWorkingHours,
    weeklyOffDay: t.weeklyOffDay ?? "",
    monthlySalary: t.monthlySalary,
    otherAllowance: t.otherAllowance,
    visaExpense: t.visaExpense,
    isActive: t.isActive,
  };
}

function newRow(): Row {
  return {
    id: `${NEW_ID_PREFIX}${crypto.randomUUID()}`,
    name: "", jobTitles: "", capacityRaw: "", totalWorkingHours: 8, weeklyOffDay: "",
    monthlySalary: 0, otherAllowance: 0, visaExpense: 0, isActive: true,
  };
}

export function TailorsGrid({ tailors }: { tailors: ProductionTailor[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(tailors.map(toRow));

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, newRow()]);
  }

  async function saveRow(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row || !row.name.trim()) return; // nothing to save yet for a blank new row

    const payload = {
      name: row.name,
      jobTitles: row.jobTitles.split(",").map((s) => s.trim()).filter(Boolean),
      capacityRaw: row.capacityRaw,
      totalWorkingHours: row.totalWorkingHours,
      weeklyOffDay: row.weeklyOffDay,
      monthlySalary: row.monthlySalary,
      otherAllowance: row.otherAllowance,
      visaExpense: row.visaExpense,
      isActive: row.isActive,
    };

    if (id.startsWith(NEW_ID_PREFIX)) {
      const result = await createProductionTailor(payload);
      if (!result.success) { toast.error(result.error ?? "Failed to add tailor"); return; }
      if (result.data) setRows((prev) => prev.map((r) => (r.id === id ? { ...r, id: result.data!.id } : r)));
      router.refresh();
    } else {
      const result = await updateProductionTailor(id, payload);
      if (!result.success) toast.error(result.error ?? "Failed to save row");
      else router.refresh(); // CTC is server-computed — refresh to pick up the new total
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    updateRow(id, { isActive });
    if (id.startsWith(NEW_ID_PREFIX)) return; // will be saved as-is once the row is created
    const result = await setProductionTailorActive(id, isActive);
    if (!result.success) { toast.error(result.error ?? "Failed to update status"); updateRow(id, { isActive: !isActive }); }
    else router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="overflow-auto max-h-[70vh] border border-border rounded-lg">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-card z-10">
            <tr className="border-b border-border">
              {["Active", "Name", "Job Title(s)", "Per Day Capacity", "Working Hrs", "Weekly Off", "Salary", "Allowance", "VISA", "CTC"].map((h) => (
                <th key={h} className="text-left font-semibold text-muted-foreground px-2 py-2 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const original = tailors.find((t) => t.id === row.id);
              return (
                <tr key={row.id} className={`border-b border-border/50 hover:bg-secondary/20 ${!row.isActive ? "opacity-50" : ""}`}>
                  <td className="p-0.5 text-center">
                    <input type="checkbox" checked={row.isActive} onChange={(e) => toggleActive(row.id, e.target.checked)} />
                  </td>
                  <td className="p-0.5"><input className={`${cellClass} w-28`} placeholder="New tailor name..." value={row.name} onChange={(e) => updateRow(row.id, { name: e.target.value })} onBlur={() => saveRow(row.id)} /></td>
                  <td className="p-0.5"><input className={`${cellClass} w-40`} value={row.jobTitles} onChange={(e) => updateRow(row.id, { jobTitles: e.target.value })} onBlur={() => saveRow(row.id)} /></td>
                  <td className="p-0.5"><input className={`${cellClass} w-64`} value={row.capacityRaw} onChange={(e) => updateRow(row.id, { capacityRaw: e.target.value })} onBlur={() => saveRow(row.id)} /></td>
                  <td className="p-0.5"><input type="number" className={`${cellClass} w-16`} value={row.totalWorkingHours} onChange={(e) => updateRow(row.id, { totalWorkingHours: Number(e.target.value) })} onBlur={() => saveRow(row.id)} /></td>
                  <td className="p-0.5"><input className={`${cellClass} w-24`} value={row.weeklyOffDay} onChange={(e) => updateRow(row.id, { weeklyOffDay: e.target.value.toUpperCase() })} onBlur={() => saveRow(row.id)} /></td>
                  <td className="p-0.5"><input type="number" className={`${cellClass} w-20`} value={row.monthlySalary} onChange={(e) => updateRow(row.id, { monthlySalary: Number(e.target.value) })} onBlur={() => saveRow(row.id)} /></td>
                  <td className="p-0.5"><input type="number" className={`${cellClass} w-20`} value={row.otherAllowance} onChange={(e) => updateRow(row.id, { otherAllowance: Number(e.target.value) })} onBlur={() => saveRow(row.id)} /></td>
                  <td className="p-0.5"><input type="number" className={`${cellClass} w-20`} value={row.visaExpense} onChange={(e) => updateRow(row.id, { visaExpense: Number(e.target.value) })} onBlur={() => saveRow(row.id)} /></td>
                  <td className="px-2 text-muted-foreground font-mono">AED {original?.totalCostToCompany ?? 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Button variant="outline" size="sm" onClick={addRow}>
        <Plus className="h-4 w-4 mr-1.5" /> Add Tailor
      </Button>
    </div>
  );
}
