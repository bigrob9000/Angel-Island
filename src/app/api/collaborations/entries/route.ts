import { NextResponse } from "next/server";
import { sendCollabActivityNotification } from "@/lib/notifications/send";
import { collaborationsSetupError } from "@/lib/collaborations";
import { createClient } from "@/lib/supabase/server";
import type { CollaborationEntryType } from "@/lib/types";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    collaborationId?: string;
    entryType?: CollaborationEntryType;
    body?: string | null;
    url?: string | null;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!body.collaborationId || !body.entryType) {
    return NextResponse.json({ error: "collaborationId and entryType required" }, { status: 400 });
  }

  if (!["note", "reference", "step"].includes(body.entryType)) {
    return NextResponse.json({ error: "Invalid entryType" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("collaboration_entries")
    .insert({
      collaboration_id: body.collaborationId,
      author_id: user.id,
      entry_type: body.entryType,
      body: body.body?.trim() || null,
      url: body.url?.trim() || null,
    })
    .select("*")
    .single();

  if (error) {
    const tableMissing =
      error.message.includes("collaboration_entries") || error.code === "PGRST205";
    if (tableMissing) {
      return NextResponse.json(
        { error: collaborationsSetupError(), tableMissing: true },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await supabase
    .from("collaborations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", body.collaborationId);

  let notification: { ok: boolean; skipped?: string; email?: boolean; push?: boolean } = {
    ok: false,
    skipped: "not_attempted",
  };

  try {
    notification = await sendCollabActivityNotification(data.id, user.id);
  } catch {
    notification = { ok: false, skipped: "server_error" };
  }

  return NextResponse.json({ entry: data, notification });
}
