import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SITE_NAME } from "@/lib/site";

type Props = {
  params: Promise<{ username: string }>;
  children: React.ReactNode;
};

function profileDescription(profile: {
  first_name: string | null;
  username: string | null;
  about: string | null;
  roles: string[] | null;
  location: string | null;
}): string {
  if (profile.about?.trim()) {
    return profile.about.trim().slice(0, 200);
  }
  const parts: string[] = [];
  if (profile.roles?.length) {
    parts.push(profile.roles.slice(0, 3).join(", "));
  }
  if (profile.location?.trim()) {
    parts.push(profile.location.trim());
  }
  if (parts.length) {
    return parts.join(" · ");
  }
  const name = profile.first_name || profile.username || "Musician";
  return `Connect with ${name} on ${SITE_NAME}.`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("first_name, username, about, roles, location, avatar_url")
    .eq("username", username)
    .maybeSingle();

  if (!data) {
    return {
      title: "Profile not found",
      robots: { index: false, follow: false },
    };
  }

  const displayName = data.first_name?.trim() || `@${data.username}` || "Musician";
  const description = profileDescription(data);

  return {
    title: displayName,
    description,
    openGraph: {
      title: `${displayName} on ${SITE_NAME}`,
      description,
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title: `${displayName} on ${SITE_NAME}`,
      description,
    },
  };
}

export default function PersonProfileLayout({ children }: Props) {
  return children;
}
