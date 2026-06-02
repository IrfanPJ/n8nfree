"use client";

import React, { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format, isToday, isYesterday } from "date-fns";
import {
  Search, Filter, Download, User, RefreshCw,
  ShoppingBag, Users, FileText, Scissors, Calendar,
  Target, Package, Phone, ScanLine, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { getInitials, cn } from "@/lib/utils";
import type { ActivityLogEntry } from "@/actions/activity";
import type { PaginatedResult } from "@/types";

const ENTITY_ICONS: Record<string, React.ElementType> = {
  Order: ShoppingBag,
  Customer: Users,
  Invoice: FileText,
  Measurement: Scissors,
  Appointment: Calendar,
  Lead: Target,
  Purchase: Package,
  FollowUp: Phone,
  Scan: ScanLine,
};

const ACTION_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  CREATE:        { label: "Created",      color: "text-green-400",  bg: "bg-green-400/10" },
  UPDATE:        { label: "Updated",      color: "text-blue-400",   bg: "bg-blue-400/10" },
  DELETE:        { label: "Deleted",      color: "text-red-400",    bg: "bg-red-400/10" },
  STATUS_UPDATE: { label: "Status",       color: "text-yellow-400", bg: "bg-yellow-400/10" },
  PAYMENT:       { label: "Payment",      color: "text-emerald-400",bg: "bg-emerald-400/10" },
  LOGIN:         { label: "Login",        color: "text-purple-400", bg: "bg-purple-400/10" },
  SCAN:          { label: "Scan",         color: "text-cyan-400",   bg: "bg-cyan-400/10" },
};

const ENTITIES = ["Order", "Customer", "Invoice", "Measurement", "Appointment", "Lead", "Purchase", "FollowUp"];
const ACTIONS  = ["CREATE", "UPDATE", "DELETE", "STATUS_UPDATE", "PAYMENT", "SCAN"];

function ActionBadge({ action }: { action: string }) {
  const cfg = ACTION_CONFIG[action] ?? { label: action, color: "text-muted-foreground", bg: "bg-secondary/60" };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold", cfg.color, cfg.bg)}>
      {cfg.label}
    </span>
  );
}

function EntityIcon({ entity }: { entity: string }) {
  const Icon = ENTITY_ICONS[entity] ?? Package;
  return <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />;
}

function timeLabel(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return `Today ${format(d, "HH:mm")}`;
  if (isYesterday(d)) return `Yesterday ${format(d, "HH:mm")}`;
  return format(d, "dd MMM yyyy, HH:mm");
}

function groupByDate(logs: ActivityLogEntry[]) {
  const groups: { label: string; entries: ActivityLogEntry[] }[] = [];
  let currentLabel = "";
  for (const entry of logs) {
    const d = new Date(entry.createdAt);
    const label = isToday(d) ? "Today" : isYesterday(d) ? "Yesterday" : format(d, "dd MMMM yyyy");
    if (label !== currentLabel) {
      currentLabel = label;
      groups.push({ label, entries: [] });
    }
    groups[groups.length - 1].entries.push(entry);
  }
  return groups;
}

interface ActivityClientProps {
  initialData: PaginatedResult<ActivityLogEntry>;
  users: { id: string; name: string | null; email: string }[];
  currentUserId: string;
  currentRole: string;
}

export function ActivityClient({ initialData, users, currentUserId, currentRole }: ActivityClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  const push = useCallback((updates: Record<string, string>) => {
    const p = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v) p.set(k, v); else p.delete(k);
    }
    p.set("page", "1");
    router.push(`/activity?${p.toString()}`);
  }, [router, searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    push({ search });
  };

  const groups = groupByDate(initialData.data);

  const exportCSV = () => {
    const headers = ["Time", "User", "Action", "Entity", "Description"];
    const rows = initialData.data.map((e) => [
      format(new Date(e.createdAt), "dd/MM/yyyy HH:mm"),
      e.user?.name ?? e.user?.email ?? "System",
      e.action,
      e.entity,
      e.description,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity-log-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeUserId = searchParams.get("userId") ?? "";
  const activeEntity = searchParams.get("entity") ?? "";
  const activeAction = searchParams.get("action") ?? "";
  const activeDateFrom = searchParams.get("dateFrom") ?? "";
  const activeDateTo = searchParams.get("dateTo") ?? "";
  const hasFilters = !!(activeUserId || activeEntity || activeAction || activeDateFrom || activeDateTo || searchParams.get("search"));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Activity Log</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {initialData.total.toLocaleString()} total records · every action by every user
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasFilters && (
            <Button variant="outline" size="sm" onClick={() => router.push("/activity")}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Clear filters
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-border/40">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[200px]">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  className="pl-9 h-9 text-sm"
                  placeholder="Search descriptions…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button type="submit" size="sm" variant="outline">Search</Button>
            </form>

            {/* User filter */}
            <Select value={activeUserId || "all"} onValueChange={(v) => push({ userId: v === "all" ? "" : v })}>
              <SelectTrigger className="w-44 h-9 text-sm">
                <User className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                <SelectValue placeholder="All users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                {currentRole === "ADMIN" && (
                  <SelectItem value={currentUserId}>My activity</SelectItem>
                )}
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name ?? u.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Entity filter */}
            <Select value={activeEntity || "all"} onValueChange={(v) => push({ entity: v === "all" ? "" : v })}>
              <SelectTrigger className="w-36 h-9 text-sm">
                <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                <SelectValue placeholder="All modules" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All modules</SelectItem>
                {ENTITIES.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Action filter */}
            <Select value={activeAction || "all"} onValueChange={(v) => push({ action: v === "all" ? "" : v })}>
              <SelectTrigger className="w-36 h-9 text-sm">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {ACTIONS.map((a) => (
                  <SelectItem key={a} value={a}>{ACTION_CONFIG[a]?.label ?? a}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date range */}
            <div className="flex items-center gap-1.5">
              <Input
                type="date"
                className="h-9 text-sm w-36"
                value={activeDateFrom}
                onChange={(e) => push({ dateFrom: e.target.value })}
              />
              <span className="text-xs text-muted-foreground">–</span>
              <Input
                type="date"
                className="h-9 text-sm w-36"
                value={activeDateTo}
                onChange={(e) => push({ dateTo: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Log entries grouped by date */}
      {groups.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground text-sm">No activity found</div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.label} className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">
                {group.label}
              </p>
              <div className="rounded-xl border border-border/40 overflow-hidden divide-y divide-border/30">
                {group.entries.map((entry) => {
                  const userName = entry.user?.name ?? entry.user?.email ?? "System";
                  const initials = getInitials(userName);
                  return (
                    <div key={entry.id} className="flex items-start gap-3 px-4 py-3 hover:bg-secondary/20 transition-colors">
                      {/* Avatar */}
                      <Avatar className="h-7 w-7 flex-shrink-0 mt-0.5">
                        <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{userName}</span>
                          <ActionBadge action={entry.action} />
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <EntityIcon entity={entry.entity} />
                            <span>{entry.entity}</span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground leading-snug">{entry.description}</p>
                        {entry.customer && (
                          <p className="text-xs text-muted-foreground/60">
                            Customer: {entry.customer.name}
                          </p>
                        )}
                      </div>

                      {/* Time */}
                      <span className="text-xs text-muted-foreground flex-shrink-0 mt-1">
                        {timeLabel(entry.createdAt)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {initialData.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Page {initialData.page} of {initialData.totalPages} · {initialData.total.toLocaleString()} entries
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={initialData.page <= 1}
              onClick={() => push({ page: String(initialData.page - 1) })}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={initialData.page >= initialData.totalPages}
              onClick={() => push({ page: String(initialData.page + 1) })}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
