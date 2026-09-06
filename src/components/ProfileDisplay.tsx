"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { Profile } from "@/lib/types";
import { translateOpenToQuestions } from "@/lib/i18n/labels";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { ProfileChipList } from "@/components/ProfileChipList";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2.5">
      <h2 className="profile-section-label">{title}</h2>
      {children}
    </section>
  );
}

type Props = {
  profile: Profile;
  showUsername?: boolean;
};

export function ProfileDisplay({ profile, showUsername = true }: Props) {
  const t = useTranslations("profile");
  const tProfileOptions = useTranslations("profileOptions");
  const name = profile.first_name || "—";
  const questionsLabel = profile.open_to_questions
    ? translateOpenToQuestions(profile.open_to_questions, tProfileOptions)
    : null;
  const linkLines = profile.work_links
    ?.split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <div className="space-y-6">
      <header className="flex items-start gap-4">
        <ProfileAvatar profile={profile} size="lg" />
        <div className="space-y-1 min-w-0">
          <p className="font-medium text-foreground text-lg">
            {name}
            {profile.pronouns && (
              <span className="ml-2 text-base font-normal text-muted">({profile.pronouns})</span>
            )}
          </p>
          {showUsername && profile.username && (
            <p className="text-sm text-muted">@{profile.username}</p>
          )}
          {profile.location && <p className="text-sm text-muted">{profile.location}</p>}
        </div>
      </header>

      {profile.here_for.length > 0 && (
        <Section title={t("hereFor")}>
          <ProfileChipList items={profile.here_for} />
        </Section>
      )}

      {profile.open_to.length > 0 && (
        <Section title={t("openTo")}>
          <ProfileChipList items={profile.open_to} />
        </Section>
      )}

      {profile.about && (
        <Section title={t("about")}>
          <p className="text-muted whitespace-pre-wrap leading-relaxed">{profile.about}</p>
        </Section>
      )}

      {profile.roles.length > 0 && (
        <Section title={t("roles")}>
          <ProfileChipList items={profile.roles} />
        </Section>
      )}

      {profile.collaborate_as.length > 0 && (
        <Section title={t("collaborateAs")}>
          <ProfileChipList items={profile.collaborate_as} />
        </Section>
      )}

      {profile.genres_make.length > 0 && (
        <Section title={t("genresMake")}>
          <ProfileChipList items={profile.genres_make} />
        </Section>
      )}

      {profile.genres_love.length > 0 && (
        <Section title={t("genresLove")}>
          <ProfileChipList items={profile.genres_love} />
        </Section>
      )}

      {profile.working_style.length > 0 && (
        <Section title={t("workingStyle")}>
          <ProfileChipList items={profile.working_style} />
        </Section>
      )}

      {questionsLabel && (
        <Section title={t("questions")}>
          <p className="text-muted">{questionsLabel}</p>
        </Section>
      )}

      {linkLines && linkLines.length > 0 && (
        <Section title={t("workLinks")}>
          <ul className="space-y-1 text-sm">
            {linkLines.map((line) => {
              const isUrl = /^https?:\/\//i.test(line);
              return (
                <li key={line}>
                  {isUrl ? (
                    <a
                      href={line}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground underline hover:no-underline break-all"
                    >
                      {line}
                    </a>
                  ) : (
                    <span className="text-muted">{line}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </Section>
      )}
    </div>
  );
}
