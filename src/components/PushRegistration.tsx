"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { ensurePushSubscription, fetchPushStatus } from "@/lib/push/client";

/** Keeps push subscription in sync when the user has opted in. */
export function PushRegistration() {
  useEffect(() => {
    let cancelled = false;

    async function sync() {
      const status = await fetchPushStatus();
      if (cancelled || !status.supported || !status.configured || !status.publicKey) return;
      if (status.permission !== "granted") return;

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("notify_push_messages, notify_push_collab")
        .eq("id", user.id)
        .maybeSingle();

      if (
        profile?.notify_push_messages === true ||
        profile?.notify_push_collab === true
      ) {
        await ensurePushSubscription(status.publicKey);
      }
    }

    void sync();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
