"use client";

import type { DiscoveryFilters } from "@/lib/discovery";
import { HERE_FOR_OPTIONS, ROLE_OPTIONS } from "@/lib/profile-options";

type Props = {
  filters: DiscoveryFilters;
  onChange: (filters: DiscoveryFilters) => void;
  locations: string[];
  genres: string[];
};

function Chip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-sm transition-colors ${
        active
          ? "border-foreground/40 bg-foreground/10 text-foreground"
          : "border-foreground/15 bg-white/50 text-muted hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-sm text-muted">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function ExploreFilters({ filters, onChange, locations, genres }: Props) {
  function toggleFilter<K extends "location" | "hereFor" | "role" | "genre">(
    key: K,
    value: string
  ) {
    onChange({ ...filters, [key]: filters[key] === value ? null : value });
  }

  return (
    <div className="space-y-4 rounded-lg border border-foreground/10 bg-white/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">Narrow this list</p>
        {(filters.location || filters.hereFor || filters.role || filters.genre) && (
          <button
            type="button"
            onClick={() =>
              onChange({
                ...filters,
                location: null,
                hereFor: null,
                role: null,
                genre: null,
              })
            }
            className="text-sm text-muted hover:text-foreground"
          >
            Clear filters
          </button>
        )}
      </div>

      {locations.length > 0 && (
        <FilterGroup title="Location">
          {locations.map((location) => (
            <Chip
              key={location}
              label={location}
              active={filters.location === location}
              onClick={() => toggleFilter("location", location)}
            />
          ))}
        </FilterGroup>
      )}

      <FilterGroup title="Here for">
        {HERE_FOR_OPTIONS.map((option) => (
          <Chip
            key={option}
            label={option}
            active={filters.hereFor === option}
            onClick={() => toggleFilter("hereFor", option)}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Role">
        {ROLE_OPTIONS.map((option) => (
          <Chip
            key={option}
            label={option}
            active={filters.role === option}
            onClick={() => toggleFilter("role", option)}
          />
        ))}
      </FilterGroup>

      {genres.length > 0 && (
        <FilterGroup title="Genre">
          {genres.map((genre) => (
            <Chip
              key={genre}
              label={genre}
              active={filters.genre === genre}
              onClick={() => toggleFilter("genre", genre)}
            />
          ))}
        </FilterGroup>
      )}
    </div>
  );
}
