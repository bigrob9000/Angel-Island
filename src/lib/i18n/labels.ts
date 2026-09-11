import type { CollabPace, OpenToQuestions } from "@/lib/types";

export type TranslateFn = (key: string, values?: Record<string, string | number | Date>) => string;

const HERE_FOR_KEYS: Record<string, string> = {
  "Explore quietly": "hereFor.exploreQuietly",
  "Meet musicians": "hereFor.meetMusicians",
  Jam: "hereFor.jam",
  Collaborate: "hereFor.collaborate",
  Learn: "hereFor.learn",
  Discover: "hereFor.discover",
};

const OPEN_TO_KEYS: Record<string, string> = {
  "Just jamming": "openTo.justJamming",
  "Casual collaboration": "openTo.casualCollaboration",
  "Recording projects": "openTo.recordingProjects",
  Learning: "openTo.learning",
  Mentoring: "openTo.mentoring",
  "Exploring new genres": "openTo.exploringNewGenres",
};

const ROLE_KEYS: Record<string, string> = {
  Vocalist: "roles.vocalist",
  Guitarist: "roles.guitarist",
  Bassist: "roles.bassist",
  Drummer: "roles.drummer",
  Keyboardist: "roles.keyboardist",
  Producer: "roles.producer",
  Songwriter: "roles.songwriter",
  Engineer: "roles.engineer",
  Composer: "roles.composer",
  DJ: "roles.dj",
  Other: "roles.other",
};

const WORKING_STYLE_KEYS: Record<string, string> = {
  "Relaxed / low-pressure": "workingStyle.relaxed",
  Structured: "workingStyle.structured",
  "Remote-friendly": "workingStyle.remoteFriendly",
  "In-person preferred": "workingStyle.inPersonPreferred",
  "Open to genre-mixing": "workingStyle.genreMixing",
};

const PACE_KEYS: Record<CollabPace, string> = {
  "low-pressure": "lowPressure",
  structured: "structured",
  flexible: "flexible",
};

const OPEN_TO_QUESTIONS_KEYS: Record<OpenToQuestions, string> = {
  yes: "yes",
  sometimes: "sometimes",
  not_now: "notNow",
};

export function translateProfileOption(value: string, t: TranslateFn): string {
  const key =
    HERE_FOR_KEYS[value] ??
    OPEN_TO_KEYS[value] ??
    ROLE_KEYS[value] ??
    WORKING_STYLE_KEYS[value];
  return key ? t(key) : value;
}

export function translatePace(pace: CollabPace, t: TranslateFn): string {
  return t(PACE_KEYS[pace]);
}

export function translateOpenToQuestions(value: OpenToQuestions, t: TranslateFn): string {
  return t(`openToQuestions.${OPEN_TO_QUESTIONS_KEYS[value]}`);
}

export function inviteResponseLabel(
  response: "interested" | "maybe" | "not_fit" | "pending" | "waiting",
  t: TranslateFn,
): string {
  if (response === "interested") return t("interested");
  if (response === "maybe") return t("maybeLater");
  if (response === "not_fit") return t("notFit");
  return t("waiting");
}

export function collaborationStatusLabel(status: string, t: TranslateFn): string {
  if (status === "pending_alignment") return t("pendingAlignment");
  if (status === "paused") return t("paused");
  if (status === "ended") return t("closed");
  return t("active");
}

export function conversationStatusLabel(status: string, t: TranslateFn): string | null {
  if (status === "paused") return t("paused");
  if (status === "ended") return t("closed");
  return null;
}
