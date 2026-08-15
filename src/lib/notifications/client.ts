/** Fire-and-forget — never blocks the UI if email fails. */
export function notifyNewMessage(messageId: string): void {
  void fetch("/api/notifications/message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messageId }),
  }).catch(() => {});
}

export function notifyCollabResponse(collabInviteId: string): void {
  void fetch("/api/notifications/collab-response", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ collabInviteId }),
  }).catch(() => {});
}
