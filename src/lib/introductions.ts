export const INTRODUCTIONS_SLUG = "introductions";

export const INTRODUCTIONS_PINNED = {
  title: "Introductions — Read This First",
  welcome: "Welcome. Posting here is optional.",
  lead: "This space exists for people who want to briefly put themselves out there — once — in their own way.",
  bullets: [
    "You don't need to introduce yourself to belong here.",
    "You can make one introduction post, and you can edit or delete it anytime.",
    "There's no expectation to impress, explain, or keep up.",
    "Silence is always okay.",
  ],
  commentsTitle: "About comments",
  commentBullets: [
    "Comments are for welcoming, curiosity, or gentle connection.",
    "You don't need to reply to comments.",
    "There's no obligation to engage beyond what feels right to you.",
  ],
  closing: "This isn't a stage. It's just a place to say, \"I'm here.\" Take your time.",
};

export function isIntroductionsRoom(slug: string): boolean {
  return slug === INTRODUCTIONS_SLUG;
}
