import { NextResponse } from "next/server";
import { sendMessageNotification } from "@/lib/notifications/send";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { messageId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!body.messageId) {
    return NextResponse.json({ error: "messageId required" }, { status: 400 });
  }

  try {
    const result = await sendMessageNotification(body.messageId, user.id);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ ok: false, skipped: "server_error" });
  }
}
