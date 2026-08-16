import { NextResponse } from "next/server";
import { sendCollabActivityNotification } from "@/lib/notifications/send";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { entryId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!body.entryId) {
    return NextResponse.json({ error: "entryId required" }, { status: 400 });
  }

  try {
    const result = await sendCollabActivityNotification(body.entryId, user.id);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ ok: false, skipped: "server_error" });
  }
}
