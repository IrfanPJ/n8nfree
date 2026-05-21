"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  CalendarDays,
  Clock,
  User,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  List,
  Calendar,
  Filter,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isToday,
  isSameMonth,
  addMonths,
  subMonths,
  parseISO,
} from "date-fns";
import { openWhatsApp } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { AppointmentForm } from "@/components/appointments/appointment-form";
import {
  deleteAppointment,
  updateAppointmentStatus,
} from "@/actions/appointments";
import { APPOINTMENT_STATUS_CONFIG } from "@/lib/utils";
import {
  APPOINTMENT_TYPE_LABELS,
  type AppointmentType,
} from "@/validators/appointment";
import type { AppointmentWithRelations, Customer, User as UserType } from "@/types";
import type { AppointmentStatus } from "@/types";
import { cn } from "@/lib/utils";

interface AppointmentsClientProps {
  appointments: AppointmentWithRelations[];
  customers: Customer[];
  staff: UserType[];
}

const TYPE_COLORS: Record<string, string> = {
  FITTING: "border-l-purple-400 bg-purple-400/5",
  MEASUREMENT: "border-l-blue-400 bg-blue-400/5",
  TRIAL: "border-l-cyan-400 bg-cyan-400/5",
  DELIVERY: "border-l-green-400 bg-green-400/5",
  CONSULTATION: "border-l-yellow-400 bg-yellow-400/5",
  OTHER: "border-l-gray-400 bg-gray-400/5",
};

const TYPE_DOT_COLORS: Record<string, string> = {
  FITTING: "bg-purple-400",
  MEASUREMENT: "bg-blue-400",
  TRIAL: "bg-cyan-400",
  DELIVERY: "bg-green-400",
  CONSULTATION: "bg-yellow-400",
  OTHER: "bg-gray-400",
};

function StatusBadge({ status }: { status: AppointmentStatus }) {
  const config = APPOINTMENT_STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
        config.color,
        config.bg
      )}
    >
      {config.label}
    </span>
  );
}

function AppointmentCard({
  appointment,
  onEdit,
  onDelete,
  onStatusChange,
  compact = false,
}: {
  appointment: AppointmentWithRelations;
  onEdit: (a: AppointmentWithRelations) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: AppointmentStatus) => void;
  compact?: boolean;
}) {
  const typeColor = TYPE_COLORS[appointment.type] ?? TYPE_COLORS.OTHER;
  const dotColor = TYPE_DOT_COLORS[appointment.type] ?? TYPE_DOT_COLORS.OTHER;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className={cn(
        "border-l-4 rounded-r-lg px-3 py-2.5 group transition-all",
        typeColor,
        compact ? "text-xs" : ""
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={cn(
                "inline-block w-2 h-2 rounded-full flex-shrink-0",
                dotColor
              )}
            />
            <p className={cn("font-medium leading-tight truncate", compact ? "text-xs" : "text-sm")}>
              {appointment.title}
            </p>
            {!compact && <StatusBadge status={appointment.status} />}
          </div>

          {!compact && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {appointment.customer.name}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {format(new Date(appointment.startTime), "h:mm a")} –{" "}
                {format(new Date(appointment.endTime), "h:mm a")}
              </span>
              {appointment.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {appointment.location}
                </span>
              )}
            </div>
          )}

          {compact && (
            <p className="text-[10px] text-muted-foreground truncate">
              {format(new Date(appointment.startTime), "h:mm a")} · {appointment.customer.name}
            </p>
          )}
        </div>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {appointment.customer.phone && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-7 w-7 text-green-400 hover:text-green-300"
              onClick={() => openWhatsApp(
                appointment.customer.phone,
                `Hello ${appointment.customer.name}, this is a reminder for your appointment: *${appointment.title}* on ${format(new Date(appointment.startTime), "dd MMM yyyy")} at ${format(new Date(appointment.startTime), "h:mm a")}. House of Tailors.`
              )}
            >
              <MessageCircle className="w-3.5 h-3.5" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="h-7 w-7">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {(
                [
                  "SCHEDULED",
                  "CONFIRMED",
                  "IN_PROGRESS",
                  "COMPLETED",
                  "CANCELLED",
                  "NO_SHOW",
                ] as AppointmentStatus[]
              ).map((s) => (
                <DropdownMenuItem
                  key={s}
                  onClick={() => onStatusChange(appointment.id, s)}
                  className={cn(
                    "text-xs",
                    appointment.status === s && "font-semibold text-[#D4AF37]"
                  )}
                >
                  {APPOINTMENT_STATUS_CONFIG[s].label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7"
            onClick={() => onEdit(appointment)}
          >
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => onDelete(appointment.id)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

type ViewMode = "month" | "list";

const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function AppointmentsClient({
  appointments: initialAppointments,
  customers,
  staff,
}: AppointmentsClientProps) {
  const router = useRouter();
  const [appointments, setAppointments] = useState(initialAppointments);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [createOpen, setCreateOpen] = useState(false);
  const [createDate, setCreateDate] = useState<Date | undefined>();
  const [editAppointment, setEditAppointment] = useState<AppointmentWithRelations | null>(null);
  const [filterStatus, setFilterStatus] = useState<AppointmentStatus | "">("");

  // All days shown in the monthly grid (Mon-start, covers partial prev/next months)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const filtered = useMemo(
    () =>
      appointments.filter((a) => (!filterStatus ? true : a.status === filterStatus)),
    [appointments, filterStatus]
  );

  const todayAppointments = useMemo(
    () => filtered.filter((a) => isToday(new Date(a.startTime))),
    [filtered]
  );

  const upcomingAppointments = useMemo(
    () =>
      filtered
        .filter(
          (a) =>
            new Date(a.startTime) > new Date() &&
            !isToday(new Date(a.startTime)) &&
            !["CANCELLED", "COMPLETED", "NO_SHOW"].includes(a.status)
        )
        .slice(0, 20),
    [filtered]
  );

  const getAppointmentsForDay = (day: Date) =>
    filtered.filter((a) => isSameDay(new Date(a.startTime), day));

  const handleDelete = async (id: string) => {
    if (!confirm("Cancel this appointment?")) return;
    const result = await deleteAppointment(id);
    if (result.success) {
      toast.success("Appointment cancelled");
      setAppointments((prev) => prev.filter((a) => a.id !== id));
    } else {
      toast.error(result.error ?? "Failed");
    }
  };

  const handleStatusChange = async (id: string, status: AppointmentStatus) => {
    const result = await updateAppointmentStatus(id, status);
    if (result.success && result.data) {
      toast.success(`Status updated to ${APPOINTMENT_STATUS_CONFIG[status].label}`);
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status } : a))
      );
    } else {
      toast.error(result.error ?? "Failed to update status");
    }
  };

  const handleCreateSuccess = (a: AppointmentWithRelations) => {
    setAppointments((prev) => [a, ...prev]);
    setCreateOpen(false);
    setCreateDate(undefined);
  };

  const handleEditSuccess = (a: AppointmentWithRelations) => {
    setAppointments((prev) => prev.map((x) => (x.id === a.id ? a : x)));
    setEditAppointment(null);
  };

  const statusOptions: Array<{ value: AppointmentStatus | ""; label: string }> = [
    { value: "", label: "All Statuses" },
    { value: "SCHEDULED", label: "Scheduled" },
    { value: "CONFIRMED", label: "Confirmed" },
    { value: "IN_PROGRESS", label: "In Progress" },
    { value: "COMPLETED", label: "Completed" },
    { value: "CANCELLED", label: "Cancelled" },
    { value: "NO_SHOW", label: "No Show" },
  ];

  // Split calendarDays into weeks (rows of 7)
  const calendarWeeks = useMemo(() => {
    const weeks: Date[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      weeks.push(calendarDays.slice(i, i + 7));
    }
    return weeks;
  }, [calendarDays]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Appointments</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {appointments.length} total · {todayAppointments.length} today
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-border overflow-hidden">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="icon-sm"
              onClick={() => setViewMode("list")}
              className="rounded-none border-0"
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "month" ? "default" : "ghost"}
              size="icon-sm"
              onClick={() => setViewMode("month")}
              className="rounded-none border-0"
            >
              <Calendar className="w-4 h-4" />
            </Button>
          </div>
          <Button variant="gold" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Appointment
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Status:</span>
        </div>
        {statusOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setFilterStatus(opt.value)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
              filterStatus === opt.value
                ? "bg-[#D4AF37] text-black"
                : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Today",
            value: todayAppointments.length,
            icon: CalendarDays,
            highlight: todayAppointments.length > 0,
          },
          {
            label: "Upcoming",
            value: upcomingAppointments.length,
            icon: Clock,
            highlight: false,
          },
          {
            label: "Completed",
            value: appointments.filter((a) => a.status === "COMPLETED").length,
            icon: CheckCircle2,
            highlight: false,
          },
          {
            label: "Cancelled",
            value: appointments.filter((a) => a.status === "CANCELLED").length,
            icon: XCircle,
            highlight: false,
          },
        ].map((stat) => (
          <Card
            key={stat.label}
            className={cn(
              "border-border/40",
              stat.highlight && "border-[#D4AF37]/40 bg-[#D4AF37]/5"
            )}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <stat.icon
                className={cn(
                  "w-8 h-8",
                  stat.highlight ? "text-[#D4AF37]" : "text-muted-foreground"
                )}
              />
              <div>
                <p
                  className={cn(
                    "text-xl font-bold",
                    stat.highlight ? "text-[#D4AF37]" : ""
                  )}
                >
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Today's Appointments — always shown prominently */}
      {todayAppointments.length > 0 && (
        <Card className="border-[#D4AF37]/30 bg-[#D4AF37]/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-[#D4AF37]">
              <CalendarDays className="w-4 h-4" />
              Today's Schedule — {format(new Date(), "EEEE, dd MMMM")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <AnimatePresence>
              {todayAppointments
                .sort(
                  (a, b) =>
                    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
                )
                .map((a) => (
                  <AppointmentCard
                    key={a.id}
                    appointment={a}
                    onEdit={setEditAppointment}
                    onDelete={handleDelete}
                    onStatusChange={handleStatusChange}
                  />
                ))}
            </AnimatePresence>
          </CardContent>
        </Card>
      )}

      {/* Monthly Calendar View */}
      {viewMode === "month" && (
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                {format(currentMonth, "MMMM yyyy")}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(startOfMonth(new Date()))}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 pb-4">
            {/* Day-of-week header */}
            <div className="grid grid-cols-7 border-b border-border/40">
              {DAY_HEADERS.map((d) => (
                <div
                  key={d}
                  className="py-2 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wide"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar weeks */}
            <div className="divide-y divide-border/30">
              {calendarWeeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 divide-x divide-border/30">
                  {week.map((day) => {
                    const dayAppts = getAppointmentsForDay(day);
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const today = isToday(day);

                    return (
                      <div
                        key={day.toISOString()}
                        className={cn(
                          "min-h-[110px] p-1.5 flex flex-col gap-1",
                          !isCurrentMonth && "bg-secondary/20"
                        )}
                      >
                        {/* Date number */}
                        <button
                          type="button"
                          onClick={() => {
                            setCreateDate(day);
                            setCreateOpen(true);
                          }}
                          className={cn(
                            "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold self-start transition-colors hover:bg-secondary",
                            today
                              ? "bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90"
                              : isCurrentMonth
                              ? "text-foreground"
                              : "text-muted-foreground/40"
                          )}
                        >
                          {format(day, "d")}
                        </button>

                        {/* Appointments */}
                        <div className="flex-1 space-y-0.5 overflow-hidden">
                          {dayAppts.slice(0, 3).map((a) => {
                            const dot = TYPE_DOT_COLORS[a.type] ?? TYPE_DOT_COLORS.OTHER;
                            return (
                              <button
                                key={a.id}
                                type="button"
                                onClick={() => setEditAppointment(a)}
                                className="w-full text-left flex items-center gap-1 px-1 py-0.5 rounded text-[10px] hover:bg-secondary/60 transition-colors group"
                              >
                                <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", dot)} />
                                <span className="truncate font-medium text-foreground/80 group-hover:text-foreground">
                                  {format(new Date(a.startTime), "h:mm")} {a.title}
                                </span>
                              </button>
                            );
                          })}
                          {dayAppts.length > 3 && (
                            <p className="text-[9px] text-muted-foreground px-1">
                              +{dayAppts.length - 3} more
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="space-y-6">
          {/* Upcoming */}
          {upcomingAppointments.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Upcoming
              </h2>
              <div className="space-y-2">
                <AnimatePresence>
                  {upcomingAppointments.map((a) => (
                    <AppointmentCard
                      key={a.id}
                      appointment={a}
                      onEdit={setEditAppointment}
                      onDelete={handleDelete}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* All (past / filtered) */}
          {filtered.length === 0 && (
            <div className="text-center py-20 space-y-3">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto">
                <CalendarDays className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No appointments found</p>
              <Button variant="gold" onClick={() => setCreateOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Schedule first appointment
              </Button>
            </div>
          )}

          {filtered.length > 0 && upcomingAppointments.length === 0 && todayAppointments.length === 0 && (
            <div className="space-y-2">
              <AnimatePresence>
                {filtered
                  .sort(
                    (a, b) =>
                      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
                  )
                  .map((a) => (
                    <AppointmentCard
                      key={a.id}
                      appointment={a}
                      onEdit={setEditAppointment}
                      onDelete={handleDelete}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-[#D4AF37]" />
              New Appointment
            </DialogTitle>
          </DialogHeader>
          <AppointmentForm
            customers={customers}
            staff={staff}
            defaultDate={createDate}
            onSuccess={handleCreateSuccess}
            onCancel={() => {
              setCreateOpen(false);
              setCreateDate(undefined);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editAppointment} onOpenChange={() => setEditAppointment(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-[#D4AF37]" />
              Edit Appointment
            </DialogTitle>
          </DialogHeader>
          {editAppointment && (
            <AppointmentForm
              appointment={editAppointment}
              customers={customers}
              staff={staff}
              onSuccess={handleEditSuccess}
              onCancel={() => setEditAppointment(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
