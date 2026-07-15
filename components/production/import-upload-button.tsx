"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { importProductionWorkbook } from "@/actions/production-import";

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ImportUploadButton() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    setImporting(true);
    try {
      const base64 = await readFileAsBase64(file);
      const result = await importProductionWorkbook(base64);
      if (!result.success) {
        toast.error(result.error ?? "Import failed");
        return;
      }
      toast.success(
        `Imported: ${result.orders.created} orders created, ${result.orders.updated} updated` +
        (result.orders.skipped ? `, ${result.orders.skipped} skipped` : "") +
        (result.unmatchedItems.length ? ` — ${result.unmatchedItems.length} item(s) need manual price-list mapping` : "")
      );
      router.refresh();
    } catch {
      toast.error("Could not read or import the file");
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
      <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={importing}>
        <Upload className="h-4 w-4 mr-1.5" /> {importing ? "Importing..." : "Import Spreadsheet"}
      </Button>
    </>
  );
}
