"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { getInitials } from "@/lib/utils";
import type { ProductionTailorWorkload } from "@/types/production";

const AVATAR_COLORS = ["bg-blue-500", "bg-purple-500", "bg-amber-500", "bg-green-500", "bg-pink-500", "bg-cyan-500"];

function avatarColor(name: string): string {
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

type SortKey = "hoursNeeded" | "workDays" | "pcsInHand";

export function TailorsClient({ workloads }: { workloads: ProductionTailorWorkload[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("hoursNeeded");

  const sortedSlots = useMemo(
    () => [...workloads].sort((a, b) => b[sortKey] - a[sortKey]),
    [workloads, sortKey]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Tailors</h1>
        <p className="text-sm text-muted-foreground">{workloads.length} tailors on the roster</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {workloads.map((w) => (
          <Link key={w.tailor.id} href={`/production/tailors/${w.tailor.id}`}>
            <Card className="hover:border-[#D4AF37]/40 transition-colors h-full">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${avatarColor(w.tailor.name)} flex items-center justify-center text-white font-bold flex-shrink-0`}>
                    {getInitials(w.tailor.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{w.tailor.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{w.tailor.jobTitles.join(", ") || "—"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold font-mono">{w.pcsInHand}</p>
                    <p className="text-[9px] uppercase text-muted-foreground">Pcs in Hand</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold font-mono">{w.hoursNeeded}</p>
                    <p className="text-[9px] uppercase text-muted-foreground">Hours Needed</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold font-mono">{w.workDays}</p>
                    <p className="text-[9px] uppercase text-muted-foreground">Work Days</p>
                  </div>
                </div>

                <div>
                  <p className={`text-sm font-semibold ${w.isAvailableNow ? "text-green-400" : "text-foreground"}`}>
                    {w.isAvailableNow ? "Available Now" : `Next: ${w.nextAvailableDate}`}
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Load</span>
                    <span className="font-medium">{w.loadPercent}% · {w.activeOrderCount} active</span>
                  </div>
                  <Progress value={Math.min(w.loadPercent, 100)} className={w.loadPercent >= 100 ? "[&>div]:bg-red-400" : w.loadPercent >= 70 ? "[&>div]:bg-amber-400" : ""} />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Next Available Slots</h2>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="text-xs bg-secondary border border-border rounded-md px-2 py-1"
            >
              <option value="hoursNeeded">Sort: Hours Needed</option>
              <option value="workDays">Sort: Days</option>
              <option value="pcsInHand">Sort: Active Pcs</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tailor</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Active Pcs</TableHead>
                  <TableHead>Hours Needed</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Next Available</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedSlots.map((w) => (
                  <TableRow key={w.tailor.id}>
                    <TableCell className="font-medium">{w.tailor.name}</TableCell>
                    <TableCell className="text-muted-foreground">{w.tailor.jobTitles.join(", ") || "—"}</TableCell>
                    <TableCell>{w.pcsInHand}</TableCell>
                    <TableCell>{w.hoursNeeded}</TableCell>
                    <TableCell>{w.workDays}</TableCell>
                    <TableCell className={w.isAvailableNow ? "text-green-400" : ""}>
                      {w.isAvailableNow ? "Available Now" : w.nextAvailableDate}
                    </TableCell>
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
