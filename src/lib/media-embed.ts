export type MediaEmbedKind = "youtube" | "soundcloud" | "vimeo" | "link";

export type ParsedMediaEmbed = {
  kind: MediaEmbedKind;
  href: string;
  embedUrl?: string;
  label: string;
};

export function normalizeMediaUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.href;
  } catch {
    return null;
  }
}

function youtubeId(href: string): string | null {
  try {
    const url = new URL(href);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = url.pathname.slice(1).split("/")[0];
      return id || null;
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      if (url.pathname.startsWith("/watch")) {
        return url.searchParams.get("v");
      }
      if (url.pathname.startsWith("/embed/")) {
        return url.pathname.split("/")[2] ?? null;
      }
      if (url.pathname.startsWith("/shorts/")) {
        return url.pathname.split("/")[2] ?? null;
      }
    }
  } catch {
    return null;
  }
  return null;
}

function vimeoId(href: string): string | null {
  try {
    const url = new URL(href);
    const host = url.hostname.replace(/^www\./, "");
    if (host !== "vimeo.com" && host !== "player.vimeo.com") return null;
    const parts = url.pathname.split("/").filter(Boolean);
    const id = parts.find((part) => /^\d+$/.test(part));
    return id ?? null;
  } catch {
    return null;
  }
}

function hostLabel(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return "Link";
  }
}

export function parseMediaEmbed(input: string): ParsedMediaEmbed | null {
  const href = normalizeMediaUrl(input);
  if (!href) return null;

  const yt = youtubeId(href);
  if (yt) {
    return {
      kind: "youtube",
      href,
      embedUrl: `https://www.youtube.com/embed/${yt}`,
      label: "YouTube",
    };
  }

  if (/soundcloud\.com/i.test(href)) {
    return {
      kind: "soundcloud",
      href,
      embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(href)}&color=%23cccccc&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`,
      label: "SoundCloud",
    };
  }

  const vimeo = vimeoId(href);
  if (vimeo) {
    return {
      kind: "vimeo",
      href,
      embedUrl: `https://player.vimeo.com/video/${vimeo}`,
      label: "Vimeo",
    };
  }

  return {
    kind: "link",
    href,
    label: hostLabel(href),
  };
}
