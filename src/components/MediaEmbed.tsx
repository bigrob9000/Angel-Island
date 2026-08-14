import { parseMediaEmbed } from "@/lib/media-embed";

type Props = {
  url: string;
};

export function MediaEmbed({ url }: Props) {
  const parsed = parseMediaEmbed(url);
  if (!parsed) return null;

  if (parsed.kind === "link") {
    return (
      <a
        href={parsed.href}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-2 rounded-md border border-foreground/15 bg-white/70 px-3 py-2 text-sm font-medium text-foreground hover:bg-white"
      >
        Open on {parsed.label}
        <span aria-hidden>↗</span>
      </a>
    );
  }

  const tall = parsed.kind === "soundcloud";

  return (
    <div className={`mt-3 overflow-hidden rounded-lg border border-foreground/10 bg-black/5 ${tall ? "" : "aspect-video"}`}>
      <iframe
        src={parsed.embedUrl}
        title={`${parsed.label} embed`}
        className={`w-full ${tall ? "h-[166px]" : "h-full min-h-[200px]"}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
      />
      <a
        href={parsed.href}
        target="_blank"
        rel="noopener noreferrer"
        className="block border-t border-foreground/10 bg-white/60 px-3 py-2 text-xs text-muted hover:text-foreground"
      >
        Open on {parsed.label} ↗
      </a>
    </div>
  );
}
