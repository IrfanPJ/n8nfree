"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { useUIStore } from "@/store/ui-store";
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, ShoppingBag, Users, Calendar, ShoppingCart,
} from "lucide-react";

const BOTTOM_NAV = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/orders", label: "Orders", icon: ShoppingBag },
  { href: "/customers", label: "Clients", icon: Users },
  { href: "/appointments", label: "Calendar", icon: Calendar },
  { href: "/pos", label: "Sales", icon: ShoppingCart },
];

interface DashboardLayoutClientProps {
  children: React.ReactNode;
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
  };
  pagePermissions?: string[] | null;
  branches?: { id: string; name: string }[];
  activeBranchId?: string;
  productionBadges?: { tailors: number; calendarUpcoming: number } | null;
}

function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 h-16 bg-card border-t border-border lg:hidden flex items-center">
      {BOTTOM_NAV.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 h-full transition-colors",
              isActive ? "text-[#D4AF37]" : "text-muted-foreground"
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardLayoutClient({ children, user, pagePermissions, branches, activeBranchId, productionBadges }: DashboardLayoutClientProps) {
  const { sidebarCollapsed } = useUIStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useRealtimeNotifications();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        user={{ ...user, pagePermissions }}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
        productionBadges={productionBadges}
      />
      <Topbar
        onMobileMenuToggle={() => setMobileMenuOpen((v) => !v)}
        userRole={user.role}
        branches={branches}
        activeBranchId={activeBranchId}
      />
      <main
        className={cn(
          "transition-all duration-200 pt-16 pb-16 lg:pb-0",
          sidebarCollapsed ? "lg:pl-[72px]" : "lg:pl-[240px]"
        )}
      >
        <div className="p-4 lg:p-6 min-h-[calc(100vh-4rem)]">{children}</div>
      </main>
      <MobileBottomNav />
    </div>
  );
}
