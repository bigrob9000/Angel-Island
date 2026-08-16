"use client";

import type { RankedProfile } from "@/lib/discovery";
import { ProfileCard } from "@/components/ProfileCard";

type Props = {
  profiles: RankedProfile[];
};

export function ExploreProfileList({ profiles }: Props) {
  return (
    <ul className="space-y-3">
      {profiles.map((profile) => (
        <li key={profile.id}>
          <ProfileCard profile={profile} reason={profile.reason ?? undefined} />
        </li>
      ))}
    </ul>
  );
}
