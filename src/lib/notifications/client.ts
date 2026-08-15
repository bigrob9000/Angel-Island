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
