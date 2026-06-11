"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameDay, isToday, isSameMonth,
  addMonths, subMonths, format,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCalendarEvents } from "@/actions/calendar";
import type { CalendarEvent } from "@/types";
import { cn } from "@/lib/utils";

const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface OrdersCalendarProps {
  onOrderClick?: (orderId: string) => void;
}

export function OrdersCalendar({ onOrderClick }: OrdersCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEvents = useCallback(async (month: Date) => {
    setLoading(true);
    try {
      const dateFrom = format(startOfMonth(month), "yyyy-MM-dd");
      const dateTo   = format(endOfMonth(month),   "yyyy-MM-dd");
      const result = await getCalendarEvents({ dateFrom, dateTo, types: ["trial", "delivery"] });
      setEvents(result);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvents(currentMonth); }, [currentMonth, fetchEvents]);

  const calendarDays = useMemo(() => {
    const calStart = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const calEnd   = endOfWeek(endOfMonth(currentMonth),     { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const calendarWeeks = useMemo(() => {
    const weeks: Date[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7)
      weeks.push(calendarDays.slice(i, i + 7));
    return weeks;
  }, [calendarDays]);

  const getEventsForDay = (day: Date) =>
    events.filter((e) => isSameDay(new Date(e.start), day));

  // Count per type for legend
  const trialCount    = events.filter((e) => e.type === "trial").length;
  const deliveryCount = events.filter((e) => e.type === "delivery").length;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold">{format(currentMonth, "MMMM yyyy")}</h2>
          {loading && <span className="text-xs text-muted-foreground animate-pulse">Loading…</span>}
        </div>
        <div className="flex items-center gap-3">
          {/* Legend */}
          <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              Trials ({trialCount})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              Deliveries ({deliveryCount})
            </span>
          </div>
          {/* Nav */}
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon-sm" className="h-7 w-7" onClick={() => setCurrentMonth((m) => subMonths(m, 1))}>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => setCurrentMonth(startOfMonth(new Date()))}>
              Today
            </Button>
            <Button variant="outline" size="icon-sm" className="h-7 w-7" onClick={() => setCurrentMonth((m) => addMonths(m, 1))}>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="rounded-xl border border-border overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border bg-secondary/30">
          {DAY_HEADERS.map((d) => (
            <div key={d} className="py-2 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              {d}
            </div>
          ))}
        </div>

        {/* Weeks */}
        <div className="divide-y divide-border/40">
          {calendarWeeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 divide-x divide-border/40">
              {week.map((day) => {
                const dayEvents = getEventsForDay(day);
                const inMonth   = isSameMonth(day, currentMonth);
                const today     = isToday(day);

                return (
                  <div
                    key={day.toISOString()}
                    className={cn("min-h-[90px] p-1.5 flex flex-col gap-0.5", !inMonth && "bg-secondary/20")}
                  >
                    {/* Date number */}
                    <span
                      className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold self-start mb-0.5",
                        today
                          ? "bg-[#D4AF37] text-black"
                          : inMonth
                          ? "text-foreground"
                          : "text-muted-foreground/30"
                      )}
                    >
                      {format(day, "d")}
                    </span>

                    {/* Events */}
                    {dayEvents.slice(0, 3).map((ev) => (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => ev.orderId && onOrderClick?.(ev.orderId)}
                        className={cn(
                          "w-full text-left flex items-center gap-1 px-1 py-0.5 rounded text-[10px] font-medium truncate transition-colors",
                          ev.type === "trial"
                            ? "bg-amber-400/15 text-amber-300 hover:bg-amber-400/25"
                            : "bg-emerald-400/15 text-emerald-300 hover:bg-emerald-400/25"
                        )}
                        title={ev.title}
                      >
                        <span
                          className={cn(
                            "w-1.5 h-1.5 rounded-full flex-shrink-0",
                            ev.type === "trial" ? "bg-amber-400" : "bg-emerald-400"
                          )}
                        />
                        <span className="truncate">{ev.title.replace(/^(Trial|Delivery):\s*/, "")}</span>
                      </button>
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[9px] text-muted-foreground pl-1">+{dayEvents.length - 3} more</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile legend */}
      <div className="flex sm:hidden items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
          Trials ({trialCount})
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
          Deliveries ({deliveryCount})
        </span>
      </div>
    </div>
  );
}
