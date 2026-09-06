"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase";
import { FeedbackCard } from "@/components/FeedbackCard";
import { InviteMusiciansCard } from "@/components/InviteMusiciansCard";
import { LanguagePicker } from "@/components/LanguagePicker";
import { SignOutButton } from "@/components/SignOutButton";
import { IphonePwaHint } from "@/components/IphonePwaHint";
import { SettingsToggle } from "@/components/SettingsToggle";
import { usePreferences } from "@/components/PreferencesProvider";
import { sendTestNotificationEmail } from "@/lib/notifications/client";
import {
  fetchPushStatus,
  isBrowserPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push/client";
import { loadBlockedUsers, unblockUser } from "@/lib/blocks";
import type { BlockedUser } from "@/lib/blocks";
import { userHasEmailPassword, userHasGoogle } from "@/lib/auth-providers";
import {
  emailChangeErrorMessage,
  getAuthConfirmRedirectUrl,
  isValidEmailAddress,
} from "@/lib/auth-account";

export default function SettingsPage() {
  const { preferences, setPreference } = usePreferences();
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const [email, setEmail] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [emailChangePassword, setEmailChangePassword] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMessage, setEmailMessage] = useState<{ type: "ok" | "error"; text: string } | null>(
    null
  );
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
  const [hasPassword, setHasPassword] = useState(false);
  const [hasGoogle, setHasGoogle] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
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

  useEffect(() => {
    fetchPushStatus().then(setPushStatus);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? null);
      setPendingEmail(user?.new_email ?? null);
      setUserId(user?.id ?? null);
      setHasPassword(user ? userHasEmailPassword(user) : false);
      setHasGoogle(user ? userHasGoogle(user) : false);
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("email_updated") !== "1") return;

    setEmailMessage({ type: "ok", text: t("emailUpdated") });
    window.history.replaceState({}, "", "/settings");

    const supabase = createClient();
    void supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? null);
      setPendingEmail(user?.new_email ?? null);
    });
  }, []);

  async function handleEmailChange(e: React.FormEvent) {
    e.preventDefault();
    setEmailMessage(null);

    const trimmed = newEmail.trim();
    if (!trimmed) {
      setEmailMessage({ type: "error", text: t("errors.enterNewEmail") });
      return;
    }
    if (!isValidEmailAddress(trimmed)) {
      setEmailMessage({ type: "error", text: t("errors.invalidEmail") });
      return;
    }
    if (email && trimmed.toLowerCase() === email.toLowerCase()) {
      setEmailMessage({ type: "error", text: t("errors.sameEmail") });
      return;
    }
    if (!emailChangePassword) {
      setEmailMessage({ type: "error", text: t("errors.confirmPasswordForEmail") });
      return;
    }

    setEmailSaving(true);
    const supabase = createClient();

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email!,
      password: emailChangePassword,
    });
    if (signInError) {
      setEmailSaving(false);
      setEmailMessage({ type: "error", text: t("errors.incorrectPassword") });
      return;
    }

    const { data, error } = await supabase.auth.updateUser(
      { email: trimmed },
      { emailRedirectTo: getAuthConfirmRedirectUrl() }
    );

    setEmailSaving(false);

    if (error) {
      setEmailMessage({ type: "error", text: emailChangeErrorMessage(error.message) });
      return;
    }

    setNewEmail("");
    setEmailChangePassword("");
    setPendingEmail(data.user?.new_email ?? trimmed);
    setEmailMessage({
      type: "ok",
      text: t("emailConfirmationSent"),
    });
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setAccountMessage(null);

    if (newPassword.length < 6) {
      setAccountMessage({ type: "error", text: t("errors.passwordTooShort") });
      return;
    }
    if (newPassword !== confirmPassword) {
      setAccountMessage({ type: "error", text: t("errors.passwordsMismatch") });
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
    setAccountMessage({ type: "ok", text: t("passwordUpdated") });
  }

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault();
    setDeleteMessage(null);

    if (deleteConfirmation.trim().toUpperCase() !== "DELETE") {
      setDeleteMessage({ type: "error", text: t("errors.typeDelete") });
      return;
    }

    setDeleteSaving(true);
    const response = await fetch("/api/account/delete", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmation: deleteConfirmation.trim() }),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    setDeleteSaving(false);

    if (!response.ok) {
      setDeleteMessage({ type: "error", text: data.error ?? t("errors.deleteFailed") });
      return;
    }

    window.location.href = "/";
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
          ? t("errors.emailNotificationsNotSetup")
          : error.message,
      );
      if (field === "notify_email_messages") setNotifyMessages(!checked);
      else setNotifyCollab(!checked);
    }
  }

  async function enableBrowserPush(): Promise<boolean> {
    const status = pushStatus ?? (await fetchPushStatus());
    if (!status.supported) {
      setPushMessage(t("errors.pushNotSupported"));
      return false;
    }
    if (!status.configured || !status.publicKey) {
      setPushMessage(t("errors.pushNotConfigured"));
      return false;
    }

    const subscribeResult = await subscribeToPush(status.publicKey);
    if (!subscribeResult.ok) {
      setPushMessage(subscribeResult.error ?? t("errors.pushEnableFailed"));
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
          ? t("errors.pushSettingsNotSetup")
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
          ? t("errors.pushCollabNotSetup")
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
      setTestEmailResult({ type: "ok", text: result.message ?? t("testEmailSent") });
    } else {
      setTestEmailResult({
        type: "error",
        text: result.error ?? t("errors.testEmailFailed"),
      });
    }
  }

  return (
    <div className="space-y-8">
      <Link href="/profile" className="text-sm text-muted hover:text-foreground">
        {tc("backToProfile")}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-medium text-foreground">{t("title")}</h1>
          <p className="mt-2 text-sm text-muted">{t("subtitle")}</p>
        </div>
        <SignOutButton />
      </div>

      <section className="surface p-5 space-y-5">
        <div>
          <h2 className="font-medium text-foreground">{t("languageTitle")}</h2>
          <p className="mt-1 text-sm text-muted">{t("languageSubtitle")}</p>
        </div>
        <LanguagePicker />
      </section>

      <section className="surface p-5 space-y-5">
        <div>
          <h2 className="font-medium text-foreground">{t("accountTitle")}</h2>
          <p className="mt-1 text-sm text-muted">{t("accountSubtitle")}</p>
        </div>

        <div>
          <p className="text-sm text-muted">{tc("email")}</p>
          <p className="mt-1 text-foreground">{email ?? "—"}</p>
          {pendingEmail && pendingEmail !== email && (
            <p className="mt-2 text-sm text-muted">
              {t("pendingEmailConfirmation")}{" "}
              <span className="text-foreground">{pendingEmail}</span>
            </p>
          )}
        </div>

        {hasPassword ? (
          <form onSubmit={handleEmailChange} className="space-y-4 border-t border-foreground/10 pt-5">
            <p className="text-sm font-medium text-foreground">{t("changeEmailTitle")}</p>
            <p className="text-sm text-muted">{t("changeEmailCopy")}</p>
            <label className="block">
              <span className="text-sm text-muted">{t("newEmailLabel")}</span>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                autoComplete="email"
                className="mt-1 block w-full rounded-md border border-foreground/20 bg-white px-3 py-2 text-foreground focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20"
              />
            </label>
            <label className="block">
              <span className="text-sm text-muted">{t("currentPasswordLabel")}</span>
              <input
                type="password"
                value={emailChangePassword}
                onChange={(e) => setEmailChangePassword(e.target.value)}
                autoComplete="current-password"
                className="mt-1 block w-full rounded-md border border-foreground/20 bg-white px-3 py-2 text-foreground focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20"
              />
            </label>
            {emailMessage && (
              <p
                className={`text-sm ${emailMessage.type === "ok" ? "text-accent" : "text-red-600"}`}
                role="status"
              >
                {emailMessage.text}
              </p>
            )}
            <button
              type="submit"
              disabled={emailSaving || !newEmail.trim() || !emailChangePassword}
              className="btn-secondary disabled:opacity-50"
            >
              {emailSaving ? tc("sending") : t("updateEmail")}
            </button>
          </form>
        ) : hasGoogle ? (
          <p className="border-t border-foreground/10 pt-5 text-sm text-muted">
            {t("googleAccountCopy")}
          </p>
        ) : null}

        {hasPassword ? (
        <form onSubmit={handlePasswordChange} className="space-y-4 border-t border-foreground/10 pt-5">
          <p className="text-sm font-medium text-foreground">{t("changePasswordTitle")}</p>
          <label className="block">
            <span className="text-sm text-muted">{t("newPasswordLabel")}</span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              className="mt-1 block w-full rounded-md border border-foreground/20 bg-white px-3 py-2 text-foreground focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20"
            />
          </label>
          <label className="block">
            <span className="text-sm text-muted">{t("confirmPasswordLabel")}</span>
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
            {accountSaving ? tc("saving") : t("updatePassword")}
          </button>
        </form>
        ) : null}

        <form onSubmit={handleDeleteAccount} className="space-y-4 border-t border-foreground/10 pt-5">
          <p className="text-sm font-medium text-foreground">{t("deleteAccountTitle")}</p>
          <p className="text-sm text-muted">{t("deleteAccountCopy")}</p>
          <label className="block">
            <span className="text-sm text-muted">{t("deleteConfirmLabel")}</span>
            <input
              type="text"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              autoComplete="off"
              className="mt-1 block w-full rounded-md border border-foreground/20 bg-white px-3 py-2 text-foreground focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20"
            />
          </label>
          {deleteMessage && (
            <p
              className={`text-sm ${deleteMessage.type === "ok" ? "text-accent" : "text-red-600"}`}
              role="status"
            >
              {deleteMessage.text}
            </p>
          )}
          <button
            type="submit"
            disabled={deleteSaving || deleteConfirmation.trim().toUpperCase() !== "DELETE"}
            className="rounded-md border border-red-600/40 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            {deleteSaving ? t("deleting") : t("deleteAccountButton")}
          </button>
        </form>
      </section>

      <InviteMusiciansCard />

      <section className="surface p-5 space-y-6">
        <div>
          <h2 className="font-medium text-foreground">{t("calmModeTitle")}</h2>
          <p className="mt-1 text-sm text-muted">{t("calmModeSubtitle")}</p>
        </div>

        <SettingsToggle
          id="calm-mode"
          label={t("calmModeLabel")}
          description={t("calmModeDescription")}
          checked={preferences.calmMode}
          onChange={(checked) => setPreference("calmMode", checked)}
        />

        {preferences.calmMode && (
          <SettingsToggle
            id="easier-reading"
            label={t("easierReadingLabel")}
            description={t("easierReadingDescription")}
            checked={preferences.easierReadingFont}
            onChange={(checked) => setPreference("easierReadingFont", checked)}
          />
        )}
      </section>

      <section className="surface p-5 space-y-6">
        <div>
          <h2 className="font-medium text-foreground">{t("emailUpdatesTitle")}</h2>
          <p className="mt-1 text-sm text-muted">{t("emailUpdatesCopy")}</p>
        </div>

        <SettingsToggle
          id="notify-messages"
          label={t("notifyMessagesLabel")}
          description={t("notifyMessagesDescription")}
          checked={notifyMessages}
          disabled={notifySaving === "notify_email_messages"}
          onChange={(checked) => updateNotifyPref("notify_email_messages", checked)}
        />

        <SettingsToggle
          id="notify-collab"
          label={t("notifyCollabLabel")}
          description={t("notifyCollabDescription")}
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
            {testEmailLoading ? tc("sending") : t("sendTestEmail")}
          </button>
          <p className="mt-2 text-xs text-muted">
            {t("testEmailHint", { email: email ?? "—" })}
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

      <section className="surface p-5 space-y-6">
        <div>
          <h2 className="font-medium text-foreground">{t("browserNotificationsTitle")}</h2>
          <p className="mt-1 text-sm text-muted">{t("browserNotificationsCopy")}</p>
          {pushStatus &&
            pushStatus.supported &&
            pushStatus.configured &&
            pushStatus.permission === "denied" && (
              <p className="mt-2 text-sm text-red-600">{t("notificationsBlocked")}</p>
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
          label={t("pushMessagesLabel")}
          description={t("pushMessagesDescription")}
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
          label={t("pushCollabLabel")}
          description={t("pushCollabDescription")}
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

      <section className="surface p-5 space-y-5">
        <div>
          <h2 className="font-medium text-foreground">{t("blockedPeopleTitle")}</h2>
          <p className="mt-1 text-sm text-muted">{t("blockedPeopleCopy")}</p>
        </div>

        {blocksLoading ? (
          <p className="text-sm text-muted">{tc("loading")}</p>
        ) : blocksTableMissing ? (
          <p className="text-sm text-muted">{t("blockingNotSetup")}</p>
        ) : blockedUsers.length === 0 ? (
          <p className="text-sm text-muted">{t("noBlockedUsers")}</p>
        ) : (
          <ul className="space-y-3">
            {blockedUsers.map((block) => {
              const name =
                block.profile?.first_name ?? block.profile?.username ?? tc("someone");
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
                    {unblockingId === block.blocked_id ? tc("unblocking") : tc("unblock")}
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

      <section className="surface p-5">
        <SettingsToggle
          id="reduce-motion"
          label={t("reduceMotionLabel")}
          description={t("reduceMotionDescription")}
          checked={preferences.reduceMotion}
          onChange={(checked) => setPreference("reduceMotion", checked)}
        />
      </section>
    </div>
  );
}
