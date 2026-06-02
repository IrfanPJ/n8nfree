import React from "react";
import { ShoppingBag, ScanLine, AlertTriangle, Clock, CheckCircle2, Truck } from "lucide-react";
import { getMyAssignedOrders, getUrgentOrders, getWorkshopCapacity } from "@/actions/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  MEASUREMENT: "Measurement", FABRIC_ORDERING: "Fabric Ordering",
  FABRIC_COLLECTED: "Fabric Collected", CUTTING: "Cutting",
  SEMI_STITCH: "Semi Stitch", TRIAL: "Trial",
  FINAL_STITCH: "Final Stitch", READY_FOR_DELIVERY: "Ready for Delivery",
  PENDING_ALTERATION: "Alteration", READY_FINAL_DELIVERY: "Ready Final",
};

const STATUS_COLORS: Record<string, string> = {
  CUTTING: "bg-yellow-400/10 text-yellow-400 border-yellow-400/20",
  SEMI_STITCH: "bg-purple-400/10 text-purple-400 border-purple-400/20",
  TRIAL: "bg-cyan-400/10 text-cyan-400 border-cyan-400/20",
  FINAL_STITCH: "bg-blue-400/10 text-blue-400 border-blue-400/20",
  READY_FOR_DELIVERY: "bg-green-400/10 text-green-400 border-green-400/20",
  PENDING_ALTERATION: "bg-red-400/10 text-red-400 border-red-400/20",
};

const POSITION_LABELS: Record<string, string> = {
  TAILOR: "Tailor", MASTER: "Master (Cutting)",
  PRODUCTION_IN_CHARGE: "Production In Charge", QUALITY_CHECK: "Quality Check",
};

export async function ProductionDashboard({ userId, userName, position }: { userId: string; userName: string; position: string }) {
  const [myOrders, urgentOrders, capacity] = await Promise.all([
    getMyAssignedOrders(userId),
    getUrgentOrders(),
    getWorkshopCapacity(),
  ]);

  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";

  const overdueOrders = myOrders.filter((o: any) => new Date(o.deliveryDate) < now);
  const dueSoon = myOrders.filter((o: any) => {
    const diff = new Date(o.deliveryDate).getTime() - now.getTime();
    return diff >= 0 && diff <= 3 * 24 * 60 * 60 * 1000;
  });

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-[#0a0a0a] via-[#0d0a12] to-[#0a0012] min-h-[140px] flex items-center">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle at 80% 50%, #a855f7 0%, transparent 60%)" }} />
        <div className="relative z-10 flex items-center justify-between w-full px-8 py-6">
          <div>
            <p className="text-purple-400/70 text-xs font-semibold uppercase tracking-widest mb-1">{POSITION_LABELS[position] ?? "Production"}</p>
            <h1 className="text-3xl font-bold text-white">{greeting}, {userName}</h1>
            <p className="text-white/40 text-sm mt-1">{now.toLocaleDateString("en-AE", { weekday: "long", day: "numeric", month: "long" })}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center bg-purple-500/10 border border-purple-500/20 rounded-xl px-5 py-3">
              <p className="text-2xl font-bold text-purple-400">{myOrders.length}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-wide mt-0.5">My Orders</p>
            </div>
            {overdueOrders.length > 0 && (
              <div className="text-center bg-red-500/10 border border-red-500/20 rounded-xl px-5 py-3">
                <p className="text-2xl font-bold text-red-400">{overdueOrders.length}</p>
                <p className="text-[10px] text-white/40 uppercase tracking-wide mt-0.5">Overdue</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Assigned to Me", value: myOrders.length, icon: <ShoppingBag className="w-4 h-4 text-purple-400" />, bg: "bg-purple-500/10", color: "text-purple-400" },
          { label: "Overdue", value: overdueOrders.length, icon: <AlertTriangle className="w-4 h-4 text-red-400" />, bg: "bg-red-500/10", color: overdueOrders.length > 0 ? "text-red-400" : "text-muted-foreground" },
          { label: "Due in 3 Days", value: dueSoon.length, icon: <Clock className="w-4 h-4 text-amber-400" />, bg: "bg-amber-500/10", color: dueSoon.length > 0 ? "text-amber-400" : "text-muted-foreground" },
          { label: "Workshop Capacity", value: `${capacity.percentage}%`, icon: <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />, bg: "bg-[#D4AF37]/10", color: "text-[#D4AF37]", sub: `${capacity.current}/${capacity.max} slots` },
        ].map((s, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-5">
              <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>{s.icon}</div>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mt-0.5">{s.label}</p>
              {(s as any).sub && <p className="text-xs text-muted-foreground mt-0.5">{(s as any).sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Workshop capacity bar */}
      <Card className="border-border/50">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Workshop Load</p>
            <span className="text-sm font-bold text-[#D4AF37]">{capacity.current} / {capacity.max} orders</span>
          </div>
          <div className="h-3 bg-secondary rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", capacity.percentage >= 90 ? "bg-red-400" : capacity.percentage >= 70 ? "bg-amber-400" : "bg-[#D4AF37]")}
              style={{ width: `${capacity.percentage}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">{capacity.percentage}% capacity used</p>
        </CardContent>
      </Card>

      {/* My assigned orders */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-2"><ShoppingBag className="w-4 h-4" /> My Assigned Orders</span>
            <a href="/orders" className="text-xs text-[#D4AF37] hover:underline font-normal">View all →</a>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {myOrders.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto" />
              <p className="text-sm text-muted-foreground">No orders assigned to you right now</p>
            </div>
          ) : (
            <div className="space-y-2">
              {myOrders.slice(0, 10).map((o: any) => {
                const dueDate = new Date(o.deliveryDate);
                const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                const isOverdue = diffDays < 0;
                const isSoon = diffDays >= 0 && diffDays <= 3;
                return (
                  <div key={o.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-secondary/20 hover:bg-secondary/40 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-[#D4AF37]">{o.orderNumber}</span>
                        <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium", STATUS_COLORS[o.status] ?? "bg-secondary/60 text-muted-foreground border-border/40")}>
                          {STATUS_LABELS[o.status] ?? o.status}
                        </span>
                        {o.priority === "URGENT" && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-medium">URGENT</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{o.customer?.name} · {o.garmentType}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={cn("text-xs font-semibold", isOverdue ? "text-red-400" : isSoon ? "text-amber-400" : "text-muted-foreground")}>
                        {isOverdue ? `${Math.abs(diffDays)}d overdue` : diffDays === 0 ? "Today" : `${diffDays}d left`}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{dueDate.toLocaleDateString("en-AE", { day: "2-digit", month: "short" })}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Urgent orders shop-wide */}
      {urgentOrders.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Truck className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-semibold text-amber-400">Shop-wide: {urgentOrders.length} order{urgentOrders.length !== 1 ? "s" : ""} due within 7 days</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {urgentOrders.map((o: any) => (
              <a key={o.id} href="/orders" className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border text-xs hover:border-amber-500/40 transition-colors">
                <span className="font-semibold text-[#D4AF37]">{o.orderNumber}</span>
                <span className="text-muted-foreground">{o.customer?.name}</span>
                <span className={o.urgency === "overdue" ? "font-bold text-red-400" : o.urgency === "today" ? "font-bold text-amber-400" : "text-muted-foreground"}>
                  {o.urgency === "overdue" ? "OVERDUE" : o.urgency === "today" ? "TODAY" : `${o.daysUntilDelivery}d`}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Quick action */}
      <div className="rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/5 p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-[#D4AF37]">Ready to scan an order?</p>
          <p className="text-xs text-muted-foreground mt-0.5">Use the QR scanner to update order status in seconds</p>
        </div>
        <a href="/scan" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D4AF37] text-black text-sm font-semibold hover:bg-[#D4AF37]/90 transition-colors">
          <ScanLine className="w-4 h-4" /> Scan QR
        </a>
      </div>
    </div>
  );
}
