import { LISTEN_PINNED } from "@/lib/listen";

export function ListenPinned() {
  return (
    <aside className="surface p-5 space-y-4 ring-1 ring-accent/15">
      <p className="text-sm font-medium text-foreground">{LISTEN_PINNED.title}</p>
      <p className="text-sm text-muted leading-relaxed">{LISTEN_PINNED.welcome}</p>
      <p className="text-sm text-muted leading-relaxed">{LISTEN_PINNED.lead}</p>
      <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted leading-relaxed">
        {LISTEN_PINNED.bullets.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="text-sm text-muted leading-relaxed border-t border-foreground/10 pt-4">
        {LISTEN_PINNED.disclaimer}
      </p>
      <p className="text-sm text-muted leading-relaxed italic">{LISTEN_PINNED.closing}</p>
    </aside>
  );
}
