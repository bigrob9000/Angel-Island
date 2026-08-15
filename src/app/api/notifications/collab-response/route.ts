import { NextResponse } from "next/server";
import { sendCollabResponseNotification } from "@/lib/notifications/send";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { collabInviteId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!body.collabInviteId) {
    return NextResponse.json({ error: "collabInviteId required" }, { status: 400 });
  }

  try {
    const result = await sendCollabResponseNotification(body.collabInviteId, user.id);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ ok: false, skipped: "server_error" });
  }
}
