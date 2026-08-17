"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { FEEDBACK_EMAIL } from "@/lib/site";
import { getFeedbackMailtoUrl } from "@/lib/feedback";

export function FeedbackCard() {
  const [href, setHref] = useState(() => getFeedbackMailtoUrl());

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle();
      setHref(getFeedbackMailtoUrl({ username: profile?.username ?? null }));
    });
  }, []);

  return (
    <section className="rounded-lg border border-foreground/10 bg-white/50 p-5 space-y-3">
      <div>
        <h2 className="font-medium text-foreground">Beta feedback</h2>
        <p className="mt-1 text-sm text-muted">
          Angel Island is early. If something feels off, confusing, or surprisingly good — tell us.
          No pressure to be polite; specifics help.
        </p>
      </div>
      <a
        href={href}
        className="inline-flex rounded-md border border-foreground/30 px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5 transition-colors"
      >
        Send feedback
      </a>
      <p className="text-xs text-muted">
        Opens your email app to {FEEDBACK_EMAIL}. Screenshots welcome.
      </p>
    </section>
  );
}
