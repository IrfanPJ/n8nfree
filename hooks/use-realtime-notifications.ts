"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { useNotificationsStore } from "@/store/notifications-store";
import type { Notification } from "@/types";

export function useRealtimeNotifications() {
  const { data: session } = useSession();
  const addNotification = useNotificationsStore((s) => s.addNotification);

  useEffect(() => {
    if (!session?.user?.id) return;

    const channel = supabaseBrowser
      .channel(`notifications:${session.user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Notification",
          filter: `userId=eq.${session.user.id}`,
        },
        (payload) => {
          const notification = payload.new as Notification;
          addNotification(notification);
        }
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, [session?.user?.id, addNotification]);
}
