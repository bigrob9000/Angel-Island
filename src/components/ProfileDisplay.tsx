import type { ReactNode } from "react";
import type { Profile } from "@/lib/types";
import { openToQuestionsLabel } from "@/lib/profile-options";
import { ProfileAvatar } from "@/components/ProfileAvatar";

function ChipList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-full border border-foreground/15 bg-white/60 px-3 py-1 text-sm text-foreground"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium text-foreground">{title}</h2>
      {children}
    </section>
  );
}

type Props = {
  profile: Profile;
  showUsername?: boolean;
};

export function ProfileDisplay({ profile, showUsername = true }: Props) {
  const name = profile.first_name || "—";
  const questionsLabel = openToQuestionsLabel(profile.open_to_questions);
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
        <Section title="Here for">
          <ChipList items={profile.here_for} />
        </Section>
      )}

      {profile.open_to.length > 0 && (
        <Section title="Currently open to">
          <ChipList items={profile.open_to} />
        </Section>
      )}

      {profile.about && (
        <Section title="About">
          <p className="text-muted whitespace-pre-wrap leading-relaxed">{profile.about}</p>
        </Section>
      )}

      {profile.roles.length > 0 && (
        <Section title="What I do">
          <ChipList items={profile.roles} />
        </Section>
      )}

      {profile.collaborate_as.length > 0 && (
        <Section title="Looking to collaborate as">
          <ChipList items={profile.collaborate_as} />
        </Section>
      )}

      {profile.genres_make.length > 0 && (
        <Section title="Genres I make">
          <ChipList items={profile.genres_make} />
        </Section>
      )}

      {profile.genres_love.length > 0 && (
        <Section title="Genres I love / want to explore">
          <ChipList items={profile.genres_love} />
        </Section>
      )}

      {profile.working_style.length > 0 && (
        <Section title="Working style">
          <ChipList items={profile.working_style} />
        </Section>
      )}

      {questionsLabel && (
        <Section title="Open to questions or mentoring">
          <p className="text-muted">{questionsLabel}</p>
        </Section>
      )}

      {linkLines && linkLines.length > 0 && (
        <Section title="Work / links">
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
