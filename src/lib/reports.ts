import { createClient } from "@/lib/supabase";
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

function isReportsTableMissing(message: string, code?: string): boolean {
  return message.includes("reports") || message.includes("user_blocks") || code === "PGRST205";
}

export function reportSetupError(): string {
  return "Reporting isn't set up yet. Run migration 009_user_blocks_and_reports.sql in Supabase (see supabase/RUN-PENDING-MIGRATIONS.md).";
}

export function reportReasonLabel(reason: ReportReason): string {
  return REPORT_REASONS.find((r) => r.value === reason)?.label ?? reason;
}

export async function submitReport(input: SubmitReportInput): Promise<{ error?: string }> {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "You're signed out. Refresh the page and sign in again." };
  }

  const reasonLabel = reportReasonLabel(input.reason);
  const trimmedDetails = input.details?.trim() || null;

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_type: input.targetType,
    target_id: input.targetId,
    reported_user_id: input.reportedUserId ?? null,
    reason: reasonLabel,
    details: trimmedDetails,
  });

  if (error) {
    if (isReportsTableMissing(error.message, error.code)) {
      return { error: reportSetupError() };
    }
    if (error.code === "23505") {
      return { error: "You already reported this. We'll review it." };
    }
    if (error.code === "42501") {
      return {
        error:
          "Permission denied. Run the grants fix in Supabase (see supabase/RUN-PENDING-MIGRATIONS.md).",
      };
    }
    return { error: error.message };
  }

  return {};
}
