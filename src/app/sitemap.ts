import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/sign-in`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${siteUrl}/terms`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];

  try {
    const supabase = await createClient();
    const { data: profiles } = await supabase
      .from("profiles")
      .select("username, updated_at")
      .not("username", "is", null)
      .not("first_name", "is", null)
      .limit(500);

    const profilePages: MetadataRoute.Sitemap = (profiles ?? [])
      .filter((profile) => profile.username?.trim())
      .map((profile) => ({
        url: `${siteUrl}/people/${encodeURIComponent(profile.username!.trim())}`,
        lastModified: profile.updated_at ? new Date(profile.updated_at) : now,
        changeFrequency: "weekly",
        priority: 0.6,
      }));

    return [...staticPages, ...profilePages];
  } catch {
    return staticPages;
  }
}
