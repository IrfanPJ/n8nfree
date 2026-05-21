export const dynamic = "force-dynamic";
import React from "react";
import { Suspense } from "react";
import {
  TrendingUp, Users, ShoppingBag, IndianRupee, Calendar, Clock,
  AlertTriangle, Package, Star
} from "lucide-react";
import { getDashboardStats, getRevenueData, getOrderStatusData, getRecentActivities } from "@/actions/dashboard";
import { StatCard } from "@/components/dashboard/stat-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { OrderStatusChart } from "@/components/dashboard/order-status-chart";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils";

async function DashboardContent() {
  const [stats, revenueData, orderStatusData, activities] = await Promise.all([
    getDashboardStats(),
    getRevenueData(),
    getOrderStatusData(),
    getRecentActivities(),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Welcome back. Here&apos;s what&apos;s happening today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={stats.totalRevenue}
          isCurrency
          icon={<IndianRupee className="w-5 h-5" />}
          trend={stats.revenueGrowth}
          trendLabel="vs last month"
          variant="gold"
          delay={0}
        />
        <StatCard
          title="Total Orders"
          value={stats.totalOrders}
          subtitle={`${stats.pendingOrders} pending`}
          icon={<ShoppingBag className="w-5 h-5" />}
          trend={stats.orderGrowth}
          trendLabel="vs last month"
          delay={0.05}
        />
        <StatCard
          title="Customers"
          value={stats.totalCustomers}
          subtitle={`+${stats.newCustomers} this month`}
          icon={<Users className="w-5 h-5" />}
          trend={stats.customerGrowth}
          trendLabel="vs last month"
          variant="success"
          delay={0.1}
        />
        <StatCard
          title="Today's Appointments"
          value={stats.todayAppointments}
          subtitle={`${stats.upcomingDeliveries} deliveries due`}
          icon={<Calendar className="w-5 h-5" />}
          variant="warning"
          delay={0.15}
        />
      </div>

      {/* Alert banner for overdue */}
      {stats.overdueInvoices > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">
            <span className="font-semibold">{stats.overdueInvoices} invoice{stats.overdueInvoices !== 1 ? "s" : ""}</span> overdue — immediate action required.
          </p>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RevenueChart data={revenueData} />
        </div>
        <div>
          <OrderStatusChart data={orderStatusData} />
        </div>
      </div>

      {/* Activity + Quick stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent activity */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No recent activity
                </div>
              ) : (
                <ul className="space-y-3">
                  {activities.map((activity) => (
                    <li key={activity.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">{activity.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {activity.user?.name ?? "System"} · {formatRelativeTime(activity.createdAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="space-y-4">
          <Card className="glass-gold">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/15 flex items-center justify-center">
                  <Star className="w-4 h-4 text-[#D4AF37]" />
                </div>
                <p className="text-sm font-medium">Ready for Delivery</p>
              </div>
              <p className="text-3xl font-bold text-[#D4AF37]">{stats.upcomingDeliveries}</p>
              <p className="text-xs text-muted-foreground mt-1">Orders ready this week</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-blue-400" />
                </div>
                <p className="text-sm font-medium">In Progress</p>
              </div>
              <p className="text-3xl font-bold">{stats.pendingOrders}</p>
              <p className="text-xs text-muted-foreground mt-1">Active orders being worked on</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center">
                  <Package className="w-4 h-4 text-green-400" />
                </div>
                <p className="text-sm font-medium">Completed</p>
              </div>
              <p className="text-3xl font-bold text-green-400">{stats.completedOrders}</p>
              <p className="text-xs text-muted-foreground mt-1">Successfully delivered</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64 mt-2" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="lg:col-span-2 h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
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
