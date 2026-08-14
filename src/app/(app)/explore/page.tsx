"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { ProfileCard } from "@/components/ProfileCard";
import type { Profile } from "@/lib/types";
import { normalizeProfile } from "@/lib/types";
import { isDiscoverableProfile } from "@/lib/profile";
import { loadBlockedUserIds } from "@/lib/blocks";

export default function ExplorePage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setLoading(false);
        return;
      }

      supabase
        .from("profiles")
        .select("*")
        .neq("id", user.id)
        .order("updated_at", { ascending: false })
        .then(async (res) => {
          const { blockedIds } = await loadBlockedUserIds(user.id);
          const rows = (res.data ?? [])
            .map((row) => normalizeProfile(row as Profile))
            .filter((p) => isDiscoverableProfile(p))
            .filter((p) => !blockedIds.has(p.id));
          setProfiles(rows);
          setLoading(false);
        });
    });
  }, []);

  const q = filter.trim().toLowerCase();
  const shown = q
    ? profiles.filter((p) => {
        const haystack = [
          p.first_name,
          p.username,
          p.location,
          p.about,
          p.pronouns,
          ...p.here_for,
          ...p.open_to,
          ...p.roles,
          ...p.genres_make,
          ...p.genres_love,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
    : profiles;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-2xl font-medium text-foreground">Explore People</h1>
        <p className="mt-2 text-sm text-muted">
          Musicians on Angel Island right now. No rankings — just profiles you can read at your own pace.
        </p>
      </div>

      <label className="block">
        <span className="text-sm text-muted">Filter this list</span>
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Name, username, location, or keywords"
          className="mt-1 block w-full rounded-md border border-foreground/20 bg-white/80 px-3 py-2 text-foreground placeholder:text-muted focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20"
        />
      </label>

      <p className="text-sm text-muted">
        Looking for rooms too?{" "}
        <Link href="/search" className="text-foreground underline hover:no-underline">
          Search Angel Island
        </Link>
      </p>

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : shown.length === 0 ? (
        <div className="rounded-lg border border-foreground/10 bg-white/40 px-4 py-8 text-center text-sm text-muted">
          {profiles.length === 0 ? (
            <>
              <p>Nothing here right now besides you.</p>
              <p className="mt-2">
                When others join, they&apos;ll show up here. You can also meet people in{" "}
                <Link href="/rooms/introductions" className="text-foreground underline hover:no-underline">
                  Introductions
                </Link>
                .
              </p>
            </>
          ) : (
            <>
              <p>Nothing like that turned up.</p>
              <p className="mt-2">You might try a different word — or clear the filter.</p>
            </>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {shown.map((profile) => (
            <li key={profile.id}>
              <ProfileCard profile={profile} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
