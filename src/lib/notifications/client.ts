/** Fire-and-forget — never blocks the UI if email fails. */
export function notifyNewMessage(messageId: string): void {
  void fetch("/api/notifications/message", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messageId }),
  }).catch(() => {});
}

export function notifyCollabResponse(collabInviteId: string): void {
  void fetch("/api/notifications/collab-response", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ collabInviteId }),
  }).catch(() => {});
}

export async function sendTestNotificationEmail(): Promise<{
  ok: boolean;
  message?: string;
  error?: string;
}> {
  const response = await fetch("/api/notifications/test", {
    method: "POST",
    credentials: "same-origin",
  });
  return response.json();
}

export async function fetchNotificationStatus(): Promise<{
  resendKey: boolean;
  resendFrom: boolean;
  serviceRole: boolean;
  siteUrl: string;
  yourEmail: string | null;
  error?: string;
}> {
  const response = await fetch("/api/notifications/status", {
    credentials: "same-origin",
  });
  if (!response.ok) {
    return {
      resendKey: false,
      resendFrom: false,
      serviceRole: false,
      siteUrl: "",
      yourEmail: null,
      error: "Could not check notification setup.",
    };
  }
  return response.json();
}
