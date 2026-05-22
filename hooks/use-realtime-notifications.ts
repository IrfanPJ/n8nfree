"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { useNotificationsStore } from "@/store/notifications-store";
import type { Notification } from "@/types";

export function useRealtimeNotifications() {
  const { data: session } = useSession();
  const addNotification = useNotificationsStore((s) => s.addNotification);

  useEffect(() => {
    if (!session?.user?.id) return;
    const client = getSupabaseBrowser();
    if (!client) return; // anon key not configured — Realtime disabled

    const channel = client
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
          addNotification(payload.new as Notification);
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [session?.user?.id, addNotification]);
}
