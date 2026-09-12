"use client";

import { useEffect, type ReactNode } from "react";
import type { Profile } from "@/lib/types";
import { resolveProfileBackgroundPreset } from "@/lib/profile-background";

type Props = {
  profile: Pick<Profile, "profile_mantra" | "profile_background_preset" | "profile_background_url">;
  children: ReactNode;
};

export function ProfileRoomShell({ profile, children }: Props) {
  const preset = resolveProfileBackgroundPreset(profile.profile_background_preset);
  const customUrl = profile.profile_background_url?.trim() || null;
  const mantra = profile.profile_mantra?.trim() || null;
  const isNight = !customUrl && preset === "night";

  useEffect(() => {
    document.documentElement.classList.add("profile-room-active");
    return () => {
      document.documentElement.classList.remove("profile-room-active");
    };
  }, []);

  return (
    <>
      <div
        className={`profile-room-page-bg ${isNight ? "profile-room-page-night" : ""}`}
        aria-hidden
      >
        <div
          className={`profile-room-bg ${customUrl ? "profile-room-bg-custom" : `profile-room-bg-${preset}`}`}
          style={customUrl ? { backgroundImage: `url("${customUrl}")` } : undefined}
        />
        <div className="profile-room-scrim profile-room-page-scrim" />
      </div>
      <div className="profile-room-content space-y-8">
        {mantra && (
          <p className={`profile-room-mantra${isNight ? " profile-room-mantra-night" : ""}`}>
            &ldquo;{mantra}&rdquo;
          </p>
        )}
        {children}
      </div>
    </>
  );
}
