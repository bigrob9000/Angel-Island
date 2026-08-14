import Image from "next/image";
import { avatarInitials } from "@/lib/avatar";

type ProfileLike = {
  avatar_url?: string | null;
  first_name?: string | null;
  username?: string | null;
};

type Size = "sm" | "md" | "lg";

const sizeClasses: Record<Size, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-20 w-20 text-xl",
};

const pixelSizes: Record<Size, number> = {
  sm: 32,
  md: 40,
  lg: 80,
};

type Props = {
  profile: ProfileLike;
  size?: Size;
  className?: string;
};

export function ProfileAvatar({ profile, size = "md", className = "" }: Props) {
  const initials = avatarInitials(profile);
  const boxClass = `${sizeClasses[size]} ${className}`.trim();

  if (profile.avatar_url) {
    return (
      <span
        className={`relative inline-flex shrink-0 overflow-hidden rounded-full bg-white/60 ${boxClass}`}
      >
        <Image
          src={profile.avatar_url}
          alt=""
          width={pixelSizes[size]}
          height={pixelSizes[size]}
          className="h-full w-full object-cover"
          unoptimized
        />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-foreground/15 bg-white/70 font-medium text-muted ${boxClass}`}
      aria-hidden
    >
      {initials}
    </span>
  );
}
