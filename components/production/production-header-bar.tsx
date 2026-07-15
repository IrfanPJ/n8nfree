"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const REFRESH_INTERVAL_MS = 45_000; // within the requested 30-60s window

function formatClock(d: Date): string {
  return d.toLocaleTimeString("en-AE", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Sits at the top of every /production/* page. Dark mode toggle is
 * deliberately not duplicated here — the main app Topbar directly above
 * already exposes one at all times.
 */
export function ProductionHeaderBar({ initialSearch = "" }: { initialSearch?: string }) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setLastUpdated(new Date());
    setNow(new Date());
  }, []);

  const refresh = useCallback(() => {
    router.refresh();
    setLastUpdated(new Date());
  }, [router]);

  useEffect(() => {
    const id = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      router.push(`/production/orders?search=${encodeURIComponent(search)}`);
    }
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 justify-between pb-4 border-b border-border mb-6">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Search invoice, store, item..."
          className="pl-9 h-9"
        />
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <button
          onClick={refresh}
          className="flex items-center gap-1.5 hover:text-foreground transition-colors"
          title="Refresh now"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          {lastUpdated ? `Updated ${formatClock(lastUpdated)}` : "Live"}
        </button>
        <span className="hidden sm:inline">
          {now ? now.toLocaleDateString("en-AE", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : ""}
        </span>
      </div>
    </div>
  );
}
