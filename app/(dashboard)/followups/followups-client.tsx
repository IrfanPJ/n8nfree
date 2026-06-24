"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Phone, Clock, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight,
  Edit2, Trash2, List, Calendar,
} from "lucide-react";
import { toast } from "sonner";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameDay, isToday, isSameMonth,
  addMonths, subMonths, addWeeks, subWeeks, addDays, subDays,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deleteFollowUp, updateFollowUp } from "@/actions/followups";
import type { FollowUpWithRelations, PaginatedResult } from "@/types";
import { formatDate, PRIORITY_CONFIG } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { FollowUpForm } from "./followup-form";

interface FollowUpsClientProps {
  initialData: PaginatedResult<FollowUpWithRelations>;
}

type ViewMode = "list" | "month" | "week" | "day";

const STATUS_ICONS = {
  PENDING: Clock,
  IN_PROGRESS: AlertCircle,
  COMPLETED: CheckCircle2,
  CANCELLED: AlertCircle,
};

const STATUS_STYLES = {
  PENDING: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  IN_PROGRESS: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  COMPLETED: "text-green-400 bg-green-400/10 border-green-400/20",
  CANCELLED: "text-gray-400 bg-gray-400/10 border-gray-400/20",
};

const STATUS_DOT: Record<string, string> = {
  PENDING: "bg-yellow-400",
  IN_PROGRESS: "bg-blue-400",
  COMPLETED: "bg-green-400",
  CANCELLED: "bg-gray-400",
};

const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function FollowUpItem({
  followUp,
  onEdit,
  onDelete,
  onStatusChange,
  compact = false,
}: {
  followUp: FollowUpWithRelations;
  onEdit: (f: FollowUpWithRelations) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string, f: FollowUpWithRelations) => void;
  compact?: boolean;
}) {
  const StatusIcon = STATUS_ICONS[followUp.status];
  const priorityConfig = PRIORITY_CONFIG[followUp.priority];
  const isOverdue = followUp.dueDate && new Date(followUp.dueDate) < new Date() && followUp.status === "PENDING";

  return (
    <motion.div layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
      <Card className={cn("border group transition-all hover:shadow-md", isOverdue && "border-red-500/30 bg-red-500/5")}>
        <CardContent className={cn("p-4", compact && "p-3")}>
          <div className="flex items-start gap-3">
            <StatusIcon className={cn(
              "flex-shrink-0",
              compact ? "w-3.5 h-3.5 mt-0.5" : "w-5 h-5 mt-0.5",
              followUp.status === "COMPLETED" ? "text-green-400" :
              followUp.status === "CANCELLED" ? "text-gray-400" :
              isOverdue ? "text-red-400" : "text-yellow-400"
            )} />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className={cn("font-medium truncate", compact ? "text-xs" : "text-sm")}>{followUp.title}</p>
                  {!compact && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {followUp.customer.name} · {followUp.customer.phone}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!compact && (
                    <span className={cn("text-xs font-medium", priorityConfig.color)}>{priorityConfig.label}</span>
                  )}
                  {!compact && (
                    <Select value={followUp.status} onValueChange={(v) => onStatusChange(followUp.id, v, followUp)}>
                      <SelectTrigger className={cn("h-7 text-xs border rounded-full px-2", STATUS_STYLES[followUp.status])}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <Button variant="ghost" size="icon-sm" className="h-6 w-6" onClick={() => onEdit(followUp)}>
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => onDelete(followUp.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              {!compact && followUp.description && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{followUp.description}</p>
              )}
              {!compact && (
                <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                  {followUp.dueDate && (
                    <span className={cn(isOverdue && "text-red-400 font-medium")}>Due: {formatDate(followUp.dueDate)}</span>
                  )}
                  {followUp.staff && <span>Assigned: {followUp.staff.name}</span>}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function FollowUpsClient({ initialData }: FollowUpsClientProps) {
  const router = useRouter();
  const [data, setData] = useState(initialData);

  // Sync local state whenever the server re-fetches (e.g. router.refresh()
  // after a branch switch) — without this, switching branches would keep
  // showing whatever follow-ups were loaded on first render.
  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editFollowUp, setEditFollowUp] = useState<FollowUpWithRelations | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDay, setSelectedDay] = useState(() => new Date());

  const allFollowUps = data.data;

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const weekDays = useMemo(
    () => eachDayOfInterval({ start: currentWeekStart, end: addDays(currentWeekStart, 6) }),
    [currentWeekStart]
  );

  const getFollowUpsForDay = (day: Date) =>
    allFollowUps.filter((f) => f.dueDate && isSameDay(new Date(f.dueDate), day));

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this follow-up?")) return;
    const result = await deleteFollowUp(id);
    if (result.success) {
      toast.success("Follow-up deleted");
      setData((prev) => ({ ...prev, data: prev.data.filter((f) => f.id !== id) }));
    } else {
      toast.error(result.error);
    }
  };

  const handleStatusChange = async (id: string, status: string, original: FollowUpWithRelations) => {
    const result = await updateFollowUp(id, { ...original, status, customerId: original.customerId });
    if (result.success) {
      toast.success("Status updated");
      setData((prev) => ({
        ...prev,
        data: prev.data.map((f) => (f.id === id ? { ...f, status: status as FollowUpWithRelations["status"] } : f)),
      }));
    }
  };

  const navigate = (dir: -1 | 1) => {
    if (viewMode === "month") {
      setCurrentMonth((d) => dir === 1 ? addMonths(d, 1) : subMonths(d, 1));
    } else if (viewMode === "week") {
      setCurrentWeekStart((d) => dir === 1 ? addWeeks(d, 1) : subWeeks(d, 1));
    } else if (viewMode === "day") {
      setSelectedDay((d) => dir === 1 ? addDays(d, 1) : subDays(d, 1));
    }
  };

  const periodLabel = () => {
    if (viewMode === "month") return format(currentMonth, "MMMM yyyy");
    if (viewMode === "week") return `${format(currentWeekStart, "dd MMM")} – ${format(addDays(currentWeekStart, 6), "dd MMM yyyy")}`;
    if (viewMode === "day") return format(selectedDay, "EEEE, dd MMMM yyyy");
    return "";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Follow-ups</h1>
          <p className="text-sm text-muted-foreground">{data.total} total follow-ups</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
            {(["list", "month", "week", "day"] as ViewMode[]).map((v) => (
              <Button
                key={v}
                variant="ghost"
                size="sm"
                className={cn("h-7 px-3 text-xs capitalize", viewMode === v && "bg-background shadow-sm text-foreground")}
                onClick={() => setViewMode(v)}
              >
                {v === "list" ? <List className="w-3.5 h-3.5" /> : v === "month" ? <Calendar className="w-3.5 h-3.5" /> : null}
                <span className={v === "list" || v === "month" ? "ml-1" : ""}>{v}</span>
              </Button>
            ))}
          </div>
          <Button variant="gold" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Follow-up
          </Button>
        </div>
      </div>

      {/* Calendar navigation bar (non-list modes) */}
      {viewMode !== "list" && (
        <div className="flex items-center justify-between">
          <Button variant="outline" size="icon-sm" onClick={() => navigate(-1)}><ChevronLeft className="w-4 h-4" /></Button>
          <p className="text-sm font-medium">{periodLabel()}</p>
          <Button variant="outline" size="icon-sm" onClick={() => navigate(1)}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      )}

      {/* Month view */}
      {viewMode === "month" && (
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border bg-secondary/30">
            {DAY_HEADERS.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarDays.map((day) => {
              const dayFollowUps = getFollowUpsForDay(day);
              const inMonth = isSameMonth(day, currentMonth);
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "min-h-[90px] border-b border-r border-border p-1.5 transition-colors",
                    !inMonth && "bg-secondary/20",
                    isToday(day) && "bg-[#D4AF37]/5"
                  )}
                  onClick={() => { setSelectedDay(day); setViewMode("day"); }}
                >
                  <div className={cn(
                    "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 cursor-pointer",
                    isToday(day) ? "bg-[#D4AF37] text-black" : inMonth ? "text-foreground" : "text-muted-foreground/40"
                  )}>
                    {format(day, "d")}
                  </div>
                  <div className="space-y-0.5">
                    {dayFollowUps.slice(0, 3).map((f) => (
                      <div
                        key={f.id}
                        className={cn("flex items-center gap-1 text-[10px] px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80",
                          f.status === "COMPLETED" ? "bg-green-400/15 text-green-400" :
                          f.status === "CANCELLED" ? "bg-gray-400/15 text-gray-400" :
                          f.status === "IN_PROGRESS" ? "bg-blue-400/15 text-blue-400" :
                          "bg-yellow-400/15 text-yellow-400"
                        )}
                        onClick={(e) => { e.stopPropagation(); setEditFollowUp(f); }}
                      >
                        <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", STATUS_DOT[f.status])} />
                        <span className="truncate">{f.title}</span>
                      </div>
                    ))}
                    {dayFollowUps.length > 3 && (
                      <p className="text-[10px] text-muted-foreground pl-1">+{dayFollowUps.length - 3} more</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Week view */}
      {viewMode === "week" && (
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border bg-secondary/30">
            {weekDays.map((day) => (
              <div
                key={day.toISOString()}
                className={cn("text-center py-2 cursor-pointer hover:bg-secondary/50 transition-colors", isToday(day) && "bg-[#D4AF37]/10")}
                onClick={() => { setSelectedDay(day); setViewMode("day"); }}
              >
                <p className="text-xs text-muted-foreground">{format(day, "EEE")}</p>
                <p className={cn("text-sm font-semibold mt-0.5", isToday(day) && "text-[#D4AF37]")}>{format(day, "d")}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 divide-x divide-border min-h-[300px]">
            {weekDays.map((day) => {
              const dayFollowUps = getFollowUpsForDay(day);
              return (
                <div key={day.toISOString()} className={cn("p-2 space-y-1", isToday(day) && "bg-[#D4AF37]/5")}>
                  {dayFollowUps.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground/30 text-center mt-4">—</p>
                  ) : (
                    dayFollowUps.map((f) => (
                      <div
                        key={f.id}
                        className={cn("text-[10px] px-1.5 py-1 rounded truncate cursor-pointer hover:opacity-80",
                          f.status === "COMPLETED" ? "bg-green-400/15 text-green-400" :
                          f.status === "IN_PROGRESS" ? "bg-blue-400/15 text-blue-400" :
                          "bg-yellow-400/15 text-yellow-400"
                        )}
                        onClick={() => setEditFollowUp(f)}
                      >
                        <div className="flex items-center gap-1">
                          <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", STATUS_DOT[f.status])} />
                          <span className="truncate font-medium">{f.title}</span>
                        </div>
                        <p className="text-muted-foreground/70 truncate pl-2.5">{f.customer.name}</p>
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Day view */}
      {viewMode === "day" && (
        <div className="space-y-3">
          <div className={cn("text-center py-2 rounded-lg border border-border bg-secondary/20", isToday(selectedDay) && "border-[#D4AF37]/30 bg-[#D4AF37]/5")}>
            <p className="text-xs text-muted-foreground">{format(selectedDay, "EEEE")}</p>
            <p className="text-2xl font-bold">{format(selectedDay, "d")}</p>
            <p className="text-xs text-muted-foreground">{format(selectedDay, "MMMM yyyy")}</p>
          </div>
          {(() => {
            const dayFollowUps = getFollowUpsForDay(selectedDay);
            return dayFollowUps.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No follow-ups due this day</p>
              </div>
            ) : (
              <AnimatePresence>
                {dayFollowUps.map((f) => (
                  <FollowUpItem
                    key={f.id}
                    followUp={f}
                    onEdit={setEditFollowUp}
                    onDelete={handleDelete}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </AnimatePresence>
            );
          })()}
        </div>
      )}

      {/* List view */}
      {viewMode === "list" && (
        <>
          {allFollowUps.length === 0 ? (
            <div className="text-center py-20">
              <Phone className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">No follow-ups found</p>
              <Button variant="gold" className="mt-4" onClick={() => setCreateOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> Create Follow-up
              </Button>
            </div>
          ) : (
            <AnimatePresence>
              {allFollowUps.map((followUp) => (
                <FollowUpItem
                  key={followUp.id}
                  followUp={followUp}
                  onEdit={setEditFollowUp}
                  onDelete={handleDelete}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </AnimatePresence>
          )}

          {data.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Page {data.page} of {data.totalPages}</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon-sm" disabled={data.page <= 1}
                  onClick={() => router.push(`/followups?page=${data.page - 1}`)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon-sm" disabled={data.page >= data.totalPages}
                  onClick={() => router.push(`/followups?page=${data.page + 1}`)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Follow-up</DialogTitle></DialogHeader>
          <FollowUpForm onSuccess={() => { setCreateOpen(false); router.refresh(); }} onCancel={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editFollowUp} onOpenChange={() => setEditFollowUp(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Follow-up</DialogTitle></DialogHeader>
          {editFollowUp && (
            <FollowUpForm
              followUp={editFollowUp}
              onSuccess={() => { setEditFollowUp(null); router.refresh(); }}
              onCancel={() => setEditFollowUp(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
