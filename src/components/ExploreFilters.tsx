"use client";

import { useTranslations } from "next-intl";
import type { DiscoveryFilters } from "@/lib/discovery";
import { HERE_FOR_OPTIONS, OPEN_TO_OPTIONS, ROLE_OPTIONS } from "@/lib/profile-options";
import { translateProfileOption } from "@/lib/i18n/labels";

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
  const t = useTranslations("explore");
  const tProfileOptions = useTranslations("profileOptions");

  function toggleFilter<K extends "location" | "hereFor" | "role" | "genre" | "openTo">(
    key: K,
    value: string,
  ) {
    onChange({ ...filters, [key]: filters[key] === value ? null : value });
  }

  const hasChipFilters = Boolean(
    filters.location || filters.hereFor || filters.role || filters.genre || filters.openTo,
  );

  return (
    <div className="surface space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">{t("filtersTitle")}</p>
        {hasChipFilters && (
          <button
            type="button"
            onClick={() =>
              onChange({
                ...filters,
                location: null,
                hereFor: null,
                role: null,
                genre: null,
                openTo: null,
              })
            }
            className="text-sm text-muted hover:text-foreground"
          >
            {t("clearAll")}
          </button>
        )}
      </div>

      {locations.length > 0 && (
        <FilterGroup title={t("filterLocation")}>
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

      <FilterGroup title={t("filterHereFor")}>
        {HERE_FOR_OPTIONS.map((option) => (
          <Chip
            key={option}
            label={translateProfileOption(option, tProfileOptions)}
            active={filters.hereFor === option}
            onClick={() => toggleFilter("hereFor", option)}
          />
        ))}
      </FilterGroup>

      <FilterGroup title={t("filterOpenTo")}>
        {OPEN_TO_OPTIONS.map((option) => (
          <Chip
            key={option}
            label={translateProfileOption(option, tProfileOptions)}
            active={filters.openTo === option}
            onClick={() => toggleFilter("openTo", option)}
          />
        ))}
      </FilterGroup>

      <FilterGroup title={t("filterRole")}>
        {ROLE_OPTIONS.map((option) => (
          <Chip
            key={option}
            label={translateProfileOption(option, tProfileOptions)}
            active={filters.role === option}
            onClick={() => toggleFilter("role", option)}
          />
        ))}
      </FilterGroup>

      {genres.length > 0 && (
        <FilterGroup title={t("filterGenre")}>
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
