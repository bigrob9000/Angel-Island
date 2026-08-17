"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { FeedbackCard } from "@/components/FeedbackCard";
import { InviteMusiciansCard } from "@/components/InviteMusiciansCard";
import { IphonePwaHint } from "@/components/IphonePwaHint";
import { SettingsToggle } from "@/components/SettingsToggle";
import { usePreferences } from "@/components/PreferencesProvider";
import { fetchNotificationStatus, sendTestNotificationEmail } from "@/lib/notifications/client";
import {
  fetchPushStatus,
  isBrowserPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push/client";
import { loadBlockedUsers, unblockUser } from "@/lib/blocks";
import type { BlockedUser } from "@/lib/blocks";

export default function SettingsPage() {
  const { preferences, setPreference } = usePreferences();
  const [email, setEmail] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountMessage, setAccountMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [accountSaving, setAccountSaving] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [blocksLoading, setBlocksLoading] = useState(true);
  const [blocksTableMissing, setBlocksTableMissing] = useState(false);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const [blocksMessage, setBlocksMessage] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [notifyMessages, setNotifyMessages] = useState(true);
  const [notifyCollab, setNotifyCollab] = useState(true);
  const [notifyPush, setNotifyPush] = useState(false);
  const [notifyPushCollab, setNotifyPushCollab] = useState(false);
  const [pushSaving, setPushSaving] = useState(false);
  const [pushCollabSaving, setPushCollabSaving] = useState(false);
  const [pushMessage, setPushMessage] = useState<string | null>(null);
  const [pushStatus, setPushStatus] = useState<{
    supported: boolean;
    configured: boolean;
    publicKey: string | null;
    permission: NotificationPermission | "unsupported";
    platform: "ios" | "android" | "desktop" | "unknown";
    isStandalone: boolean;
    mobileHint: string | null;
  } | null>(null);
  const [notifySaving, setNotifySaving] = useState<string | null>(null);
  const [notifyMessage, setNotifyMessage] = useState<string | null>(null);
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [notifyStatus, setNotifyStatus] = useState<{
    resendKey: boolean;
    resendFrom: boolean;
    serviceRole: boolean;
    siteUrl: string;
    yourEmail: string | null;
  } | null>(null);

  useEffect(() => {
    fetchNotificationStatus().then(setNotifyStatus);
    fetchPushStatus().then(setPushStatus);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? null);
      setUserId(user?.id ?? null);
      if (!user) {
        setBlocksLoading(false);
        return;
      }
      supabase
        .from("profiles")
        .select("notify_email_messages, notify_email_collab, notify_push_messages, notify_push_collab")
        .eq("id", user.id)
        .maybeSingle()
        .then(({ data, error }) => {
          if (!error && data) {
            setNotifyMessages(data.notify_email_messages ?? true);
            setNotifyCollab(data.notify_email_collab ?? true);
            setNotifyPush(data.notify_push_messages ?? false);
            setNotifyPushCollab(data.notify_push_collab ?? false);
          }
        });
      loadBlockedUsers(user.id).then((result) => {
        setBlockedUsers(result.blocks);
        setBlocksTableMissing(result.tableMissing);
        setBlocksLoading(false);
      });
    });
  }, []);

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setAccountMessage(null);

    if (newPassword.length < 6) {
      setAccountMessage({ type: "error", text: "Password must be at least 6 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setAccountMessage({ type: "error", text: "Passwords do not match." });
      return;
    }

    setAccountSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setAccountSaving(false);

    if (error) {
      setAccountMessage({ type: "error", text: error.message });
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    setAccountMessage({ type: "ok", text: "Password updated." });
  }

  async function handleUnblock(blockedId: string) {
    if (!userId) return;
    setUnblockingId(blockedId);
    setBlocksMessage(null);
    const result = await unblockUser(userId, blockedId);
    setUnblockingId(null);
    if (result.error) {
      setBlocksMessage(result.error);
      return;
    }
    setBlockedUsers((prev) => prev.filter((b) => b.blocked_id !== blockedId));
  }

  async function updateNotifyPref(
    field: "notify_email_messages" | "notify_email_collab",
    checked: boolean,
  ) {
    if (!userId) return;
    setNotifyMessage(null);
    setNotifySaving(field);
    if (field === "notify_email_messages") setNotifyMessages(checked);
    else setNotifyCollab(checked);

    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ [field]: checked, updated_at: new Date().toISOString() })
      .eq("id", userId);

    setNotifySaving(null);
    if (error) {
      setNotifyMessage(
        error.message.includes("notify_email")
          ? "Email settings aren't set up yet. Run migration 017_email_notifications.sql in Supabase."
          : error.message,
      );
      if (field === "notify_email_messages") setNotifyMessages(!checked);
      else setNotifyCollab(!checked);
    }
  }

  async function enableBrowserPush(): Promise<boolean> {
    const status = pushStatus ?? (await fetchPushStatus());
    if (!status.supported) {
      setPushMessage("This browser doesn't support push notifications.");
      return false;
    }
    if (!status.configured || !status.publicKey) {
      setPushMessage("Push isn't set up on the server yet. Add VAPID keys in Vercel and redeploy.");
      return false;
    }

    const subscribeResult = await subscribeToPush(status.publicKey);
    if (!subscribeResult.ok) {
      setPushMessage(subscribeResult.error ?? "Could not enable browser notifications.");
      return false;
    }

    return true;
  }

  async function handlePushToggle(checked: boolean) {
    if (!userId) return;
    setPushMessage(null);
    setPushSaving(true);
    setNotifyPush(checked);

    if (checked) {
      const enabled = await enableBrowserPush();
      if (!enabled) {
        setNotifyPush(false);
        setPushSaving(false);
        return;
      }
    } else if (!notifyPushCollab) {
      await unsubscribeFromPush();
    }

    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ notify_push_messages: checked, updated_at: new Date().toISOString() })
      .eq("id", userId);

    setPushSaving(false);
    if (error) {
      setPushMessage(
        error.message.includes("notify_push")
          ? "Browser notification settings aren't set up yet. Run migration 018_browser_push.sql in Supabase."
          : error.message,
      );
      setNotifyPush(!checked);
    }
  }

  async function handlePushCollabToggle(checked: boolean) {
    if (!userId) return;
    setPushMessage(null);
    setPushCollabSaving(true);
    setNotifyPushCollab(checked);

    if (checked) {
      const enabled = await enableBrowserPush();
      if (!enabled) {
        setNotifyPushCollab(false);
        setPushCollabSaving(false);
        return;
      }
    } else if (!notifyPush) {
      await unsubscribeFromPush();
    }

    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ notify_push_collab: checked, updated_at: new Date().toISOString() })
      .eq("id", userId);

    setPushCollabSaving(false);
    if (error) {
      setPushMessage(
        error.message.includes("notify_push_collab")
          ? "Collab push settings aren't set up yet. Run migration 021_notify_push_collab.sql in Supabase."
          : error.message,
      );
      setNotifyPushCollab(!checked);
    }
  }

  async function handleTestEmail() {
    setTestEmailResult(null);
    setTestEmailLoading(true);
    const result = await sendTestNotificationEmail();
    setTestEmailLoading(false);
    if (result.ok) {
      setTestEmailResult({ type: "ok", text: result.message ?? "Test email sent." });
    } else {
      setTestEmailResult({
        type: "error",
        text: result.error ?? "Could not send test email.",
      });
    }
  }

  return (
    <div className="space-y-8">
      <Link href="/profile" className="text-sm text-muted hover:text-foreground">
        ← Profile
      </Link>
      <div>
        <h1 className="font-serif text-2xl font-medium text-foreground">Settings</h1>
        <p className="mt-2 text-sm text-muted">Adjust the space to feel right for you.</p>
      </div>

      <section className="rounded-lg border border-foreground/10 bg-white/50 p-5 space-y-5">
        <div>
          <h2 className="font-medium text-foreground">Account</h2>
          <p className="mt-1 text-sm text-muted">Your sign-in details.</p>
        </div>

        <div>
          <p className="text-sm text-muted">Email</p>
          <p className="mt-1 text-foreground">{email ?? "—"}</p>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-4 border-t border-foreground/10 pt-5">
          <p className="text-sm font-medium text-foreground">Change password</p>
          <label className="block">
            <span className="text-sm text-muted">New password</span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              className="mt-1 block w-full rounded-md border border-foreground/20 bg-white px-3 py-2 text-foreground focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20"
            />
          </label>
          <label className="block">
            <span className="text-sm text-muted">Confirm new password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              className="mt-1 block w-full rounded-md border border-foreground/20 bg-white px-3 py-2 text-foreground focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20"
            />
          </label>
          {accountMessage && (
            <p
              className={`text-sm ${accountMessage.type === "ok" ? "text-accent" : "text-foreground"}`}
              role="status"
            >
              {accountMessage.text}
            </p>
          )}
          <button
            type="submit"
            disabled={accountSaving || !newPassword}
            className="rounded-md border border-foreground/30 px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5 disabled:opacity-50"
          >
            {accountSaving ? "Saving…" : "Update password"}
          </button>
        </form>
      </section>

      <InviteMusiciansCard />

      <section className="rounded-lg border border-foreground/10 bg-white/50 p-5 space-y-6">
        <div>
          <h2 className="font-medium text-foreground">Calm Mode</h2>
          <p className="mt-1 text-sm text-muted">
            Softer colors, less motion, and a little more breathing room.
          </p>
        </div>

        <SettingsToggle
          id="calm-mode"
          label="Calm Mode"
          description="Reduced contrast, softer palette, no drifting clouds, and slightly larger text."
          checked={preferences.calmMode}
          onChange={(checked) => setPreference("calmMode", checked)}
        />

        {preferences.calmMode && (
          <SettingsToggle
            id="easier-reading"
            label="Easier reading font"
            description="Use a simpler sans-serif font that's easier to scan."
            checked={preferences.easierReadingFont}
            onChange={(checked) => setPreference("easierReadingFont", checked)}
          />
        )}
      </section>

      <section className="rounded-lg border border-foreground/10 bg-white/50 p-5 space-y-6">
        <div>
          <h2 className="font-medium text-foreground">Email updates</h2>
          <p className="mt-1 text-sm text-muted">
            Gentle emails when someone reaches out — no nudges, no guilt. Turn off anytime.
          </p>
          {notifyStatus && (
            <ul className="mt-3 space-y-1 text-xs text-muted">
              <li>{notifyStatus.resendKey ? "✓" : "✗"} Resend API key (Vercel)</li>
              <li>{notifyStatus.resendFrom ? "✓" : "✗"} Sender address (RESEND_FROM)</li>
              <li>{notifyStatus.serviceRole ? "✓" : "✗"} Supabase service role key</li>
            </ul>
          )}
          {notifyStatus &&
            (!notifyStatus.resendKey || !notifyStatus.resendFrom || !notifyStatus.serviceRole) && (
              <p className="mt-2 text-sm text-red-600">
                Email can&apos;t send until all three checks above are ✓. Add missing vars in Vercel →
                redeploy.
              </p>
            )}
        </div>

        <SettingsToggle
          id="notify-messages"
          label="New messages"
          description="Email when someone sends you a message (at most once every 30 minutes per conversation)."
          checked={notifyMessages}
          disabled={notifySaving === "notify_email_messages"}
          onChange={(checked) => updateNotifyPref("notify_email_messages", checked)}
        />

        <SettingsToggle
          id="notify-collab"
          label="Collab updates"
          description="Email when someone responds to a collab invite or adds something to a shared workspace (at most once every 30 minutes per collaboration)."
          checked={notifyCollab}
          disabled={notifySaving === "notify_email_collab"}
          onChange={(checked) => updateNotifyPref("notify_email_collab", checked)}
        />

        {notifyMessage && (
          <p className="text-sm text-red-600" role="alert">
            {notifyMessage}
          </p>
        )}

        <div className="border-t border-foreground/10 pt-5">
          <button
            type="button"
            onClick={handleTestEmail}
            disabled={testEmailLoading}
            className="rounded-md border border-foreground/30 px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5 disabled:opacity-50"
          >
            {testEmailLoading ? "Sending…" : "Send test email to me"}
          </button>
          <p className="mt-2 text-xs text-muted">
            Uses your account email ({email ?? "—"}). With Resend testing, only verified addresses receive mail until your domain is set up.
          </p>
          {testEmailResult && (
            <p
              className={`mt-2 text-sm ${testEmailResult.type === "ok" ? "text-accent" : "text-red-600"}`}
              role="status"
            >
              {testEmailResult.text}
            </p>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-foreground/10 bg-white/50 p-5 space-y-6">
        <div>
          <h2 className="font-medium text-foreground">Browser notifications</h2>
          <p className="mt-1 text-sm text-muted">
            Optional alerts for messages and collab workspace activity — even if Angel Island isn&apos;t
            open. Off by default.
          </p>
          {pushStatus && (
            <ul className="mt-3 space-y-1 text-xs text-muted">
              <li>{pushStatus.supported ? "✓" : "✗"} Browser supports push</li>
              <li>{pushStatus.configured ? "✓" : "✗"} VAPID keys (Vercel)</li>
              <li>
                {pushStatus.permission === "granted"
                  ? "✓"
                  : pushStatus.permission === "denied"
                    ? "✗"
                    : "—"}{" "}
                Notification permission
                {pushStatus.permission === "denied" ? " (blocked in browser settings)" : ""}
              </li>
            </ul>
          )}
          {pushStatus &&
            pushStatus.supported &&
            pushStatus.configured &&
            pushStatus.permission === "denied" && (
              <p className="mt-2 text-sm text-red-600">
                Notifications are blocked for this site. Allow them in your browser&apos;s site settings, then try again.
              </p>
            )}
          {pushStatus && !pushStatus.supported && pushStatus.mobileHint && (
            <p className="mt-2 text-sm text-muted">{pushStatus.mobileHint}</p>
          )}
        </div>

        {pushStatus?.platform === "ios" && !pushStatus.isStandalone && (
          <IphonePwaHint respectDismiss={false} />
        )}

        <SettingsToggle
          id="notify-push"
          label="New messages"
          description="Browser alert when someone sends you a message (at most once every 30 minutes per conversation)."
          checked={notifyPush}
          disabled={
            pushSaving ||
            !isBrowserPushSupported() ||
            pushStatus?.permission === "denied" ||
            !pushStatus?.configured
          }
          onChange={handlePushToggle}
        />

        <SettingsToggle
          id="notify-push-collab"
          label="Collab workspace activity"
          description="Browser alert when someone adds a note, link, or next step to a shared collaboration (at most once every 30 minutes per collaboration)."
          checked={notifyPushCollab}
          disabled={
            pushCollabSaving ||
            !isBrowserPushSupported() ||
            pushStatus?.permission === "denied" ||
            !pushStatus?.configured
          }
          onChange={handlePushCollabToggle}
        />

        {pushMessage && (
          <p className="text-sm text-red-600" role="alert">
            {pushMessage}
          </p>
        )}
      </section>

      <section className="rounded-lg border border-foreground/10 bg-white/50 p-5 space-y-5">
        <div>
          <h2 className="font-medium text-foreground">Blocked people</h2>
          <p className="mt-1 text-sm text-muted">
            People you&apos;ve blocked won&apos;t appear in search or Explore, and you can&apos;t
            message each other.
          </p>
        </div>

        {blocksLoading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : blocksTableMissing ? (
          <p className="text-sm text-muted">
            Blocking isn&apos;t set up yet. Run migration{" "}
            <code className="text-xs">009_user_blocks_and_reports.sql</code> in Supabase.
          </p>
        ) : blockedUsers.length === 0 ? (
          <p className="text-sm text-muted">You haven&apos;t blocked anyone.</p>
        ) : (
          <ul className="space-y-3">
            {blockedUsers.map((block) => {
              const name =
                block.profile?.first_name ?? block.profile?.username ?? "Someone";
              const username = block.profile?.username;
              return (
                <li
                  key={block.id}
                  className="flex flex-wrap items-center justify-between gap-3 text-sm"
                >
                  <div>
                    <p className="text-foreground">{name}</p>
                    {username && (
                      <Link
                        href={`/people/${username}`}
                        className="text-xs text-muted hover:text-foreground"
                      >
                        @{username}
                      </Link>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUnblock(block.blocked_id)}
                    disabled={unblockingId === block.blocked_id}
                    className="rounded-md border border-foreground/30 px-3 py-1.5 text-sm text-muted hover:text-foreground disabled:opacity-50"
                  >
                    {unblockingId === block.blocked_id ? "Unblocking…" : "Unblock"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {blocksMessage && (
          <p className="text-sm text-red-600" role="alert">
            {blocksMessage}
          </p>
        )}
      </section>

      <FeedbackCard />

      <section className="rounded-lg border border-foreground/10 bg-white/50 p-5">
        <SettingsToggle
          id="reduce-motion"
          label="Reduce motion"
          description="Turn off gentle transitions and hover animations, even when Calm Mode is off."
          checked={preferences.reduceMotion}
          onChange={(checked) => setPreference("reduceMotion", checked)}
        />
      </section>
    </div>
  );
}
