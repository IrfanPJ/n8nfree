import React from "react";
import { Layers, Package, AlertTriangle, DollarSign, TrendingDown } from "lucide-react";
import { getFabricDashboard } from "@/actions/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export async function PurchaseDashboard({ userName }: { userId: string; userName: string }) {
  const { fabrics, lowStock, recentPurchases, pendingPayments, totalSpendThisMonth, totalPending } = await getFabricDashboard();

  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-orange-500/20 bg-gradient-to-br from-[#0d0800] via-[#120a00] to-[#0a0600] min-h-[140px] flex items-center">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle at 70% 50%, #f97316 0%, transparent 60%)" }} />
        <div className="relative z-10 flex items-center justify-between w-full px-8 py-6">
          <div>
            <p className="text-orange-400/70 text-xs font-semibold uppercase tracking-widest mb-1">Purchase Staff</p>
            <h1 className="text-3xl font-bold text-white">{greeting}, {userName}</h1>
            <p className="text-white/40 text-sm mt-1">{now.toLocaleDateString("en-AE", { weekday: "long", day: "numeric", month: "long" })}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center bg-orange-500/10 border border-orange-500/20 rounded-xl px-5 py-3">
              <p className="text-2xl font-bold text-orange-400">{fabrics.length}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-wide mt-0.5">Fabric Types</p>
            </div>
            {lowStock.length > 0 && (
              <div className="text-center bg-red-500/10 border border-red-500/20 rounded-xl px-5 py-3">
                <p className="text-2xl font-bold text-red-400">{lowStock.length}</p>
                <p className="text-[10px] text-white/40 uppercase tracking-wide mt-0.5">Low Stock</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Fabrics", value: fabrics.length, icon: <Layers className="w-4 h-4 text-purple-400" />, bg: "bg-purple-500/10", color: "text-foreground" },
          { label: "Low Stock Items", value: lowStock.length, icon: <AlertTriangle className="w-4 h-4 text-red-400" />, bg: "bg-red-500/10", color: lowStock.length > 0 ? "text-red-400" : "text-muted-foreground" },
          { label: "Spent This Month", value: null, currency: totalSpendThisMonth, icon: <DollarSign className="w-4 h-4 text-orange-400" />, bg: "bg-orange-500/10", color: "text-orange-400" },
          { label: "Pending Payments", value: null, currency: totalPending, icon: <TrendingDown className="w-4 h-4 text-amber-400" />, bg: "bg-amber-500/10", color: totalPending > 0 ? "text-amber-400" : "text-muted-foreground" },
        ].map((s, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-5">
              <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>{s.icon}</div>
              {s.currency !== undefined ? (
                <p className={`text-xl font-bold ${s.color}`}>AED {s.currency.toLocaleString("en-AE")}</p>
              ) : <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>}
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
          <p className="text-sm font-semibold text-red-400 flex items-center gap-2 mb-3"><AlertTriangle className="w-4 h-4" /> {lowStock.length} fabric{lowStock.length !== 1 ? "s" : ""} below reorder level</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {lowStock.map((f: any) => (
              <div key={f.id} className="p-3 rounded-lg bg-card border border-red-500/20">
                <p className="text-sm font-medium truncate">{f.name}</p>
                <p className="text-xs text-red-400 font-semibold">{f.stockQty} {f.unit} left</p>
                <p className="text-[10px] text-muted-foreground">Reorder at {f.reorderLevel}</p>
              </div>
            ))}
          </div>
          <a href="/fabrics" className="block mt-3 text-xs text-[#D4AF37] hover:underline">Manage fabric inventory →</a>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent purchases */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-2"><Package className="w-4 h-4" /> Recent Purchases (This Month)</span>
              <a href="/purchases" className="text-xs text-[#D4AF37] hover:underline font-normal">All →</a>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentPurchases.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No purchases this month</p>
            ) : (
              <ul className="space-y-2">
                {recentPurchases.map((p: any) => (
                  <li key={p.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.itemName}</p>
                      <p className="text-xs text-muted-foreground">{(p.supplier as any)?.name ?? "No supplier"} · {p.category}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold">AED {(p.totalAmount ?? 0).toLocaleString("en-AE")}</p>
                      <p className={cn("text-[10px]", p.paidAmount >= p.totalAmount ? "text-green-400" : "text-amber-400")}>
                        {p.paidAmount >= p.totalAmount ? "Paid" : `AED ${((p.totalAmount ?? 0) - (p.paidAmount ?? 0)).toLocaleString("en-AE")} due`}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Pending payments */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-amber-400" /> Pending Supplier Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No pending payments</p>
            ) : (
              <ul className="space-y-2">
                {pendingPayments.slice(0, 8).map((p: any) => (
                  <li key={p.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.itemName}</p>
                      <p className="text-xs text-muted-foreground">{(p.supplier as any)?.name ?? "No supplier"}</p>
                    </div>
                    <p className="text-sm font-semibold text-amber-400 flex-shrink-0">
                      AED {((p.totalAmount ?? 0) - (p.paidAmount ?? 0)).toLocaleString("en-AE")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Full fabric stock table */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-2"><Layers className="w-4 h-4" /> Fabric Stock Levels</span>
            <a href="/fabrics" className="text-xs text-[#D4AF37] hover:underline font-normal">Manage →</a>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40">
                  <th className="text-left px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase">Fabric</th>
                  <th className="text-right px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase">Stock</th>
                  <th className="text-right px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase">Reorder</th>
                  <th className="text-right px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {fabrics.slice(0, 12).map((f: any) => {
                  const isLow = f.stockQty <= f.reorderLevel;
                  return (
                    <tr key={f.id} className={cn("hover:bg-secondary/20", isLow ? "bg-red-500/5" : "")}>
                      <td className="px-4 py-2.5 font-medium">{f.name}</td>
                      <td className="px-4 py-2.5 text-right">{f.stockQty} {f.unit}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">{f.reorderLevel}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", isLow ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400")}>
                          {isLow ? "Low" : "OK"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
