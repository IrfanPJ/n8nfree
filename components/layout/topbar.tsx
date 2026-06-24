"use client";

import React, { useState, useEffect } from "react";
import { Bell, Search, Moon, Sun, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/ui-store";
import { useTheme } from "next-themes";
import { GlobalSearch } from "@/components/shared/global-search";
import { NotificationsPanel } from "@/components/shared/notifications-panel";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { BranchSelector } from "@/components/shared/branch-selector";
import { cn } from "@/lib/utils";

interface TopbarProps {
  title?: string;
  subtitle?: string;
  onMobileMenuToggle?: () => void;
  userRole?: string;
  branches?: { id: string; name: string }[];
  activeBranchId?: string;
}

export function Topbar({ title, subtitle, onMobileMenuToggle, userRole, branches, activeBranchId }: TopbarProps) {
  const { setSidebarCollapsed, sidebarCollapsed } = useUIStore();
  const { resolvedTheme, setTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <>
      <header
        className={cn(
          "fixed top-0 right-0 left-0 h-16 z-30 border-b border-border bg-background/95 backdrop-blur-sm flex items-center justify-between px-4 gap-4",
          sidebarCollapsed ? "lg:pl-[88px]" : "lg:pl-[256px]"
        )}
      >
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onMobileMenuToggle}
            className="lg:hidden text-muted-foreground hover:text-foreground"
          >
            <Menu className="h-5 w-5" />
          </Button>
          {title && (
            <div>
              <h1 className="text-sm font-semibold text-foreground">{title}</h1>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-2">

          {branches && branches.length > 0 && (
            <BranchSelector branches={branches} activeBranchId={activeBranchId} role={userRole ?? "STAFF"} />
          )}

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSearchOpen(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Search className="h-4 w-4" />
          </Button>

          <div className="hidden sm:block">
            <LanguageToggle />
          </div>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => mounted && setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="text-muted-foreground hover:text-foreground"
          >
            {mounted && resolvedTheme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setNotifOpen(true)}
            className="text-muted-foreground hover:text-foreground relative"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
          </Button>
        </div>
      </header>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <NotificationsPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
    </>
  );
}
