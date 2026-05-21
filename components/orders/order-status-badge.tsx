import React from "react";
import { cn } from "@/lib/utils";
import { ORDER_STATUS_CONFIG } from "@/lib/utils";
import type { OrderStatus } from "@/types";

interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const STATUS_ICONS: Record<OrderStatus, string> = {
  PENDING: "⏳",
  MEASURING: "📏",
  CUTTING: "✂️",
  STITCHING: "🧵",
  TRIAL: "👔",
  READY: "✅",
  DELIVERED: "📦",
  CANCELLED: "✕",
};

export function OrderStatusBadge({
  status,
  className,
  size = "md",
}: OrderStatusBadgeProps) {
  const config = ORDER_STATUS_CONFIG[status];

  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5 gap-0.5",
    md: "text-xs px-2 py-0.5 gap-1",
    lg: "text-sm px-2.5 py-1 gap-1.5",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        config.color,
        config.bg,
        config.border,
        sizeClasses[size],
        className
      )}
    >
      <span className="leading-none" aria-hidden="true">
        {STATUS_ICONS[status]}
      </span>
      {config.label}
    </span>
  );
}

interface PriorityBadgeProps {
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  className?: string;
}

const PRIORITY_STYLES: Record<string, string> = {
  LOW: "text-gray-400 bg-gray-400/10 border-gray-400/20",
  NORMAL: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  HIGH: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  URGENT: "text-red-400 bg-red-400/10 border-red-400/20",
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
  URGENT: "Urgent",
};

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border text-[10px] font-semibold px-1.5 py-0.5",
        PRIORITY_STYLES[priority],
        className
      )}
    >
      {priority === "URGENT" && (
        <span className="mr-0.5" aria-hidden="true">!</span>
      )}
      {PRIORITY_LABELS[priority]}
    </span>
  );
}
