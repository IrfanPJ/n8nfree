"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { useNotificationsStore } from "@/store/notifications-store";
import type { Notification } from "@/types";

export function useRealtimeNotifications() {
  const { data: session } = useSession();
  // Use a ref so the effect doesn't re-run when the store function identity changes
  const addNotificationRef = useRef(useNotificationsStore.getState().addNotification);

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
          addNotificationRef.current(payload.new as Notification);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      client.removeChannel(channel);
    };
  }, [session?.user?.id]);
}
