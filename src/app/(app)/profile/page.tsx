"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Profile } from "@/lib/types";
import { normalizeProfile } from "@/lib/types";
import { emptyProfile } from "@/lib/profile";
import { ProfileDisplay } from "@/components/ProfileDisplay";
import { ProfileAvatarUpload } from "@/components/ProfileAvatarUpload";
import { ProfileListenShares } from "@/components/ProfileListenShares";
import { ProfileCompletenessNudge } from "@/components/ProfileCompletenessNudge";
import { loadRecentListenShares, type ProfileListenShare } from "@/lib/profile-shares";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [listenShares, setListenShares] = useState<ProfileListenShare[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/sign-in");
        return;
      }
      setUserId(user.id);
      void Promise.resolve(
        supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()
          .then((res) => {
            const p = res.data ? normalizeProfile(res.data) : emptyProfile(user.id);
            const metaHereFor = user.user_metadata?.here_for;
            if (
              p.here_for.length === 0 &&
              Array.isArray(metaHereFor) &&
              metaHereFor.length > 0
            ) {
              p.here_for = metaHereFor.filter((x): x is string => typeof x === "string");
            }
            setProfile(p);
            void loadRecentListenShares(user.id).then(setListenShares);
          })
      ).finally(() => setLoading(false));
    });
  }, [router]);

  if (loading) return <p className="text-muted">Loading…</p>;
  if (!profile) return null;

  return (
    <div className="space-y-8">
      <h1 className="font-serif text-2xl font-medium text-foreground">Profile</h1>

      <ProfileCompletenessNudge profile={profile} />

      {userId && (
        <div className="rounded-lg border border-foreground/10 bg-white/50 p-5">
          <ProfileAvatarUpload
            userId={userId}
            first_name={profile.first_name}
            username={profile.username}
            avatar_url={profile.avatar_url}
            onAvatarChange={(avatar_url) =>
              setProfile((prev) => (prev ? { ...prev, avatar_url } : prev))
            }
          />
        </div>
      )}

      <div className="rounded-lg border border-foreground/10 bg-white/50 p-5">
        <ProfileDisplay profile={profile} />
      </div>

      <ProfileListenShares shares={listenShares} isOwn showPrompt />

      <div className="flex flex-wrap gap-3">
        <Link
          href="/profile/edit"
          className="rounded-md border border-foreground/30 px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5"
        >
          Edit profile
        </Link>
        <Link
          href="/settings"
          className="rounded-md border border-foreground/30 px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5"
        >
          Settings
        </Link>
      </div>
    </div>
  );
}
