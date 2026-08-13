import type { OpenToQuestions } from "@/lib/types";

/** Same options as onboarding step "Right now, I'm here to…" */
export const HERE_FOR_OPTIONS = [
  "Explore quietly",
  "Meet musicians",
  "Jam",
  "Collaborate",
  "Learn",
  "Discover",
] as const;

export const OPEN_TO_OPTIONS = [
  "Just jamming",
  "Casual collaboration",
  "Recording projects",
  "Learning",
  "Mentoring",
  "Exploring new genres",
] as const;

export const ROLE_OPTIONS = [
  "Vocalist",
  "Guitarist",
  "Bassist",
  "Drummer",
  "Keyboardist",
  "Producer",
  "Songwriter",
  "Engineer",
  "Composer",
  "DJ",
  "Other",
] as const;

export const WORKING_STYLE_OPTIONS = [
  "Relaxed / low-pressure",
  "Structured",
  "Remote-friendly",
  "In-person preferred",
  "Open to genre-mixing",
] as const;

export const OPEN_TO_QUESTIONS_OPTIONS: { value: OpenToQuestions; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "sometimes", label: "Sometimes" },
  { value: "not_now", label: "Not right now" },
];

export function openToQuestionsLabel(value: OpenToQuestions | null | undefined): string | null {
  if (!value) return null;
  return OPEN_TO_QUESTIONS_OPTIONS.find((o) => o.value === value)?.label ?? null;
}

export function toggleInList(list: string[], item: string, max?: number): string[] {
  if (list.includes(item)) return list.filter((x) => x !== item);
  if (max !== undefined && list.length >= max) return list;
  return [...list, item];
}

export function parseTagInput(raw: string): string[] {
  return raw
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}
