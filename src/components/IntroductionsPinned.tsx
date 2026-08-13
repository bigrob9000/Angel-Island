import { INTRODUCTIONS_PINNED } from "@/lib/introductions";

export function IntroductionsPinned() {
  return (
    <aside className="rounded-lg border border-accent/25 bg-white/60 p-5 space-y-4">
      <p className="text-sm font-medium text-foreground">{INTRODUCTIONS_PINNED.title}</p>
      <p className="text-sm text-muted leading-relaxed">{INTRODUCTIONS_PINNED.welcome}</p>
      <p className="text-sm text-muted leading-relaxed">{INTRODUCTIONS_PINNED.lead}</p>
      <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted leading-relaxed">
        {INTRODUCTIONS_PINNED.bullets.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <div className="space-y-2 pt-1">
        <p className="text-sm font-medium text-foreground">{INTRODUCTIONS_PINNED.commentsTitle}</p>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted leading-relaxed">
          {INTRODUCTIONS_PINNED.commentBullets.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <p className="text-sm text-muted leading-relaxed italic">{INTRODUCTIONS_PINNED.closing}</p>
    </aside>
  );
}
