type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export async function sendNotificationEmail(input: SendEmailInput): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();

  if (!apiKey || !from) {
    return { ok: false, error: "Email is not configured." };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    return { ok: false, error: body || `Resend error ${response.status}` };
  }

  return { ok: true };
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function profileLabel(profile: {
  first_name?: string | null;
  username?: string | null;
}): string {
  const name = profile.first_name?.trim();
  if (name) return name;
  if (profile.username?.trim()) return `@${profile.username.trim()}`;
  return "Someone on Angel Island";
}

export function messagePreview(body: string, max = 140): string {
  const trimmed = body.trim().replace(/\s+/g, " ");
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}
