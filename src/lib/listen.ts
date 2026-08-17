export const LISTEN_SLUG = "listen";

export const LISTEN_PINNED = {
  title: "Listen & Share — Read This First",
  welcome: "This room is for showing your work — covers, demos, clips, works-in-progress.",
  lead: "Share a link to audio or video so other musicians can hear what you're making. No rankings, no public counts, no pressure to perform.",
  bullets: [
    "YouTube, SoundCloud, TikTok, Instagram, Bandcamp, and other links welcome.",
    "Add a short note about what it is, if you want — the link is what matters.",
    "Feedback only if you ask for it. Listening counts.",
    "Send love privately if something moves you — only the person who shared sees it.",
    "You don't have to comment on others' posts to belong here.",
  ],
  closing: "This isn't a competition. It's a listening room.",
  disclaimer:
    "You're welcome to share clips, demos, and links here — but only what you have the right to share. Angel Island doesn't host your audio or video, we don't review links for copyright, and we're not responsible if someone shares material without permission. Share at your own discretion.",
};

export const MUSIC_SHARING_DISCLAIMER = LISTEN_PINNED.disclaimer;

export function isListenRoom(slug: string): boolean {
  return slug === LISTEN_SLUG;
}

export const LISTEN_COMPOSE_INTENTS = ["share_work", "conversation"] as const;
