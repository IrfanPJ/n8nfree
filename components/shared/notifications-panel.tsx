"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useNotificationsStore } from "@/store/notifications-store";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface NotificationsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationsPanel({ open, onClose }: NotificationsPanelProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotificationsStore();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.15 }}
            className="fixed right-4 top-20 z-50 w-80 bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">Notifications</span>
                {unreadCount > 0 && (
                  <Badge variant="gold" className="text-xs px-1.5 py-0">
                    {unreadCount}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <Button variant="ghost" size="icon-sm" onClick={markAllAsRead} title="Mark all read">
                    <CheckCheck className="w-3.5 h-3.5" />
                  </Button>
                )}
                <Button variant="ghost" size="icon-sm" onClick={onClose}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            <ScrollArea className="h-80">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 gap-2">
                  <Bell className="w-8 h-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No notifications</p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {notifications.map((notif) => (
                    <li key={notif.id}>
                      <button
                        onClick={() => markAsRead(notif.id)}
                        className={cn(
                          "w-full text-left p-4 hover:bg-secondary/30 transition-colors",
                          !notif.isRead && "bg-primary/5"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          {!notif.isRead && (
                            <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                          )}
                          <div className={cn("flex-1", notif.isRead && "pl-5")}>
                            <p className="text-sm font-medium leading-tight">{notif.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{notif.message}</p>
                            <p className="text-[10px] text-muted-foreground/70 mt-1">
                              {formatRelativeTime(notif.createdAt)}
                            </p>
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
