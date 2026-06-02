import React from "react";
import { Truck, CheckCircle2, AlertTriangle, Phone, ScanLine, MapPin } from "lucide-react";
import { getLogisticsDashboard } from "@/actions/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { openWhatsApp } from "@/lib/utils";
import { cn } from "@/lib/utils";

export async function LogisticsDashboard({ userName }: { userId: string; userName: string }) {
  const { readyOrders, upcomingDeliveries, overdueDeliveries } = await getLogisticsDashboard();

  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-green-500/20 bg-gradient-to-br from-[#020d06] via-[#0a120a] to-[#010a04] min-h-[140px] flex items-center">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle at 30% 50%, #22c55e 0%, transparent 60%)" }} />
        <div className="relative z-10 flex items-center justify-between w-full px-8 py-6">
          <div>
            <p className="text-green-400/70 text-xs font-semibold uppercase tracking-widest mb-1">Logistics Coordinator</p>
            <h1 className="text-3xl font-bold text-white">{greeting}, {userName}</h1>
            <p className="text-white/40 text-sm mt-1">{now.toLocaleDateString("en-AE", { weekday: "long", day: "numeric", month: "long" })}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center bg-green-500/10 border border-green-500/20 rounded-xl px-5 py-3">
              <p className="text-2xl font-bold text-green-400">{readyOrders.length}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-wide mt-0.5">Ready to Deliver</p>
            </div>
            {overdueDeliveries.length > 0 && (
              <div className="text-center bg-red-500/10 border border-red-500/20 rounded-xl px-5 py-3">
                <p className="text-2xl font-bold text-red-400">{overdueDeliveries.length}</p>
                <p className="text-[10px] text-white/40 uppercase tracking-wide mt-0.5">Overdue</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Ready for Delivery", value: readyOrders.length, icon: <CheckCircle2 className="w-4 h-4 text-green-400" />, bg: "bg-green-500/10", color: "text-green-400" },
          { label: "Due This Week", value: upcomingDeliveries.length, icon: <Truck className="w-4 h-4 text-amber-400" />, bg: "bg-amber-500/10", color: "text-amber-400" },
          { label: "Overdue", value: overdueDeliveries.length, icon: <AlertTriangle className="w-4 h-4 text-red-400" />, bg: "bg-red-500/10", color: overdueDeliveries.length > 0 ? "text-red-400" : "text-muted-foreground" },
        ].map((s, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-5">
              <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>{s.icon}</div>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {overdueDeliveries.length > 0 && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
          <p className="text-sm font-semibold text-red-400 flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4" /> Overdue Deliveries</p>
          <div className="space-y-2">
            {overdueDeliveries.map((o: any) => (
              <div key={o.id} className="flex items-center gap-3 p-2 rounded-lg bg-card border border-border/40 text-sm">
                <span className="font-semibold text-[#D4AF37]">{o.orderNumber}</span>
                <span className="text-muted-foreground flex-1 truncate">{o.customer?.name} · {o.garmentType}</span>
                <span className="text-red-400 text-xs font-semibold">{new Date(o.deliveryDate).toLocaleDateString("en-AE", { day: "2-digit", month: "short" })}</span>
                {o.customer?.phone && (
                  <a href={`https://wa.me/${o.customer.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300">
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Ready for delivery */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" /> Ready to Hand Over
            </CardTitle>
          </CardHeader>
          <CardContent>
            {readyOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No orders ready right now</p>
            ) : (
              <ul className="space-y-2">
                {readyOrders.map((o: any) => (
                  <li key={o.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                    <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{o.customer?.name}</p>
                      <p className="text-xs text-muted-foreground">{o.garmentType} · {o.orderNumber}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {o.customer?.phone && (
                        <a href={`https://wa.me/${o.customer.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hello ${o.customer.name}, your order ${o.orderNumber} is ready for collection!`)}`} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300">
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <span className="text-[10px] text-muted-foreground">{new Date(o.deliveryDate).toLocaleDateString("en-AE", { day: "2-digit", month: "short" })}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Upcoming this week */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-400" /> Upcoming Deliveries (7 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingDeliveries.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nothing due this week</p>
            ) : (
              <ul className="space-y-2">
                {upcomingDeliveries.map((o: any) => {
                  const diffDays = Math.ceil((new Date(o.deliveryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <li key={o.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{o.customer?.name}</p>
                        <p className="text-xs text-muted-foreground">{o.garmentType} · {o.orderNumber}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={cn("text-xs font-semibold", diffDays === 0 ? "text-amber-400" : diffDays <= 2 ? "text-yellow-400" : "text-muted-foreground")}>
                          {diffDays === 0 ? "Today" : `${diffDays}d`}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{new Date(o.deliveryDate).toLocaleDateString("en-AE", { day: "2-digit", month: "short" })}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Scan CTA */}
      <div className="rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/5 p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-[#D4AF37]">Scan order on delivery</p>
          <p className="text-xs text-muted-foreground mt-0.5">Scan the QR code to mark the order as Delivered</p>
        </div>
        <a href="/scan" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D4AF37] text-black text-sm font-semibold hover:bg-[#D4AF37]/90 transition-colors">
          <ScanLine className="w-4 h-4" /> Scan QR
        </a>
      </div>
    </div>
  );
}
