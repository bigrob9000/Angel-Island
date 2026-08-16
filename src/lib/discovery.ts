import type { Profile } from "@/lib/types";

export type DiscoveryFilters = {
  query: string;
  location: string | null;
  hereFor: string | null;
  role: string | null;
  genre: string | null;
  openTo: string | null;
};

export const EMPTY_DISCOVERY_FILTERS: DiscoveryFilters = {
  query: "",
  location: null,
  hereFor: null,
  role: null,
  genre: null,
  openTo: null,
};

export type DiscoverySort = "suggested" | "recent" | "name";

function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

function intersect(a: string[], b: string[]): string[] {
  const setB = new Set(b.map(normalizeToken));
  return a.filter((item) => setB.has(normalizeToken(item)));
}

function sameLocation(a: Profile, b: Profile): boolean {
  if (!a.location?.trim() || !b.location?.trim()) return false;
  return normalizeToken(a.location) === normalizeToken(b.location);
}

function profileHaystack(profile: Profile): string {
  return [
    profile.first_name,
    profile.username,
    profile.location,
    profile.about,
    profile.pronouns,
    ...profile.here_for,
    ...profile.open_to,
    ...profile.roles,
    ...profile.collaborate_as,
    ...profile.genres_make,
    ...profile.genres_love,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function uniqueLocations(profiles: Profile[]): string[] {
  const values = new Set<string>();
  profiles.forEach((profile) => {
    if (profile.location?.trim()) values.add(profile.location.trim());
  });
  return [...values].sort((a, b) => a.localeCompare(b));
}

export function uniqueGenres(profiles: Profile[]): string[] {
  const values = new Set<string>();
  profiles.forEach((profile) => {
    profile.genres_make.forEach((genre) => values.add(genre));
    profile.genres_love.forEach((genre) => values.add(genre));
  });
  return [...values].sort((a, b) => a.localeCompare(b)).slice(0, 24);
}

export function applyDiscoveryFilters(
  profiles: Profile[],
  filters: DiscoveryFilters
): Profile[] {
  const query = filters.query.trim().toLowerCase();
  const tokens = query.split(/\s+/).filter(Boolean);

  return profiles.filter((profile) => {
    const haystack = profileHaystack(profile);
    if (tokens.length > 0 && !tokens.every((token) => haystack.includes(token))) return false;

    if (filters.location && normalizeToken(profile.location ?? "") !== normalizeToken(filters.location)) {
      return false;
    }

    if (filters.hereFor && !profile.here_for.some((item) => normalizeToken(item) === normalizeToken(filters.hereFor!))) {
      return false;
    }

    if (filters.role && !profile.roles.some((item) => normalizeToken(item) === normalizeToken(filters.role!))) {
      return false;
    }

    if (filters.openTo && !profile.open_to.some((item) => normalizeToken(item) === normalizeToken(filters.openTo!))) {
      return false;
    }

    if (filters.genre) {
      const genre = normalizeToken(filters.genre);
      const matchesGenre = [...profile.genres_make, ...profile.genres_love].some(
        (item) => normalizeToken(item) === genre
      );
      if (!matchesGenre) return false;
    }

    return true;
  });
}

export function profileAlignmentScore(viewer: Profile, candidate: Profile): number {
  let score = 0;

  if (sameLocation(viewer, candidate)) score += 4;
  score += intersect(viewer.genres_make, candidate.genres_make).length * 3;
  score += intersect(viewer.genres_love, candidate.genres_love).length * 2;
  score += intersect(viewer.here_for, candidate.here_for).length * 2;
  score += intersect(viewer.open_to, candidate.open_to).length * 2;
  score += intersect(viewer.roles, candidate.roles).length * 2;
  score += candidate.collaborate_as.filter((role) => viewer.roles.includes(role)).length * 2;
  score += viewer.collaborate_as.filter((role) => candidate.roles.includes(role)).length * 2;

  return score;
}

export function profileAlignmentReason(viewer: Profile, candidate: Profile): string | null {
  const parts: string[] = [];

  if (sameLocation(viewer, candidate)) {
    parts.push(`Also in ${candidate.location}`);
  }

  const sharedMake = intersect(viewer.genres_make, candidate.genres_make);
  if (sharedMake.length > 0) {
    parts.push(`Also makes ${sharedMake.slice(0, 2).join(", ")}`);
  }

  const sharedLove = intersect(viewer.genres_love, candidate.genres_love);
  if (sharedLove.length > 0 && parts.length < 2) {
    parts.push(`Loves ${sharedLove.slice(0, 2).join(", ")}`);
  }

  const sharedHere = intersect(viewer.here_for, candidate.here_for);
  if (sharedHere.length > 0 && parts.length < 2) {
    parts.push(`Also here for ${sharedHere[0].toLowerCase()}`);
  }

  const sharedOpen = intersect(viewer.open_to, candidate.open_to);
  if (sharedOpen.length > 0 && parts.length < 2) {
    parts.push(`Open to ${sharedOpen[0].toLowerCase()}`);
  }

  const sharedRoles = intersect(viewer.roles, candidate.roles);
  if (sharedRoles.length > 0 && parts.length < 2) {
    parts.push(`Also a ${sharedRoles[0].toLowerCase()}`);
  }

  const complementary = candidate.collaborate_as.find((role) => viewer.roles.includes(role));
  if (complementary && parts.length < 2) {
    parts.push(`Looking to collaborate as ${complementary.toLowerCase()}`);
  }

  if (parts.length === 0) return null;
  return parts.slice(0, 2).join(" · ");
}

export type RankedProfile = Profile & {
  reason: string | null;
  alignmentScore: number;
};

export function rankProfilesForViewer(
  viewer: Profile | null,
  profiles: Profile[]
): RankedProfile[] {
  const ranked = profiles.map((profile) => {
    const alignmentScore = viewer ? profileAlignmentScore(viewer, profile) : 0;
    const reason = viewer ? profileAlignmentReason(viewer, profile) : null;
    return { ...profile, alignmentScore, reason };
  });

  return sortRankedProfiles(ranked, "suggested");
}

export function sortRankedProfiles(profiles: RankedProfile[], sort: DiscoverySort): RankedProfile[] {
  const ranked = [...profiles];

  ranked.sort((a, b) => {
    if (sort === "suggested") {
      if (b.alignmentScore !== a.alignmentScore) return b.alignmentScore - a.alignmentScore;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    }
    if (sort === "recent") {
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    }
    const nameA = (a.first_name ?? a.username ?? "").toLowerCase();
    const nameB = (b.first_name ?? b.username ?? "").toLowerCase();
    return nameA.localeCompare(nameB);
  });

  return ranked;
}

export function splitSuggestedProfiles(profiles: RankedProfile[]): {
  suggested: RankedProfile[];
  others: RankedProfile[];
} {
  const suggested = profiles.filter((profile) => profile.alignmentScore > 0);
  const others = profiles.filter((profile) => profile.alignmentScore === 0);
  return { suggested, others };
}

export type SuggestedDiscoveryFilter = {
  label: string;
  filters: Partial<DiscoveryFilters>;
};

export function suggestedDiscoveryFilters(viewer: Profile): SuggestedDiscoveryFilter[] {
  const suggestions: SuggestedDiscoveryFilter[] = [];

  for (const hereFor of viewer.here_for.slice(0, 1)) {
    suggestions.push({ label: hereFor, filters: { hereFor } });
  }
  for (const genre of viewer.genres_make.slice(0, 1)) {
    suggestions.push({ label: genre, filters: { genre } });
  }
  for (const role of viewer.roles.slice(0, 1)) {
    suggestions.push({ label: role, filters: { role } });
  }
  for (const openTo of viewer.open_to.slice(0, 1)) {
    suggestions.push({ label: openTo, filters: { openTo } });
  }
  if (viewer.location?.trim()) {
    suggestions.push({ label: viewer.location.trim(), filters: { location: viewer.location.trim() } });
  }

  return suggestions.slice(0, 5);
}

export function hasActiveDiscoveryFilters(filters: DiscoveryFilters): boolean {
  return Boolean(
    filters.location ||
      filters.hereFor ||
      filters.role ||
      filters.genre ||
      filters.openTo ||
      filters.query.trim(),
  );
}
