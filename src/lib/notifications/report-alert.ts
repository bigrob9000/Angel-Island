import { getReportAlertEmail, getSiteUrl, SITE_NAME } from "@/lib/site";
import { escapeHtml, sendNotificationEmail } from "@/lib/notifications/email";
import type { ReportTargetType } from "@/lib/types";

type ReportAlertInput = {
  reportId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  details: string | null;
  reporterLabel: string;
  reportedUserLabel: string | null;
};

export async function sendReportAlertEmail(
  input: ReportAlertInput,
): Promise<{ ok: boolean; error?: string }> {
  const to = getReportAlertEmail();
  const siteUrl = getSiteUrl();
  const subject = `[${SITE_NAME}] New report: ${input.reason}`;

  const lines = [
    `A new report was submitted on ${SITE_NAME}.`,
    "",
    `Reason: ${input.reason}`,
    `Target type: ${input.targetType}`,
    `Target id: ${input.targetId}`,
    `Report id: ${input.reportId}`,
    `Reporter: ${input.reporterLabel}`,
    input.reportedUserLabel ? `Reported member: ${input.reportedUserLabel}` : null,
    input.details ? `Details: ${input.details}` : null,
    "",
    "Review in Supabase → Table Editor → reports (status: pending).",
    siteUrl,
  ].filter(Boolean);

  const text = lines.join("\n");
  const html = [
    `<p>A new report was submitted on <strong>${escapeHtml(SITE_NAME)}</strong>.</p>`,
    "<ul>",
    `<li><strong>Reason:</strong> ${escapeHtml(input.reason)}</li>`,
    `<li><strong>Target type:</strong> ${escapeHtml(input.targetType)}</li>`,
    `<li><strong>Target id:</strong> ${escapeHtml(input.targetId)}</li>`,
    `<li><strong>Report id:</strong> ${escapeHtml(input.reportId)}</li>`,
    `<li><strong>Reporter:</strong> ${escapeHtml(input.reporterLabel)}</li>`,
    input.reportedUserLabel
      ? `<li><strong>Reported member:</strong> ${escapeHtml(input.reportedUserLabel)}</li>`
      : "",
    input.details ? `<li><strong>Details:</strong> ${escapeHtml(input.details)}</li>` : "",
    "</ul>",
    "<p>Review in Supabase → <code>reports</code> (status: pending).</p>",
  ]
    .filter(Boolean)
    .join("");

  return sendNotificationEmail({ to, subject, html, text });
}
