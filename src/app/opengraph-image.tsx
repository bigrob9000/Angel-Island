import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export const alt = SITE_NAME;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
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
            gap: 28,
            maxWidth: 900,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt="" width={200} height={200} style={{ objectFit: "contain" }} />
          <div
            style={{
              fontSize: 64,
              fontWeight: 600,
              color: "#2a2a2a",
              letterSpacing: "-0.02em",
              textAlign: "center",
            }}
          >
            {SITE_NAME}
          </div>
          <div
            style={{
              fontSize: 32,
              color: "#5f7a6b",
              textAlign: "center",
              lineHeight: 1.35,
            }}
          >
            {SITE_TAGLINE}
          </div>
          <div
            style={{
              fontSize: 22,
              color: "#6b6560",
              textAlign: "center",
              lineHeight: 1.45,
              maxWidth: 780,
            }}
          >
            {SITE_DESCRIPTION}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
