"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Building2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BRANCHES } from "@/store/branch-store";

export function BranchSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeBranch = searchParams.get("branch") ?? "All Branches";

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "All Branches") {
      params.delete("branch");
    } else {
      params.set("branch", value);
    }
    // Reset pagination on branch change
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Select value={activeBranch} onValueChange={handleChange}>
      <SelectTrigger className="h-8 w-[160px] text-xs border-border/40 gap-1.5">
        <Building2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {BRANCHES.map((b) => (
          <SelectItem key={b} value={b} className="text-xs">
            {b}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
