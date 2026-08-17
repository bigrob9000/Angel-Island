import { FEEDBACK_EMAIL } from "@/lib/site";

export function getFeedbackMailtoUrl(options?: { username?: string | null }) {
  const subject = encodeURIComponent("Angel Island beta feedback");
  const lines = [
    "What's working well:",
    "",
    "What's confusing or broken:",
    "",
    "One thing I'd change:",
    "",
  ];
  if (options?.username?.trim()) {
    lines.push(`— @${options.username.trim()}`);
  }
  const body = encodeURIComponent(lines.join("\n"));
  return `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`;
}
