"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Users, ShoppingBag, Calendar, FileText,
  Bell, Settings, LogOut, ChevronLeft, ChevronRight,
  Scissors, Package, MessageSquare, BarChart3, Phone,
  Target, Layers, ShoppingCart, X, ScanLine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui-store";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { getInitials } from "@/lib/utils";
import { signOut } from "next-auth/react";

const navItems = [
  { href: "/pos", label: "Sales / POS", icon: ShoppingCart },
  { href: "/scan", label: "QR Scanner", icon: ScanLine },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/appointments", label: "Appointments", icon: Calendar },
  { href: "/orders", label: "Orders", icon: ShoppingBag },
  { href: "/customers", label: "Client Book", icon: Users },
  { href: "/fabrics", label: "Fabrics", icon: Layers },
  { href: "/leads", label: "Leads", icon: Target },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/followups", label: "Follow-ups", icon: Phone },
  { href: "/purchases", label: "Purchases", icon: Package },
  { href: "/finance", label: "Finance", icon: BarChart3 },
  { href: "/measurements", label: "Measurements", icon: Scissors },
  { href: "/ai-assistant", label: "AI Assistant", icon: MessageSquare },
  { href: "/notifications", label: "Notifications", icon: Bell },
];

const bottomItems = [
  { href: "/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
    pagePermissions?: string[] | null;
  };
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ user, mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { sidebarCollapsed, setSidebarCollapsed } = useUIStore();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isLg, setIsLg] = useState(true);
  const prevPathname = useRef(pathname);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    setIsLg(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsLg(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (pathname !== prevPathname.current) {
      prevPathname.current = pathname;
      onMobileClose?.();
    }
  }, [pathname, onMobileClose]);

  const isLight = mounted && resolvedTheme === "light";
  const markLogoSrc = isLight ? "/HT_Black.png" : "/HT_White.png";
  const showLabels = isLg ? !sidebarCollapsed : true;

  return (
    <TooltipProvider delayDuration={0}>
      {/* Mobile backdrop */}
      {!isLg && mobileOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-30 bg-black/60"
          onClick={onMobileClose}
        />
      )}

      <motion.aside
        initial={false}
        animate={
          !isLg
            ? { x: mobileOpen ? 0 : -240, width: 240 }
            : { x: 0, width: sidebarCollapsed ? 72 : 240 }
        }
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="fixed left-0 top-0 h-full z-40 flex flex-col border-r border-border bg-card overflow-hidden"
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-border relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={markLogoSrc}
            alt="House of Tailors"
            className="object-contain w-full h-10"
          />
          {!isLg && (
            <button
              onClick={onMobileClose}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-4 overflow-y-auto scrollbar-hide">
          <ul className="space-y-1 px-2">
            {navItems.filter((item) => {
              if (user?.role === "ADMIN") return true;
              if (!user?.pagePermissions) return true;
              const key = item.href.slice(1); // "/orders" → "orders"
              return user.pagePermissions.includes(key);
            }).map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              if (!showLabels) {
                return (
                  <li key={item.href}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link
                          href={item.href}
                          className={cn(
                            "flex items-center justify-center h-10 w-10 rounded-lg mx-auto transition-all duration-200",
                            isActive
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                          )}
                        >
                          <Icon className="w-5 h-5" />
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  </li>
                );
              }

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 h-10 px-3 rounded-lg transition-all duration-200 group",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm font-medium truncate">{item.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom section */}
        <div className="border-t border-border">
          <ul className="py-2 px-2">
            {bottomItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              if (!showLabels) {
                return (
                  <li key={item.href}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link
                          href={item.href}
                          className={cn(
                            "flex items-center justify-center h-10 w-10 rounded-lg mx-auto transition-all",
                            isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                          )}
                        >
                          <Icon className="w-5 h-5" />
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  </li>
                );
              }

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 h-10 px-3 rounded-lg transition-all",
                      isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* User section */}
          <div className="px-2 pb-4">
            {!showLabels ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="flex items-center justify-center h-10 w-10 rounded-lg mx-auto text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Sign out</TooltipContent>
              </Tooltip>
            ) : (
              <div className="flex items-center gap-2 p-2 rounded-lg border border-border bg-secondary/30">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.image ?? undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary text-xs">
                    {getInitials(user?.name ?? user?.email ?? "U")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{user?.name ?? "User"}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{user?.role?.toLowerCase()}</p>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Collapse toggle - desktop only */}
        {isLg && (
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all z-10"
          >
            {sidebarCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
          </button>
        )}
      </motion.aside>
    </TooltipProvider>
  );
}
