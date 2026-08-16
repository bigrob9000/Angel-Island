"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { ExploreFilters } from "@/components/ExploreFilters";
import { ExploreProfileList } from "@/components/ExploreProfileList";
import { EmptyState } from "@/components/EmptyState";
import type { Profile } from "@/lib/types";
import { normalizeProfile } from "@/lib/types";
import { isDiscoverableProfile } from "@/lib/profile";
import { loadBlockedUserIds } from "@/lib/blocks";
import {
  applyDiscoveryFilters,
  EMPTY_DISCOVERY_FILTERS,
  hasActiveDiscoveryFilters,
  rankProfilesForViewer,
  sortRankedProfiles,
  splitSuggestedProfiles,
  suggestedDiscoveryFilters,
  uniqueGenres,
  uniqueLocations,
  type DiscoveryFilters,
  type DiscoverySort,
} from "@/lib/discovery";

const SORT_OPTIONS: Array<{ id: DiscoverySort; label: string }> = [
  { id: "suggested", label: "Suggested for you" },
  { id: "recent", label: "Recently updated" },
  { id: "name", label: "Name A–Z" },
];

export default function ExplorePage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [viewerProfile, setViewerProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<DiscoveryFilters>(EMPTY_DISCOVERY_FILTERS);
  const [sort, setSort] = useState<DiscoverySort>("suggested");

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
  const quickFilters = useMemo(
    () => (viewerProfile ? suggestedDiscoveryFilters(viewerProfile) : []),
    [viewerProfile],
  );

  const shown = useMemo(() => {
    const filtered = applyDiscoveryFilters(profiles, filters);
    const ranked = rankProfilesForViewer(viewerProfile, filtered);
    return sortRankedProfiles(ranked, sort);
  }, [profiles, filters, viewerProfile, sort]);

  const grouped = useMemo(() => {
    if (sort !== "suggested" || !viewerProfile) {
      return { suggested: [] as typeof shown, others: shown, useGroups: false };
    }
    const split = splitSuggestedProfiles(shown);
    return {
      ...split,
      useGroups: split.suggested.length > 0 && split.others.length > 0,
    };
  }, [shown, sort, viewerProfile]);

  function applyQuickFilter(partial: Partial<DiscoveryFilters>) {
    setFilters((prev) => ({ ...prev, ...partial }));
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-2xl font-medium text-foreground">Explore People</h1>
        <p className="mt-2 text-sm text-muted">
          Musicians on Angel Island right now. Suggested order uses overlap with your profile — not
          popularity or clout.
        </p>
      </div>

      {viewerProfile && quickFilters.length > 0 && !hasActiveDiscoveryFilters(filters) && (
        <section>
          <p className="text-sm text-muted">From your profile</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {quickFilters.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => applyQuickFilter(item.filters)}
                className="rounded-full border border-foreground/15 bg-white/50 px-3 py-1 text-sm text-muted hover:text-foreground"
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>
      )}

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

      <div className="flex flex-wrap gap-2">
        {SORT_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setSort(option.id)}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
              sort === option.id
                ? "border-foreground/40 bg-foreground/10 text-foreground"
                : "border-foreground/15 bg-white/50 text-muted hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

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
        <EmptyState
          title={profiles.length === 0 ? "Nothing here right now besides you." : "Nothing like that turned up."}
          description={
            profiles.length === 0
              ? "When others join, they'll show up here. You can also meet people in Introductions."
              : hasActiveDiscoveryFilters(filters)
                ? "Try clearing a filter or a different word."
                : "Try a different search word."
          }
        >
          {profiles.length === 0 ? (
            <Link
              href="/rooms/introductions"
              className="rounded-md border border-foreground/30 px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5"
            >
              Visit Introductions
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setFilters(EMPTY_DISCOVERY_FILTERS)}
              className="rounded-md border border-foreground/30 px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5"
            >
              Clear all
            </button>
          )}
        </EmptyState>
      ) : (
        <div className="space-y-8">
          <p className="text-sm text-muted">
            Showing {shown.length} {shown.length === 1 ? "person" : "people"}
          </p>

          {grouped.useGroups ? (
            <>
              <section>
                <h2 className="font-serif text-lg font-medium text-foreground">
                  People you might connect with
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Shared location, genres, roles, or collaboration fit with your profile.
                </p>
                <div className="mt-4">
                  <ExploreProfileList profiles={grouped.suggested} />
                </div>
              </section>
              <section>
                <h2 className="font-serif text-lg font-medium text-foreground">More musicians</h2>
                <p className="mt-1 text-sm text-muted">Everyone else on Angel Island right now.</p>
                <div className="mt-4">
                  <ExploreProfileList profiles={grouped.others} />
                </div>
              </section>
            </>
          ) : (
            <ExploreProfileList profiles={shown} />
          )}
        </div>
      )}
    </div>
  );
}
