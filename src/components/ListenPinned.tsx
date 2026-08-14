import { LISTEN_PINNED } from "@/lib/listen";

export function ListenPinned() {
  return (
    <aside className="rounded-lg border border-accent/25 bg-white/60 p-5 space-y-4">
      <p className="text-sm font-medium text-foreground">{LISTEN_PINNED.title}</p>
      <p className="text-sm text-muted leading-relaxed">{LISTEN_PINNED.welcome}</p>
      <p className="text-sm text-muted leading-relaxed">{LISTEN_PINNED.lead}</p>
      <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted leading-relaxed">
        {LISTEN_PINNED.bullets.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="text-sm text-muted leading-relaxed italic">{LISTEN_PINNED.closing}</p>
    </aside>
  );
}
