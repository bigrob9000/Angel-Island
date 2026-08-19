import { NextResponse } from "next/server";
import { sendReportAlertEmail } from "@/lib/notifications/report-alert";
import { profileLabel } from "@/lib/notifications/email";
import { reportReasonLabel, reportSetupError } from "@/lib/reports";
import { createClient } from "@/lib/supabase/server";
import type { ReportReason, ReportTargetType } from "@/lib/types";

function isReportsTableMissing(message: string, code?: string): boolean {
  return message.includes("reports") || message.includes("user_blocks") || code === "PGRST205";
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: {
    targetType?: ReportTargetType;
    targetId?: string;
    reportedUserId?: string | null;
    reason?: ReportReason;
    details?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const targetType = body.targetType;
  const targetId = body.targetId?.trim();
  const reason = body.reason;
  const trimmedDetails = body.details?.trim() || null;

  if (!targetType || !targetId || !reason) {
    return NextResponse.json({ error: "Missing report details." }, { status: 400 });
  }

  const reasonLabel = reportReasonLabel(reason);

  const { data: report, error } = await supabase
    .from("reports")
    .insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      reported_user_id: body.reportedUserId ?? null,
      reason: reasonLabel,
      details: trimmedDetails,
    })
    .select("id")
    .single();

  if (error) {
    if (isReportsTableMissing(error.message, error.code)) {
      return NextResponse.json({ error: reportSetupError() }, { status: 503 });
    }
    if (error.code === "23505") {
      return NextResponse.json({ error: "You already reported this. We'll review it." }, { status: 409 });
    }
    if (error.code === "42501") {
      return NextResponse.json(
        {
          error:
            "Permission denied. Run the grants fix in Supabase (see supabase/RUN-PENDING-MIGRATIONS.md).",
        },
        { status: 403 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const profileIds = [user.id, body.reportedUserId].filter(Boolean) as string[];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, username")
    .in("id", profileIds);

  const byId = Object.fromEntries((profiles ?? []).map((row) => [row.id, row]));
  const reporterLabel = profileLabel(byId[user.id] ?? { first_name: user.email?.split("@")[0] });
  const reportedUserLabel = body.reportedUserId
    ? profileLabel(byId[body.reportedUserId] ?? {})
    : null;

  const emailResult = await sendReportAlertEmail({
    reportId: report.id,
    targetType,
    targetId,
    reason: reasonLabel,
    details: trimmedDetails,
    reporterLabel,
    reportedUserLabel,
  });

  if (!emailResult.ok) {
    console.error("Report alert email failed:", emailResult.error);
  }

  return NextResponse.json({ ok: true, emailSent: emailResult.ok });
}
