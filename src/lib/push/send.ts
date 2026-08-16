import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getVapidPrivateKey,
  getVapidPublicKey,
  getVapidSubject,
  isPushConfigured,
} from "@/lib/push/vapid";

export type PushPayload = {
  title: string;
  body: string;
  url: string;
};

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

function configureWebPush(): void {
  webpush.setVapidDetails(getVapidSubject(), getVapidPublicKey()!, getVapidPrivateKey());
}

export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<{ ok: boolean; sent: number; skipped?: string }> {
  if (!isPushConfigured()) {
    return { ok: false, sent: 0, skipped: "push_not_configured" };
  }

  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (error) {
    return { ok: false, sent: 0, skipped: "subscription_lookup_failed" };
  }

  const subscriptions = (rows ?? []) as PushSubscriptionRow[];
  if (subscriptions.length === 0) {
    return { ok: false, sent: 0, skipped: "no_subscriptions" };
  }

  configureWebPush();
  const body = JSON.stringify(payload);
  let sent = 0;
  const expiredIds: string[] = [];

  await Promise.all(
    subscriptions.map(async (row) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          },
          body,
        );
        sent += 1;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          expiredIds.push(row.id);
        }
      }
    }),
  );

  if (expiredIds.length > 0) {
    await admin.from("push_subscriptions").delete().in("id", expiredIds);
  }

  return sent > 0 ? { ok: true, sent } : { ok: false, sent: 0, skipped: "push_delivery_failed" };
}
