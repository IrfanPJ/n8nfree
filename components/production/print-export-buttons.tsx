"use client";

import { useState } from "react";
import { Printer, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * The CRM has no PDF-generation library (see invoice-view.tsx) — "Export
 * PDF" everywhere reuses the browser's own print-to-PDF via window.print().
 * A @page rule sets the paper size for that print.
 */
export function PrintExportButtons({ className }: { className?: string }) {
  const [paperSize, setPaperSize] = useState<"A4" | "Letter">("A4");

  function print() {
    const styleId = "production-print-paper-size";
    let style = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement("style");
      style.id = styleId;
      document.head.appendChild(style);
    }
    style.innerHTML = `@page { size: ${paperSize}; margin: 12mm; }`;
    window.print();
  }

  return (
    <div className={`flex items-center gap-2 no-print ${className ?? ""}`}>
      <Select value={paperSize} onValueChange={(v) => setPaperSize(v as "A4" | "Letter")}>
        <SelectTrigger className="w-24 h-9 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="A4">A4</SelectItem>
          <SelectItem value="Letter">Letter</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="outline" size="sm" onClick={print}>
        <Printer className="h-4 w-4 mr-1.5" /> Print
      </Button>
      <Button variant="outline" size="sm" onClick={print}>
        <FileDown className="h-4 w-4 mr-1.5" /> Export PDF
      </Button>
    </div>
  );
}
