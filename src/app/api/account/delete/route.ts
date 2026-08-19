import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: { confirmation?: string } = {};
  try {
    body = (await request.json()) as { confirmation?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (body.confirmation?.trim().toUpperCase() !== "DELETE") {
    return NextResponse.json(
      { error: 'Type DELETE to confirm account deletion.' },
      { status: 400 },
    );
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } catch {
    return NextResponse.json(
      {
        error:
          "Account deletion is not configured yet. Add SUPABASE_SERVICE_ROLE_KEY in Vercel, or email us from Settings → Beta feedback.",
      },
      { status: 503 },
    );
  }

  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
}
