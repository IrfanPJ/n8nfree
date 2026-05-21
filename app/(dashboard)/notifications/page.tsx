"use client";

import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { Bell, CheckCheck, Info, ShoppingBag, Calendar, DollarSign, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useNotificationsStore } from "@/store/notifications-store";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const TYPE_ICONS = {
  ORDER_STATUS: ShoppingBag,
  APPOINTMENT: Calendar,
  PAYMENT: DollarSign,
  FOLLOWUP: Phone,
  SYSTEM: Info,
  DELIVERY: ShoppingBag,
};

const TYPE_STYLES = {
  ORDER_STATUS: "bg-blue-500/10 text-blue-400",
  APPOINTMENT: "bg-purple-500/10 text-purple-400",
  PAYMENT: "bg-green-500/10 text-green-400",
  FOLLOWUP: "bg-yellow-500/10 text-yellow-400",
  SYSTEM: "bg-gray-500/10 text-gray-400",
  DELIVERY: "bg-orange-500/10 text-orange-400",
};

export default function NotificationsPage() {
  const { notifications, markAsRead, markAllAsRead, setNotifications } = useNotificationsStore();

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => setNotifications(d.notifications ?? []))
      .catch(() => {});
  }, [setNotifications]);

  const handleMarkAllRead = async () => {
    await fetch("/api/notifications", { method: "PATCH", body: JSON.stringify({ id: "all" }), headers: { "Content-Type": "application/json" } });
    markAllAsRead();
    toast.success("All notifications marked as read");
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : "All caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            <CheckCheck className="w-4 h-4 mr-2" />
            Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-24">
          <Bell className="w-14 h-14 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">No notifications yet</p>
          <p className="text-xs text-muted-foreground mt-1">You&apos;ll see alerts for orders, payments, and appointments here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif, i) => {
            const Icon = TYPE_ICONS[notif.type];
            const iconStyle = TYPE_STYLES[notif.type];

            return (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card
                  className={cn(
                    "cursor-pointer transition-all hover:border-primary/20",
                    !notif.isRead && "border-primary/10 bg-primary/5"
                  )}
                  onClick={() => {
                    if (!notif.isRead) {
                      fetch("/api/notifications", { method: "PATCH", body: JSON.stringify({ id: notif.id }), headers: { "Content-Type": "application/json" } });
                      markAsRead(notif.id);
                    }
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0", iconStyle)}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn("text-sm font-medium", !notif.isRead && "text-foreground")}>{notif.title}</p>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {!notif.isRead && <div className="w-2 h-2 rounded-full bg-primary" />}
                            <span className="text-[10px] text-muted-foreground">{formatRelativeTime(notif.createdAt)}</span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">{notif.message}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
