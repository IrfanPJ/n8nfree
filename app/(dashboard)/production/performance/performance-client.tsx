"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { getInitials } from "@/lib/utils";
import type { TailorRating } from "@/lib/production-calc";
import type { ProductionTailorPerformance } from "@/types/production";

const RATING_STYLES: Record<TailorRating, string> = {
  EXCELLENT: "bg-green-500/10 text-green-400 border-green-500/20",
  "NEEDS ATTENTION": "bg-red-500/10 text-red-400 border-red-500/20",
  NEW: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  STANDARD: "bg-secondary text-muted-foreground border-border",
};

function money(n: number): string {
  return `AED ${Math.abs(n).toLocaleString("en-AE", { maximumFractionDigits: 0 })}`;
}

function RatingBadge({ rating }: { rating: TailorRating }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${RATING_STYLES[rating]}`}>
      {rating}
    </span>
  );
}

export function PerformanceClient({ performances }: { performances: ProductionTailorPerformance[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Performance</h1>
        <p className="text-sm text-muted-foreground">Output, delays and earnings per tailor</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {performances.map((p) => {
          const delta = p.pieceEarnings - p.tailor.monthlySalary;
          return (
            <Link key={p.tailor.id} href={`/production/tailors/${p.tailor.id}`}>
              <Card className="hover:border-[#D4AF37]/40 transition-colors h-full">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold flex-shrink-0">
                        {getInitials(p.tailor.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{p.tailor.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{p.tailor.jobTitles.join(", ") || "—"}</p>
                      </div>
                    </div>
                    <RatingBadge rating={p.rating} />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-lg font-bold font-mono text-green-400">{p.pcsDone}</p>
                      <p className="text-[9px] uppercase text-muted-foreground">Pcs Done</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold font-mono">{p.activeOrders}</p>
                      <p className="text-[9px] uppercase text-muted-foreground">Active</p>
                    </div>
                    <div>
                      <p className={`text-lg font-bold font-mono ${p.delayedOrders > 0 ? "text-red-400" : ""}`}>{p.delayedOrders}</p>
                      <p className="text-[9px] uppercase text-muted-foreground">Delayed</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xl font-bold font-mono text-[#D4AF37]">{money(p.pieceEarnings)}</p>
                    <p className="text-[10px] uppercase text-muted-foreground">Piece Earned</p>
                    {delta < 0 && (
                      <p className="text-xs text-red-400 mt-0.5">▼ {money(delta)} vs salary</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Performance Summary</h2>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tailor</TableHead>
                  <TableHead>Total Orders</TableHead>
                  <TableHead>Pcs Done</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Delayed</TableHead>
                  <TableHead>Piece Earnings</TableHead>
                  <TableHead>Monthly Salary</TableHead>
                  <TableHead>Total CTC</TableHead>
                  <TableHead>Rating</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performances.map((p) => (
                  <TableRow key={p.tailor.id}>
                    <TableCell className="font-medium">{p.tailor.name}</TableCell>
                    <TableCell>{p.totalOrders}</TableCell>
                    <TableCell>{p.pcsDone}</TableCell>
                    <TableCell>{p.activeOrders}</TableCell>
                    <TableCell className={p.delayedOrders > 0 ? "text-red-400" : ""}>{p.delayedOrders}</TableCell>
                    <TableCell>{money(p.pieceEarnings)}</TableCell>
                    <TableCell>{money(p.tailor.monthlySalary)}</TableCell>
                    <TableCell>{money(p.tailor.totalCostToCompany)}</TableCell>
                    <TableCell><RatingBadge rating={p.rating} /></TableCell>
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
