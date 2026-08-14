"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { ProfileCard } from "@/components/ProfileCard";
import { ExploreFilters } from "@/components/ExploreFilters";
import type { Profile } from "@/lib/types";
import { normalizeProfile } from "@/lib/types";
import { isDiscoverableProfile } from "@/lib/profile";
import { loadBlockedUserIds } from "@/lib/blocks";
import {
  applyDiscoveryFilters,
  EMPTY_DISCOVERY_FILTERS,
  hasActiveDiscoveryFilters,
  rankProfilesForViewer,
  uniqueGenres,
  uniqueLocations,
  type DiscoveryFilters,
} from "@/lib/discovery";

export default function ExplorePage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [viewerProfile, setViewerProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<DiscoveryFilters>(EMPTY_DISCOVERY_FILTERS);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setLoading(false);
        return;
      }

      const [profilesRes, viewerRes, { blockedIds }] = await Promise.all([
        supabase.from("profiles").select("*").neq("id", user.id).order("updated_at", { ascending: false }),
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        loadBlockedUserIds(user.id),
      ]);

      if (viewerRes.data) {
        setViewerProfile(normalizeProfile(viewerRes.data as Profile));
      }

      const rows = (profilesRes.data ?? [])
        .map((row) => normalizeProfile(row as Profile))
        .filter((profile) => isDiscoverableProfile(profile))
        .filter((profile) => !blockedIds.has(profile.id));

      setProfiles(rows);
      setLoading(false);
    });
  }, []);

  const locations = useMemo(() => uniqueLocations(profiles), [profiles]);
  const genres = useMemo(() => uniqueGenres(profiles), [profiles]);

  const shown = useMemo(() => {
    const filtered = applyDiscoveryFilters(profiles, filters);
    return rankProfilesForViewer(viewerProfile, filtered);
  }, [profiles, filters, viewerProfile]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-2xl font-medium text-foreground">Explore People</h1>
        <p className="mt-2 text-sm text-muted">
          Musicians on Angel Island right now. No rankings — overlap with your profile is shown when
          it helps, not as a score.
        </p>
      </div>

      <label className="block">
        <span className="text-sm text-muted">Search this list</span>
        <input
          type="search"
          value={filters.query}
          onChange={(e) => setFilters((prev) => ({ ...prev, query: e.target.value }))}
          placeholder="Name, username, location, or keywords"
          className="mt-1 block w-full rounded-md border border-foreground/20 bg-white/80 px-3 py-2 text-foreground placeholder:text-muted focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20"
        />
      </label>

      {!loading && profiles.length > 0 && (
        <ExploreFilters
          filters={filters}
          onChange={setFilters}
          locations={locations}
          genres={genres}
        />
      )}

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
              <p className="mt-2">
                {hasActiveDiscoveryFilters(filters)
                  ? "Try clearing a filter or a different word."
                  : "You might try a different word — or clear the search."}
              </p>
            </>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {shown.map((profile) => (
            <li key={profile.id}>
              <ProfileCard profile={profile} reason={profile.reason ?? undefined} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
