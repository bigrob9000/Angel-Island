import type { ReportReason, ReportTargetType } from "@/lib/types";
import { REPORT_REASONS } from "@/lib/types";

export type SubmitReportInput = {
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  reportedUserId?: string | null;
  reason: ReportReason;
  details?: string;
};

export function reportSetupError(): string {
  return "Reporting isn't set up yet. Run migration 009_user_blocks_and_reports.sql in Supabase (see supabase/RUN-PENDING-MIGRATIONS.md).";
}

export function reportReasonLabel(reason: ReportReason): string {
  return REPORT_REASONS.find((r) => r.value === reason)?.label ?? reason;
}

export async function submitReport(input: SubmitReportInput): Promise<{ error?: string }> {
  const response = await fetch("/api/reports", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      targetType: input.targetType,
      targetId: input.targetId,
      reportedUserId: input.reportedUserId ?? null,
      reason: input.reason,
      details: input.details,
    }),
  });

  const data = (await response.json().catch(() => ({}))) as { error?: string };

  if (!response.ok) {
    return { error: data.error ?? "Could not submit report." };
  }

  return {};
}
