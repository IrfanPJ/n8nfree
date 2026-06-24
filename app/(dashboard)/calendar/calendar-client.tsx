"use client";

import React, { useState, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCalendarEvents } from "@/actions/calendar";
import type { CalendarEvent } from "@/types";

const TYPE_LABELS: Record<string, string> = {
  appointment: "Appointment",
  trial:       "Trial",
  delivery:    "Delivery",
};

const TYPE_FILTER_OPTIONS = [
  { value: "all",         label: "All Events" },
  { value: "appointment", label: "Appointments" },
  { value: "trial",       label: "Trials" },
  { value: "delivery",    label: "Deliveries" },
];

interface CalendarClientProps {
  initialEvents: CalendarEvent[];
}

function getMonthRange(year: number, month: number) {
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 0, 23, 59, 59);
  return { from, to };
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay(); // 0=Sun
}

export function CalendarClient({ initialEvents }: CalendarClientProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);

  // Sync local state whenever the server re-fetches (e.g. router.refresh()
  // after a branch switch) — without this, switching branches would keep
  // showing whatever events were loaded on first render.
  useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents]);

  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"all" | "appointment" | "trial" | "delivery">("all");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const fetchEvents = useCallback(async (y: number, m: number) => {
    setLoading(true);
    const { from, to } = getMonthRange(y, m);
    try {
      const data = await getCalendarEvents({
        dateFrom: from.toISOString(),
        dateTo: to.toISOString(),
      });
      setEvents(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const goToPrev = () => {
    const newMonth = month === 0 ? 11 : month - 1;
    const newYear = month === 0 ? year - 1 : year;
    setMonth(newMonth);
    setYear(newYear);
    setSelectedDay(null);
    fetchEvents(newYear, newMonth);
  };

  const goToNext = () => {
    const newMonth = month === 11 ? 0 : month + 1;
    const newYear = month === 11 ? year + 1 : year;
    setMonth(newMonth);
    setYear(newYear);
    setSelectedDay(null);
    fetchEvents(newYear, newMonth);
  };

  const goToToday = () => {
    const t = new Date();
    setYear(t.getFullYear());
    setMonth(t.getMonth());
    setSelectedDay(t.getDate());
    fetchEvents(t.getFullYear(), t.getMonth());
  };

  const filteredEvents = typeFilter === "all" ? events : events.filter((e) => e.type === typeFilter);

  const getEventsForDay = (day: number) => {
    return filteredEvents.filter((e) => {
      const d = new Date(e.start);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  };

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const monthName = new Date(year, month, 1).toLocaleString("default", { month: "long" });

  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Calendar</h1>
          <p className="text-sm text-muted-foreground">All appointments, trials and deliveries</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>Today</Button>
          <Button variant="ghost" size="icon" onClick={goToPrev}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-sm font-semibold min-w-[120px] text-center">{monthName} {year}</span>
          <Button variant="ghost" size="icon" onClick={goToNext}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>

      {/* Type filter */}
      <div className="flex gap-1 p-1 rounded-lg bg-secondary/40 w-fit">
        {TYPE_FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setTypeFilter(opt.value as typeof typeFilter)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              typeFilter === opt.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Monthly grid */}
        <div className={`${selectedDay ? "lg:col-span-2" : "lg:col-span-3"} rounded-xl border border-border bg-card overflow-hidden`}>
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-border">
            {DAYS.map((d) => (
              <div key={d} className="py-2 text-center text-[11px] font-semibold text-muted-foreground">{d}</div>
            ))}
          </div>
          {/* Calendar grid */}
          <div className={`grid grid-cols-7 ${loading ? "opacity-50 pointer-events-none" : ""}`}>
            {/* Leading empty cells */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-border/50 bg-secondary/5" />
            ))}
            {/* Day cells */}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const dayEvents = getEventsForDay(day);
              const isToday = now.getFullYear() === year && now.getMonth() === month && now.getDate() === day;
              const isSelected = selectedDay === day;
              return (
                <div
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`min-h-[80px] border-b border-r border-border/50 p-1.5 cursor-pointer transition-colors ${
                    isSelected ? "bg-primary/10" : "hover:bg-secondary/30"
                  }`}
                >
                  <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
                    isToday ? "bg-[#D4AF37] text-black font-bold" : isSelected ? "text-primary" : "text-foreground"
                  }`}>{day}</span>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <div
                        key={ev.id}
                        className="text-[10px] px-1.5 py-0.5 rounded truncate font-medium"
                        style={{ backgroundColor: ev.color + "25", color: ev.color }}
                        title={ev.title}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-muted-foreground px-1">+{dayEvents.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Day detail panel */}
        {selectedDay && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#D4AF37]" />
              <h3 className="text-sm font-semibold">
                {monthName} {selectedDay}, {year}
              </h3>
            </div>
            {selectedDayEvents.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No events on this day</p>
            ) : (
              <div className="space-y-2">
                {selectedDayEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3 rounded-lg border border-border"
                    style={{ borderLeftColor: ev.color, borderLeftWidth: 3 }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-tight">{ev.title}</p>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0"
                        style={{ backgroundColor: ev.color + "20", color: ev.color }}
                      >
                        {TYPE_LABELS[ev.type]}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {new Date(ev.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {ev.end && ` – ${new Date(ev.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                      </span>
                    </div>
                    {ev.orderId && (
                      <a href={`/orders/${ev.orderId}`} className="text-xs text-[#D4AF37] hover:underline mt-1 block">
                        View Order →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-violet-400/60" />Appointments</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-400/60" />Trials</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-400/60" />Deliveries</div>
      </div>
    </div>
  );
}
