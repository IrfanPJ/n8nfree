export const dynamic = "force-dynamic";
import React, { Suspense } from "react";
import {
  Users, ShoppingBag, DollarSign, Calendar, AlertTriangle,
  Package, Truck, Phone, Layers, Target, Clock, CheckCircle2,
  ChevronRight, ShoppingCart,
} from "lucide-react";
import {
  getDashboardStats, getRevenueData, getOrderStatusData, getRecentActivities,
  getUrgentOrders, getWorkshopCapacity, getNextDelivery, getBookingHeatmap,
  getTodayAppointments, getReadyOrders,
} from "@/actions/dashboard";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/utils";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

async function DashboardContent() {
  const [
    stats, revenueData, activities, urgentOrders,
    capacity, nextDelivery, heatmap, todayAppts, readyOrders,
  ] = await Promise.all([
    getDashboardStats(),
    getRevenueData(),
    getRecentActivities(),
    getUrgentOrders(),
    getWorkshopCapacity(),
    getNextDelivery(),
    getBookingHeatmap(),
    getTodayAppointments(),
    getReadyOrders(),
  ]);

  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";
  const heatmapMax = Math.max(...heatmap, 1);

  return (
    <div className="space-y-6">
      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden rounded-2xl border border-[#D4AF37]/20 bg-gradient-to-br from-[#0a0a0a] via-[#111] to-[#1a1500] min-h-[160px] flex items-center">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "repeating-linear-gradient(45deg, #D4AF37 0, #D4AF37 1px, transparent 0, transparent 50%)", backgroundSize: "20px 20px" }}
        />
        <div className="relative z-10 flex items-center justify-between w-full px-8 py-6">
          <div>
            <p className="text-[#D4AF37]/70 text-xs font-semibold uppercase tracking-widest mb-1">Management Panel</p>
            <h1 className="text-3xl font-bold text-white">{greeting}, Dubai</h1>
            <p className="text-white/50 text-sm mt-1">
              {now.toLocaleDateString("en-AE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} · All Branches
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center bg-white/5 border border-white/10 rounded-xl px-5 py-3">
              <p className="text-2xl font-bold text-[#D4AF37]">{stats.todayAppointments}</p>
              <p className="text-[10px] text-white/50 uppercase tracking-wide mt-0.5">Appts Today</p>
            </div>
            <div className="text-center bg-[#D4AF37]/15 border border-[#D4AF37]/30 rounded-xl px-5 py-3">
              <p className="text-2xl font-bold text-[#D4AF37]">{readyOrders.length}</p>
              <p className="text-[10px] text-[#D4AF37]/70 uppercase tracking-wide mt-0.5">Ready to Collect</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Widgets row: Capacity · Next Delivery · Heatmap ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Workshop Capacity */}
        <Card className="border-border/50">
          <CardContent className="p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Workshop Capacity</p>
            <p className="text-4xl font-bold text-[#D4AF37]">{capacity.percentage}%</p>
            <div className="mt-3 h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-[#D4AF37] transition-all"
                style={{ width: `${capacity.percentage}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">{capacity.current} of {capacity.max} slots</p>
          </CardContent>
        </Card>

        {/* Next Delivery */}
        <Card className="border-border/50">
          <CardContent className="p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Next Delivery</p>
            {nextDelivery ? (
              <>
                <p className="font-semibold text-foreground">{(nextDelivery as any).customer?.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{(nextDelivery as any).garmentType}</p>
                <p className="text-lg font-bold text-[#D4AF37] mt-2">
                  {new Date((nextDelivery as any).deliveryDate).toLocaleDateString("en-AE", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
                <p className="text-xs text-muted-foreground">Order {(nextDelivery as any).orderNumber}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">No upcoming deliveries</p>
            )}
          </CardContent>
        </Card>

        {/* Booking Heatmap */}
        <Card className="border-border/50">
          <CardContent className="p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Booking Heatmap</p>
            <div className="flex items-end gap-1.5">
              {/* Mon-Sun, reordered from Sun-Sat */}
              {[1, 2, 3, 4, 5, 6, 0].map((dayIdx, i) => {
                const count = heatmap[dayIdx];
                const intensity = count / heatmapMax;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-sm transition-all"
                      style={{
                        height: `${Math.max(8, intensity * 48)}px`,
                        backgroundColor: `rgba(212,175,55,${0.1 + intensity * 0.9})`,
                      }}
                      title={`${count} appointments`}
                    />
                    <span className="text-[9px] text-muted-foreground">{DAYS[i]}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Pending Appointments",
            value: stats.todayAppointments,
            sub: "requiring attention",
            icon: <Calendar className="w-4 h-4 text-blue-400" />,
            bg: "bg-blue-500/10",
          },
          {
            label: "Active Orders",
            value: stats.pendingOrders,
            sub: "in progress",
            icon: <ShoppingBag className="w-4 h-4 text-[#D4AF37]" />,
            bg: "bg-[#D4AF37]/10",
          },
          {
            label: "Clients in Book",
            value: stats.totalCustomers,
            sub: `${stats.newCustomers} new this month`,
            icon: <Users className="w-4 h-4 text-green-400" />,
            bg: "bg-green-500/10",
          },
          {
            label: "Revenue This Month",
            value: null,
            sub: "This month",
            currency: stats.totalRevenue,
            icon: <DollarSign className="w-4 h-4 text-[#D4AF37]" />,
            bg: "bg-[#D4AF37]/10",
          },
        ].map((s, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-5">
              <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
                {s.icon}
              </div>
              {s.currency !== undefined ? (
                <p className="text-xl font-bold text-[#D4AF37]">
                  AED {s.currency.toLocaleString("en-AE")}
                </p>
              ) : (
                <p className="text-3xl font-bold">{s.value}</p>
              )}
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mt-0.5">{s.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Urgent banners ── */}
      {urgentOrders.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Truck className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-semibold text-amber-400">
              {urgentOrders.length} order{urgentOrders.length !== 1 ? "s" : ""} due within 7 days
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {urgentOrders.map((o: any) => (
              <a key={o.id} href="/orders"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border hover:border-amber-500/40 transition-colors text-xs"
              >
                <span className="font-semibold text-[#D4AF37]">{o.orderNumber}</span>
                <span className="text-muted-foreground">{o.customer?.name}</span>
                <span className={o.urgency === "overdue" ? "font-bold text-red-400 uppercase" : o.urgency === "today" ? "font-bold text-amber-400 uppercase" : "text-muted-foreground"}>
                  {o.urgency === "overdue" ? "OVERDUE" : o.urgency === "today" ? "TODAY" : `${o.daysUntilDelivery}d`}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {stats.overdueInvoices > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-xl border border-red-500/20 bg-red-500/5">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400"><span className="font-semibold">{stats.overdueInvoices} invoice{stats.overdueInvoices !== 1 ? "s" : ""}</span> overdue.</p>
            <a href="/invoices" className="ml-auto text-xs text-red-400 underline">View</a>
          </div>
        )}
        {stats.overdueFollowUps > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-xl border border-orange-500/20 bg-orange-500/5">
            <Phone className="w-4 h-4 text-orange-400 flex-shrink-0" />
            <p className="text-sm text-orange-400"><span className="font-semibold">{stats.overdueFollowUps} follow-up{stats.overdueFollowUps !== 1 ? "s" : ""}</span> overdue.</p>
            <a href="/followups" className="ml-auto text-xs text-orange-400 underline">View</a>
          </div>
        )}
        {stats.lowStockFabrics > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5">
            <Layers className="w-4 h-4 text-yellow-400 flex-shrink-0" />
            <p className="text-sm text-yellow-400"><span className="font-semibold">{stats.lowStockFabrics} fabric{stats.lowStockFabrics !== 1 ? "s" : ""}</span> below reorder level.</p>
            <a href="/fabrics" className="ml-auto text-xs text-yellow-400 underline">View</a>
          </div>
        )}
      </div>

      {/* ── Today's Appointments + Orders Ready ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Today's Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            {todayAppts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No appointments today</p>
            ) : (
              <ul className="space-y-2">
                {todayAppts.slice(0, 6).map((a: any) => (
                  <li key={a.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{a.customer?.name}</p>
                      <p className="text-xs text-muted-foreground">{a.type} · {new Date(a.startTime).toLocaleTimeString("en-AE", { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      a.status === "CONFIRMED" ? "bg-green-500/10 text-green-400" : "bg-blue-500/10 text-blue-400"
                    }`}>{a.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Orders Ready for Action</CardTitle>
          </CardHeader>
          <CardContent>
            {readyOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No orders pending action</p>
            ) : (
              <ul className="space-y-2">
                {readyOrders.slice(0, 6).map((o: any) => (
                  <li key={o.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                    <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{o.customer?.name}</p>
                      <p className="text-xs text-muted-foreground">{o.garmentType} · {o.orderNumber}</p>
                    </div>
                    <a href="/orders" className="text-[10px] text-[#D4AF37] hover:underline flex items-center gap-0.5">
                      View <ChevronRight className="w-3 h-3" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Charts + Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RevenueChart data={revenueData} />
        </div>
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
            ) : (
              <ul className="space-y-3">
                {activities.slice(0, 8).map((a: any) => (
                  <li key={a.id} className="flex items-start gap-2 py-1.5 border-b border-border/50 last:border-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] mt-1.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground leading-snug">{a.description}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{formatRelativeTime(a.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── All Modules ── */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">All Modules at a Glance</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <a href="/pos" className="group block p-4 rounded-xl border border-border/50 bg-card hover:border-[#D4AF37]/40 transition-all">
            <ShoppingCart className="w-5 h-5 text-[#D4AF37] mb-2" />
            <p className="text-xs font-semibold">Point of Sale</p>
            <p className="text-lg font-bold mt-1">{stats.posSalesToday}</p>
            <p className="text-[10px] text-muted-foreground">sales today · AED {stats.posRevenueToday.toLocaleString("en-AE")}</p>
          </a>
          <a href="/leads" className="group block p-4 rounded-xl border border-border/50 bg-card hover:border-blue-400/40 transition-all">
            <Target className="w-5 h-5 text-blue-400 mb-2" />
            <p className="text-xs font-semibold">Leads Pipeline</p>
            <p className="text-lg font-bold mt-1">{stats.activeLeads}</p>
            <p className="text-[10px] text-muted-foreground">active · AED {stats.pipelineValue.toLocaleString("en-AE")} pipeline</p>
          </a>
          <a href="/fabrics" className="group block p-4 rounded-xl border border-border/50 bg-card hover:border-purple-400/40 transition-all">
            <Layers className="w-5 h-5 text-purple-400 mb-2" />
            <p className="text-xs font-semibold">Fabric Inventory</p>
            <p className="text-lg font-bold mt-1">{stats.totalFabrics}</p>
            <p className={`text-[10px] ${stats.lowStockFabrics > 0 ? "text-amber-400" : "text-muted-foreground"}`}>
              {stats.lowStockFabrics > 0 ? `${stats.lowStockFabrics} low stock` : "All stocked"}
            </p>
          </a>
          <a href="/followups" className="group block p-4 rounded-xl border border-border/50 bg-card hover:border-green-400/40 transition-all">
            <Phone className="w-5 h-5 text-green-400 mb-2" />
            <p className="text-xs font-semibold">Follow-ups</p>
            <p className="text-lg font-bold mt-1">{stats.pendingFollowUps}</p>
            <p className={`text-[10px] ${stats.overdueFollowUps > 0 ? "text-red-400" : "text-muted-foreground"}`}>
              {stats.overdueFollowUps > 0 ? `${stats.overdueFollowUps} overdue` : "All on track"}
            </p>
          </a>
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-40 rounded-2xl" />
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
