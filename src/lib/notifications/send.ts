import { getSiteUrl } from "@/lib/site";
import { sendPushToUser } from "@/lib/push/send";
import { isPushConfigured } from "@/lib/push/vapid";
import { createAdminClient, isNotificationEmailConfigured } from "@/lib/supabase/admin";
import {
  escapeHtml,
  messagePreview,
  profileLabel,
  sendNotificationEmail,
} from "@/lib/notifications/email";

const MESSAGE_DEBOUNCE_MINUTES = 30;
const COLLAB_ACTIVITY_DEBOUNCE_MINUTES = 30;

const COLLAB_RESPONSE_LABELS: Record<string, string> = {
  interested: "Interested — let's talk",
  maybe: "Maybe — not right now",
  not_fit: "Not a fit",
};

async function getUserEmail(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user?.email) return null;
  return data.user.email;
}

async function isBlocked(userA: string, userB: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("user_blocks")
    .select("id")
    .or(
      `and(blocker_id.eq.${userA},blocked_id.eq.${userB}),and(blocker_id.eq.${userB},blocked_id.eq.${userA})`,
    )
    .limit(1);

  return (data?.length ?? 0) > 0;
}

async function recentlySent(
  userId: string,
  kind: "message" | "collab_response" | "collab_activity",
  referenceId: string,
  withinMinutes: number,
): Promise<boolean> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - withinMinutes * 60 * 1000).toISOString();
  const { data } = await admin
    .from("notification_sends")
    .select("id")
    .eq("user_id", userId)
    .eq("kind", kind)
    .eq("reference_id", referenceId)
    .gte("sent_at", since)
    .limit(1);

  return (data?.length ?? 0) > 0;
}

async function logSend(
  userId: string,
  kind: "message" | "collab_response" | "collab_activity",
  referenceId: string,
): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("notification_sends").insert({
      user_id: userId,
      kind,
      reference_id: referenceId,
    });
    if (error) {
      console.error("notification_sends insert failed:", error.message);
    }
  } catch (err) {
    console.error("notification_sends insert failed:", err);
  }
}

export async function sendMessageNotification(
  messageId: string,
  senderUserId: string,
): Promise<{ ok: boolean; skipped?: string; email?: boolean; push?: boolean }> {
  const emailConfigured = isNotificationEmailConfigured();
  const pushConfigured = isPushConfigured();
  if (!emailConfigured && !pushConfigured) {
    return { ok: false, skipped: "notifications_not_configured" };
  }

  const admin = createAdminClient();
  const { data: message } = await admin
    .from("messages")
    .select("id, invite_id, sender_id, body")
    .eq("id", messageId)
    .maybeSingle();

  if (!message || message.sender_id !== senderUserId) {
    return { ok: false, skipped: "invalid_message" };
  }

  const { data: invite } = await admin
    .from("chat_invites")
    .select("id, sender_id, receiver_id, status, conversation_status")
    .eq("id", message.invite_id)
    .maybeSingle();

  if (!invite || invite.status !== "accepted") {
    return { ok: false, skipped: "conversation_not_active" };
  }

  const conversationStatus = invite.conversation_status ?? "active";
  if (conversationStatus !== "active") {
    return { ok: false, skipped: "conversation_not_active" };
  }

  const recipientId =
    invite.sender_id === senderUserId ? invite.receiver_id : invite.sender_id;

  if (await isBlocked(senderUserId, recipientId)) {
    return { ok: false, skipped: "blocked" };
  }

  const { data: recipientProfile } = await admin
    .from("profiles")
    .select("notify_email_messages, notify_push_messages")
    .eq("id", recipientId)
    .maybeSingle();

  const wantsEmail = recipientProfile?.notify_email_messages !== false;
  const wantsPush = recipientProfile?.notify_push_messages === true;

  if (
    (!wantsEmail || !emailConfigured) &&
    (!wantsPush || !pushConfigured)
  ) {
    return { ok: false, skipped: "opted_out" };
  }

  if (await recentlySent(recipientId, "message", invite.id, MESSAGE_DEBOUNCE_MINUTES)) {
    return { ok: false, skipped: "debounced" };
  }

  const { data: senderProfile } = await admin
    .from("profiles")
    .select("first_name, username")
    .eq("id", senderUserId)
    .maybeSingle();

  const senderName = profileLabel(senderProfile ?? {});
  const preview = messagePreview(message.body);
  const siteUrl = getSiteUrl();
  const link = `${siteUrl}/messages/${invite.id}`;

  let emailSent = false;
  let pushSent = false;

  if (wantsEmail && emailConfigured) {
    const recipientEmail = await getUserEmail(recipientId);
    if (recipientEmail) {
      const subject = `${senderName} sent you a message`;
      const text = `${senderName} sent you a message on Angel Island:\n\n"${preview}"\n\nRead when you're ready: ${link}\n\nTurn off these emails in Settings on Angel Island.`;
      const html = `
        <p><strong>${escapeHtml(senderName)}</strong> sent you a message on Angel Island:</p>
        <p style="color:#5f7a6b;margin:16px 0;">"${escapeHtml(preview)}"</p>
        <p><a href="${link}">Open the conversation</a></p>
        <p style="color:#888;font-size:13px;margin-top:24px;">No rush — read when it suits you. Turn off email updates in Settings on Angel Island.</p>
      `;

      const sent = await sendNotificationEmail({ to: recipientEmail, subject, html, text });
      emailSent = sent.ok;
    }
  }

  if (wantsPush && pushConfigured) {
    const pushResult = await sendPushToUser(recipientId, {
      title: `${senderName} sent you a message`,
      body: preview,
      url: link,
    });
    pushSent = pushResult.ok;
  }

  if (!emailSent && !pushSent) {
    return { ok: false, skipped: "delivery_failed" };
  }

  await logSend(recipientId, "message", invite.id);
  return { ok: true, email: emailSent, push: pushSent };
}

export async function sendCollabResponseNotification(
  collabInviteId: string,
  responderUserId: string,
): Promise<{ ok: boolean; skipped?: string }> {
  if (!isNotificationEmailConfigured()) {
    return { ok: false, skipped: "email_not_configured" };
  }

  const admin = createAdminClient();
  const { data: collab } = await admin
    .from("collab_invites")
    .select("id, sender_id, receiver_id, about, status")
    .eq("id", collabInviteId)
    .maybeSingle();

  if (!collab || collab.receiver_id !== responderUserId) {
    return { ok: false, skipped: "invalid_collab" };
  }

  if (!["interested", "maybe", "not_fit"].includes(collab.status)) {
    return { ok: false, skipped: "not_a_response" };
  }

  const senderId = collab.sender_id;

  if (await isBlocked(senderId, responderUserId)) {
    return { ok: false, skipped: "blocked" };
  }

  const { data: senderProfile } = await admin
    .from("profiles")
    .select("notify_email_collab")
    .eq("id", senderId)
    .maybeSingle();

  if (senderProfile?.notify_email_collab === false) {
    return { ok: false, skipped: "opted_out" };
  }

  const { data: responderProfile } = await admin
    .from("profiles")
    .select("first_name, username")
    .eq("id", responderUserId)
    .maybeSingle();

  const senderEmail = await getUserEmail(senderId);
  if (!senderEmail) {
    return { ok: false, skipped: "no_email" };
  }

  const responderName = profileLabel(responderProfile ?? {});
  const responseLabel = COLLAB_RESPONSE_LABELS[collab.status] ?? collab.status;
  const siteUrl = getSiteUrl();
  const link = `${siteUrl}/messages`;

  const subject = `${responderName} responded to your collab invite`;
  const text = `${responderName} responded to your collab invite about "${collab.about}": ${responseLabel}.\n\nSee Messages on Angel Island: ${link}\n\nTurn off these emails in Settings.`;
  const html = `
    <p><strong>${escapeHtml(responderName)}</strong> responded to your collab invite about <em>${escapeHtml(collab.about)}</em>:</p>
    <p style="color:#5f7a6b;margin:16px 0;">${escapeHtml(responseLabel)}</p>
    <p><a href="${link}">Open Messages</a></p>
    <p style="color:#888;font-size:13px;margin-top:24px;">Turn off collab email updates in Settings on Angel Island.</p>
  `;

  const sent = await sendNotificationEmail({ to: senderEmail, subject, html, text });
  if (!sent.ok) {
    return { ok: false, skipped: sent.error };
  }

  await logSend(senderId, "collab_response", collab.id);
  return { ok: true };
}

function collabActivitySummary(entryType: string, body: string | null, url: string | null): string {
  if (entryType === "reference") {
    return body?.trim() || url?.trim() || "Shared a link";
  }
  if (entryType === "step") {
    return body?.trim() || "Added a next step";
  }
  return messagePreview(body ?? "");
}

export async function sendCollabActivityNotification(
  entryId: string,
  authorUserId: string,
): Promise<{ ok: boolean; skipped?: string; email?: boolean; push?: boolean }> {
  const emailConfigured = isNotificationEmailConfigured();
  const pushConfigured = isPushConfigured();
  if (!emailConfigured && !pushConfigured) {
    return { ok: false, skipped: "notifications_not_configured" };
  }

  const admin = createAdminClient();
  const { data: entry } = await admin
    .from("collaboration_entries")
    .select("id, collaboration_id, author_id, entry_type, body, url")
    .eq("id", entryId)
    .maybeSingle();

  if (!entry || entry.author_id !== authorUserId) {
    return { ok: false, skipped: "invalid_entry" };
  }

  const { data: collaboration } = await admin
    .from("collaborations")
    .select("id, collab_invite_id, status")
    .eq("id", entry.collaboration_id)
    .maybeSingle();

  if (!collaboration || collaboration.status !== "active") {
    return { ok: false, skipped: "collaboration_not_active" };
  }

  const { data: collabInvite } = await admin
    .from("collab_invites")
    .select("id, sender_id, receiver_id, about, status")
    .eq("id", collaboration.collab_invite_id)
    .maybeSingle();

  if (!collabInvite || collabInvite.status !== "interested") {
    return { ok: false, skipped: "invalid_collab" };
  }

  const recipientId =
    collabInvite.sender_id === authorUserId
      ? collabInvite.receiver_id
      : collabInvite.sender_id;

  if (await isBlocked(authorUserId, recipientId)) {
    return { ok: false, skipped: "blocked" };
  }

  const { data: recipientProfile } = await admin
    .from("profiles")
    .select("notify_email_collab, notify_push_collab")
    .eq("id", recipientId)
    .maybeSingle();

  const wantsEmail = recipientProfile?.notify_email_collab !== false;
  const wantsPush = recipientProfile?.notify_push_collab === true;

  if (
    (!wantsEmail || !emailConfigured) &&
    (!wantsPush || !pushConfigured)
  ) {
    return { ok: false, skipped: "opted_out" };
  }

  if (
    await recentlySent(
      recipientId,
      "collab_activity",
      collaboration.id,
      COLLAB_ACTIVITY_DEBOUNCE_MINUTES,
    )
  ) {
    return { ok: false, skipped: "debounced" };
  }

  const { data: authorProfile } = await admin
    .from("profiles")
    .select("first_name, username")
    .eq("id", authorUserId)
    .maybeSingle();

  const authorName = profileLabel(authorProfile ?? {});
  const summary = collabActivitySummary(entry.entry_type, entry.body, entry.url);
  const siteUrl = getSiteUrl();
  const link = `${siteUrl}/collaborations/${collaboration.id}`;

  const actionLabel =
    entry.entry_type === "reference"
      ? "shared a link in your collaboration"
      : entry.entry_type === "step"
        ? "added a next step to your collaboration"
        : "added a note to your collaboration";

  const pushTitle =
    entry.entry_type === "reference"
      ? `${authorName} shared a link`
      : entry.entry_type === "step"
        ? `${authorName} added a next step`
        : `${authorName} added a note`;

  let emailSent = false;
  let pushSent = false;

  if (wantsEmail && emailConfigured) {
    const recipientEmail = await getUserEmail(recipientId);
    if (recipientEmail) {
      const subject = `${authorName} ${actionLabel}`;
      const text = `${authorName} ${actionLabel} about "${collabInvite.about}":\n\n${summary}\n\nOpen when you're ready: ${link}\n\nTurn off these emails in Settings on Angel Island.`;
      const html = `
        <p><strong>${escapeHtml(authorName)}</strong> ${escapeHtml(actionLabel)} about <em>${escapeHtml(collabInvite.about)}</em>:</p>
        <p style="color:#5f7a6b;margin:16px 0;">${escapeHtml(summary)}</p>
        <p><a href="${link}">Open the collaboration space</a></p>
        <p style="color:#888;font-size:13px;margin-top:24px;">No rush — read when it suits you. Turn off collab email updates in Settings on Angel Island.</p>
      `;

      const sent = await sendNotificationEmail({ to: recipientEmail, subject, html, text });
      emailSent = sent.ok;
    }
  }

  if (wantsPush && pushConfigured) {
    const pushResult = await sendPushToUser(recipientId, {
      title: pushTitle,
      body: summary,
      url: link,
    });
    pushSent = pushResult.ok;
  }

  if (!emailSent && !pushSent) {
    return { ok: false, skipped: "delivery_failed" };
  }

  await logSend(recipientId, "collab_activity", collaboration.id);
  return { ok: true, email: emailSent, push: pushSent };
}
