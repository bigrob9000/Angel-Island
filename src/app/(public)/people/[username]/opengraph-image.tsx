import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { SITE_NAME } from "@/lib/site";

export const alt = "Angel Island profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = {
  params: Promise<{ username: string }>;
};

export default async function ProfileOpenGraphImage({ params }: Props) {
  const { username } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("first_name, username, roles, location, genres_make")
    .eq("username", username)
    .maybeSingle();

  const displayName = data?.first_name?.trim() || (data?.username ? `@${data.username}` : username);
  const subtitle =
    [data?.roles?.slice(0, 2).join(", "), data?.location?.trim()].filter(Boolean).join(" · ") ||
    data?.genres_make?.slice(0, 2).join(", ") ||
    "Musician on Angel Island";

  const logoPath = join(process.cwd(), "public/angel-island-mark-light.png");
  const logoBytes = await readFile(logoPath);
  const logoSrc = `data:image/png;base64,${logoBytes.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(165deg, #faf8f5 0%, #ebe4da 55%, #d4e2f0 100%)",
          padding: 64,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
            maxWidth: 900,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt="" width={96} height={96} style={{ objectFit: "contain", opacity: 0.9 }} />
          <div
            style={{
              fontSize: 56,
              fontWeight: 600,
              color: "#2a2a2a",
              letterSpacing: "-0.02em",
              textAlign: "center",
            }}
          >
            {displayName}
          </div>
          <div
            style={{
              fontSize: 28,
              color: "#5f7a6b",
              textAlign: "center",
              lineHeight: 1.35,
            }}
          >
            {subtitle}
          </div>
          <div
            style={{
              fontSize: 20,
              color: "#6b6560",
              textAlign: "center",
            }}
          >
            {SITE_NAME}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
