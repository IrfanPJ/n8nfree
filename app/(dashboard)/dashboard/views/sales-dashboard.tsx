import React from "react";
import { Target, Phone, Calendar, Users, TrendingUp, CheckCircle2, AlertCircle, Plus } from "lucide-react";
import { getSalesStats, getMyFollowUps, getMyAppointmentsToday } from "@/actions/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const STAGE_LABELS: Record<string, string> = {
  ENQUIRY: "Enquiry", INTERESTED: "Interested", QUOTED: "Quoted",
  APPOINTMENT_CONFIRMED: "Appt. Confirmed",
};

const STAGE_COLORS: Record<string, string> = {
  ENQUIRY: "bg-blue-400", INTERESTED: "bg-purple-400",
  QUOTED: "bg-yellow-400", APPOINTMENT_CONFIRMED: "bg-cyan-400",
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  HIGH:   { label: "High",   color: "text-red-400" },
  MEDIUM: { label: "Medium", color: "text-yellow-400" },
  LOW:    { label: "Low",    color: "text-muted-foreground" },
};

export async function SalesDashboard({ userId, userName, position }: { userId: string; userName: string; position: string }) {
  const [salesStats, followUps, myAppointments] = await Promise.all([
    getSalesStats(userId),
    getMyFollowUps(userId),
    getMyAppointmentsToday(userId),
  ]);

  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";
  const positionLabel = position === "SALES_STAFF" ? "Sales Staff" : "Lead Management";

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-[#0a0a12] via-[#0d0d1a] to-[#060612] min-h-[140px] flex items-center">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #3b82f6 0%, transparent 60%)" }} />
        <div className="relative z-10 flex items-center justify-between w-full px-8 py-6">
          <div>
            <p className="text-blue-400/70 text-xs font-semibold uppercase tracking-widest mb-1">{positionLabel}</p>
            <h1 className="text-3xl font-bold text-white">{greeting}, {userName}</h1>
            <p className="text-white/40 text-sm mt-1">{now.toLocaleDateString("en-AE", { weekday: "long", day: "numeric", month: "long" })}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center bg-blue-500/10 border border-blue-500/20 rounded-xl px-5 py-3">
              <p className="text-2xl font-bold text-blue-400">{salesStats.activeLeads}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-wide mt-0.5">Active Leads</p>
            </div>
            <div className="text-center bg-green-500/10 border border-green-500/20 rounded-xl px-5 py-3">
              <p className="text-2xl font-bold text-green-400">{salesStats.closedThisMonth}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-wide mt-0.5">Closed This Month</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Leads", value: salesStats.activeLeads, icon: <Target className="w-4 h-4 text-blue-400" />, bg: "bg-blue-500/10", color: "text-blue-400" },
          { label: "My Follow-ups", value: salesStats.myOpenFollowUps, icon: <Phone className="w-4 h-4 text-orange-400" />, bg: "bg-orange-500/10", color: followUps.overdueCount > 0 ? "text-red-400" : "text-orange-400", sub: followUps.overdueCount > 0 ? `${followUps.overdueCount} overdue` : "All on track" },
          { label: "My Appts Today", value: salesStats.apptToday, icon: <Calendar className="w-4 h-4 text-cyan-400" />, bg: "bg-cyan-500/10", color: "text-cyan-400" },
          { label: "Closed Won (Month)", value: salesStats.closedThisMonth, icon: <TrendingUp className="w-4 h-4 text-green-400" />, bg: "bg-green-500/10", color: "text-green-400" },
        ].map((s, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-5">
              <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>{s.icon}</div>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mt-0.5">{s.label}</p>
              {s.sub && <p className={`text-xs mt-0.5 ${followUps.overdueCount > 0 && s.label === "My Follow-ups" ? "text-red-400" : "text-muted-foreground"}`}>{s.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pipeline breakdown */}
      {Object.keys(salesStats.stageBreakdown).length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Target className="w-4 h-4" /> Pipeline Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(salesStats.stageBreakdown).map(([stage, count]) => (
                <div key={stage} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border/40">
                  <span className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", STAGE_COLORS[stage] ?? "bg-muted-foreground")} />
                  <div>
                    <p className="text-lg font-bold">{count}</p>
                    <p className="text-[10px] text-muted-foreground">{STAGE_LABELS[stage] ?? stage}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* My Today's Appointments */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4" /> My Appointments Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            {myAppointments.length === 0 ? (
              <div className="text-center py-6 space-y-2">
                <p className="text-sm text-muted-foreground">No appointments today</p>
                <a href="/appointments" className="inline-flex items-center gap-1.5 text-xs text-[#D4AF37] hover:underline"><Plus className="w-3 h-3" /> Book one</a>
              </div>
            ) : (
              <ul className="space-y-2">
                {myAppointments.map((a: any) => (
                  <li key={a.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{a.customer?.name}</p>
                      <p className="text-xs text-muted-foreground">{a.type} · {new Date(a.startTime).toLocaleTimeString("en-AE", { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${a.status === "CONFIRMED" ? "bg-green-500/10 text-green-400" : "bg-blue-500/10 text-blue-400"}`}>{a.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* My Follow-ups */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-2"><Phone className="w-4 h-4" /> My Follow-ups</span>
              {followUps.overdueCount > 0 && (
                <span className="text-[10px] text-red-400 font-semibold flex items-center gap-1"><AlertCircle className="w-3 h-3" />{followUps.overdueCount} overdue</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {followUps.pending.length === 0 ? (
              <div className="text-center py-6 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto" />
                <p className="text-sm text-muted-foreground">All caught up!</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {followUps.pending.slice(0, 6).map((f: any) => {
                  const isOverdue = f.dueDate && new Date(f.dueDate) < new Date();
                  const pri = PRIORITY_CONFIG[f.priority] ?? PRIORITY_CONFIG.MEDIUM;
                  return (
                    <li key={f.id} className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${isOverdue ? "bg-red-400" : "bg-orange-400"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{f.title}</p>
                        <p className="text-xs text-muted-foreground">{f.customer?.name} · <span className={pri.color}>{pri.label}</span></p>
                      </div>
                      {f.dueDate && (
                        <span className={`text-[10px] flex-shrink-0 mt-0.5 ${isOverdue ? "text-red-400 font-semibold" : "text-muted-foreground"}`}>
                          {isOverdue ? "Overdue" : new Date(f.dueDate).toLocaleDateString("en-AE", { day: "2-digit", month: "short" })}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            <a href="/followups" className="block mt-3 text-center text-xs text-[#D4AF37] hover:underline">View all follow-ups →</a>
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { href: "/leads", icon: <Target className="w-5 h-5 text-blue-400" />, label: "Leads Pipeline", sub: `${salesStats.activeLeads} active` },
            { href: "/appointments", icon: <Calendar className="w-5 h-5 text-cyan-400" />, label: "Appointments", sub: `${salesStats.apptToday} today` },
            { href: "/followups", icon: <Phone className="w-5 h-5 text-orange-400" />, label: "Follow-ups", sub: `${salesStats.myOpenFollowUps} pending` },
            { href: "/customers", icon: <Users className="w-5 h-5 text-green-400" />, label: "Client Book", sub: "All customers" },
          ].map((item) => (
            <a key={item.href} href={item.href} className="block p-4 rounded-xl border border-border/50 bg-card hover:border-[#D4AF37]/40 transition-all">
              {item.icon}
              <p className="text-xs font-semibold mt-2">{item.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{item.sub}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
