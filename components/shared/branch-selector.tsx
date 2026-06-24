"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { setActiveBranch } from "@/actions/branches";

const ALL_BRANCHES = "__all__";

interface BranchSelectorProps {
  branches: { id: string; name: string }[];
  activeBranchId?: string;
  role: string;
}

export function BranchSelector({ branches, activeBranchId, role }: BranchSelectorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isSuperAdmin = role === "SUPER_ADMIN";

  // Nothing to switch between — just show a static label
  if (!isSuperAdmin && branches.length <= 1) {
    return branches.length === 1 ? (
      <div className="flex items-center gap-1.5 h-8 px-3 rounded-md border border-border/40 text-xs text-muted-foreground">
        <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
        {branches[0].name}
      </div>
    ) : null;
  }

  function handleChange(value: string) {
    startTransition(async () => {
      await setActiveBranch(value === ALL_BRANCHES ? null : value);
      router.refresh();
    });
  }

  return (
    <Select value={activeBranchId ?? ALL_BRANCHES} onValueChange={handleChange} disabled={pending}>
      <SelectTrigger className="h-8 w-auto min-w-[140px] text-xs gap-1.5">
        <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
        <SelectValue placeholder="Branch" />
      </SelectTrigger>
      <SelectContent>
        {isSuperAdmin && <SelectItem value={ALL_BRANCHES}>All Branches</SelectItem>}
        {branches.map((b) => (
          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
