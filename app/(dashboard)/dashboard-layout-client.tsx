"use client";

import React from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { useUIStore } from "@/store/ui-store";
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications";

interface DashboardLayoutClientProps {
  children: React.ReactNode;
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
  };
}

export function DashboardLayoutClient({ children, user }: DashboardLayoutClientProps) {
  const { sidebarCollapsed } = useUIStore();
  useRealtimeNotifications();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar user={user} />
      <Topbar />
      <main
        className="transition-all duration-200 pt-16"
        style={{ paddingLeft: sidebarCollapsed ? "72px" : "240px" }}
      >
        <div className="p-6 min-h-[calc(100vh-4rem)]">{children}</div>
      </main>
    </div>
  );
}
