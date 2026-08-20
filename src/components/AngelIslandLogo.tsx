import Image from "next/image";
import Link from "next/link";

type Props = {
  asLink?: boolean;
  className?: string;
  variant?: "mark" | "full";
  showWordmark?: boolean;
  size?: "compact" | "nav" | "heading" | "md" | "hero";
  priority?: boolean;
};

/** Fixed square boxes so the logo never blows up to full page width */
const markBoxes = {
  compact: "h-8 w-8 sm:h-9 sm:w-9",
  nav: "h-10 w-10 sm:h-11 sm:w-11",
  heading: "h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24",
  md: "h-24 w-24 sm:h-28 sm:w-28",
  hero: "h-36 w-36 sm:h-44 sm:w-44 md:h-48 md:w-48",
};

const fullBoxes = {
  compact: "h-10 w-10 sm:h-11 sm:w-11",
  nav: "h-14 w-14 sm:h-16 sm:w-16",
  heading: "h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28",
  md: "h-32 w-32 sm:h-36 sm:w-36",
  hero: "h-48 w-48 sm:h-56 sm:w-56 md:h-64 md:w-64",
};

export function AngelIslandLogo({
  asLink = true,
  className = "",
  variant = "mark",
  showWordmark = false,
  size = "nav",
  priority = false,
}: Props) {
  const src =
    variant === "full" ? "/angel-island-logo-light.png" : "/angel-island-mark-light.png";
  const alt =
    variant === "full"
      ? "Angel Island — Music Collaboration Platform"
      : "Angel Island";
  const boxClass = variant === "full" ? fullBoxes[size] : markBoxes[size];

  const badgeClass =
    size === "nav" || size === "compact"
      ? "logo-badge-nav"
      : size === "hero"
        ? "logo-badge-hero"
        : "logo-badge-md";

  const image = (
    <span className={`logo-badge ${badgeClass}`}>
      <span className={`logo-badge-image shrink-0 ${boxClass}`}>
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes="(max-width: 640px) 160px, 256px"
          className="object-contain"
        />
      </span>
    </span>
  );

  const content =
    variant === "mark" && showWordmark ? (
      <span className="logo-with-wordmark inline-flex items-center gap-2.5 sm:gap-3">
        {image}
        <span className="logo-wordmark hidden lg:inline">Angel Island</span>
      </span>
    ) : (
      image
    );

  if (asLink) {
    return (
      <Link
        href="/home"
        className={`logo logo-image-link inline-block ${className}`.trim()}
        aria-label="Angel Island – Home"
      >
        {content}
      </Link>
    );
  }

  return (
    <span className={`logo logo-static inline-block ${className}`.trim()}>{content}</span>
  );
}
