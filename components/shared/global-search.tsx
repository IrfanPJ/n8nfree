"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, ShoppingBag, FileText, Calendar, X, UserCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { SearchResult } from "@/types";
import { debounce } from "@/lib/utils";

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

const iconMap = {
  customer: Users,
  order: ShoppingBag,
  invoice: FileText,
  appointment: Calendar,
  lead: UserCircle,
};

const typeStyles: Record<string, { badge: string; icon: string; iconBg: string; label: string }> = {
  lead:        { badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",   icon: "text-orange-600 dark:text-orange-400",  iconBg: "bg-orange-100 dark:bg-orange-900/40",  label: "Lead" },
  customer:    { badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",           icon: "text-blue-600 dark:text-blue-400",       iconBg: "bg-blue-100 dark:bg-blue-900/40",      label: "Customer" },
  order:       { badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",   icon: "text-purple-600 dark:text-purple-400",   iconBg: "bg-purple-100 dark:bg-purple-900/40",  label: "Order" },
  invoice:     { badge: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",       icon: "text-green-600 dark:text-green-400",     iconBg: "bg-green-100 dark:bg-green-900/40",    label: "Invoice" },
  appointment: { badge: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",           icon: "text-cyan-600 dark:text-cyan-400",       iconBg: "bg-cyan-100 dark:bg-cyan-900/40",      label: "Appointment" },
};

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(
    debounce(async (q: string) => {
      if (!q.trim() || q.length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(data.results ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    search(query);
  }, [query, search]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (!open) return;
      }
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.15 }}
          className="relative w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
        >
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search leads, customers, orders, invoices..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && (
              <div className="p-4 space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-8 h-8 rounded-lg" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3 w-40" />
                      <Skeleton className="h-2.5 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && results.length > 0 && (
              <ul className="p-2">
                {results.map((result) => {
                  const Icon = iconMap[result.type];
                  const style = typeStyles[result.type];
                  return (
                    <li key={`${result.type}-${result.id}`}>
                      <button
                        onClick={() => {
                          router.push(result.href);
                          onClose();
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary/50 transition-colors text-left"
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${style.iconBg}`}>
                          <Icon className={`w-4 h-4 ${style.icon}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{result.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                        </div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${style.badge}`}>
                          {style.label}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {!loading && query.length >= 2 && results.length === 0 && (
              <div className="p-8 text-center">
                <p className="text-sm text-muted-foreground">No results for &quot;{query}&quot;</p>
              </div>
            )}

            {!query && (
              <div className="p-8 text-center">
                <p className="text-sm text-muted-foreground">Type to search across all records</p>
                <p className="text-xs text-muted-foreground mt-1">Press Esc to close</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
