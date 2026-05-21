"use client";

import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: number;
  trendLabel?: string;
  isCurrency?: boolean;
  variant?: "default" | "gold" | "success" | "warning" | "danger";
  delay?: number;
}

const variantStyles = {
  default: "border-border",
  gold: "border-[#D4AF37]/20 bg-[#D4AF37]/5",
  success: "border-green-500/20 bg-green-500/5",
  warning: "border-yellow-500/20 bg-yellow-500/5",
  danger: "border-red-500/20 bg-red-500/5",
};

const iconStyles = {
  default: "bg-primary/10 text-primary",
  gold: "bg-[#D4AF37]/15 text-[#D4AF37]",
  success: "bg-green-500/15 text-green-400",
  warning: "bg-yellow-500/15 text-yellow-400",
  danger: "bg-red-500/15 text-red-400",
};

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendLabel,
  isCurrency,
  variant = "default",
  delay = 0,
}: StatCardProps) {
  const displayValue = isCurrency
    ? formatCurrency(Number(value))
    : typeof value === "number"
    ? value.toLocaleString("en-AE")
    : value;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn(
        "relative overflow-hidden rounded-xl border p-5 bg-card",
        variantStyles[variant]
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
            {title}
          </p>
          <p className="text-2xl font-bold text-foreground mt-1">{displayValue}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", iconStyles[variant])}>
          {icon}
        </div>
      </div>

      {typeof trend !== "undefined" && (
        <div className="flex items-center gap-1 mt-3">
          {trend > 0 ? (
            <TrendingUp className="w-3 h-3 text-green-400" />
          ) : trend < 0 ? (
            <TrendingDown className="w-3 h-3 text-red-400" />
          ) : (
            <Minus className="w-3 h-3 text-muted-foreground" />
          )}
          <span
            className={cn(
              "text-xs font-medium",
              trend > 0 ? "text-green-400" : trend < 0 ? "text-red-400" : "text-muted-foreground"
            )}
          >
            {trend > 0 ? "+" : ""}{trend}%
          </span>
          {trendLabel && (
            <span className="text-xs text-muted-foreground">{trendLabel}</span>
          )}
        </div>
      )}

      {/* Decorative gradient */}
      <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full opacity-10"
        style={{
          background: variant === "gold" ? "#D4AF37" :
            variant === "success" ? "#22c55e" :
            variant === "warning" ? "#eab308" :
            variant === "danger" ? "#ef4444" : "#D4AF37"
        }}
      />
    </motion.div>
  );
}
