"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { AngelIslandLogo } from "@/components/AngelIslandLogo";

const ONBOARDING_KEY = "angel_island_onboarding";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      const done = typeof window !== "undefined" && window.localStorage.getItem(ONBOARDING_KEY) === "done";
      router.replace(done ? "/home" : "/onboarding");
    });
  }, [router]);

  return (
    <div className="relative min-h-screen bg-ethereal text-foreground">
      {/* Clouds — lumpy, irregular (real cloud shapes) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 overflow-visible"
      >
        <div className="heaven-glow" aria-hidden />
        {/* Cloud 1 — compact, dense cluster */}
        <div
          className="cloud-group cloud-drift-right"
          style={{
            top: "6%",
            left: "3%",
            width: "160px",
            height: "100px",
            animationDuration: "85s",
          }}
        >
          <div className="cloud-blob" style={{ width: 90, height: 70, top: 12, left: 30 }} />
          <div className="cloud-blob" style={{ width: 48, height: 44, top: 8, left: 0 }} />
          <div className="cloud-blob" style={{ width: 52, height: 50, top: 50, left: 20 }} />
          <div className="cloud-blob" style={{ width: 56, height: 48, top: 36, left: 88 }} />
          <div className="cloud-blob" style={{ width: 42, height: 38, top: 2, left: 108 }} />
          <div className="cloud-blob" style={{ width: 44, height: 46, top: 52, left: 112 }} />
        </div>
        {/* Cloud 2 — long, horizontal stretch */}
        <div
          className="cloud-group cloud-drift-left"
          style={{
            top: "14%",
            right: "2%",
            left: "auto",
            width: "280px",
            height: "80px",
            animationDuration: "100s",
          }}
        >
          <div className="cloud-blob" style={{ width: 110, height: 56, top: 10, left: 0 }} />
          <div className="cloud-blob" style={{ width: 95, height: 50, top: 20, left: 90 }} />
          <div className="cloud-blob" style={{ width: 88, height: 52, top: 8, left: 168 }} />
          <div className="cloud-blob" style={{ width: 70, height: 44, top: 26, left: 242 }} />
        </div>
        {/* Cloud 3 — thick, full cloud mid left */}
        <div
          className="cloud-group cloud-drift-right"
          style={{
            top: "38%",
            left: "0%",
            width: "220px",
            height: "110px",
            animationDuration: "95s",
          }}
        >
          <div className="cloud-blob" style={{ width: 90, height: 72, top: 18, left: 0 }} />
          <div className="cloud-blob" style={{ width: 96, height: 76, top: 12, left: 58 }} />
          <div className="cloud-blob" style={{ width: 88, height: 70, top: 28, left: 118 }} />
          <div className="cloud-blob" style={{ width: 72, height: 62, top: 8, left: 92 }} />
          <div className="cloud-blob" style={{ width: 68, height: 58, top: 48, left: 40 }} />
          <div className="cloud-blob" style={{ width: 64, height: 54, top: 52, left: 132 }} />
        </div>
        {/* Cloud 4 — big, scattered */}
        <div
          className="cloud-group cloud-drift-left"
          style={{
            top: "46%",
            right: "0%",
            left: "auto",
            width: "380px",
            height: "220px",
            animationDuration: "110s",
          }}
        >
          <div className="cloud-blob" style={{ width: 120, height: 108, top: 0, left: 0 }} />
          <div className="cloud-blob" style={{ width: 140, height: 120, top: 60, left: 110 }} />
          <div className="cloud-blob" style={{ width: 98, height: 92, top: 18, left: 220 }} />
          <div className="cloud-blob" style={{ width: 108, height: 100, top: 125, left: 160 }} />
          <div className="cloud-blob" style={{ width: 88, height: 84, top: 88, left: 285 }} />
        </div>
        {/* Cloud 5 — small, wispy */}
        <div
          className="cloud-group cloud-drift-right"
          style={{
            top: "68%",
            left: "5%",
            width: "140px",
            height: "70px",
            animationDuration: "90s",
          }}
        >
          <div className="cloud-blob" style={{ width: 72, height: 48, top: 8, left: 30 }} />
          <div className="cloud-blob" style={{ width: 48, height: 40, top: 24, left: 0 }} />
          <div className="cloud-blob" style={{ width: 52, height: 44, top: 28, left: 82 }} />
        </div>
        {/* Cloud 6 — one big chunky blob + smaller satellites */}
        <div
          className="cloud-group cloud-drift-left"
          style={{
            top: "78%",
            right: "8%",
            left: "auto",
            width: "180px",
            height: "100px",
            animationDuration: "105s",
          }}
        >
          <div className="cloud-blob" style={{ width: 100, height: 78, top: 8, left: 38 }} />
          <div className="cloud-blob" style={{ width: 38, height: 36, top: 4, left: 0 }} />
          <div className="cloud-blob" style={{ width: 44, height: 40, top: 56, left: 16 }} />
          <div className="cloud-blob" style={{ width: 40, height: 38, top: 20, left: 132 }} />
          <div className="cloud-blob" style={{ width: 36, height: 34, top: 58, left: 140 }} />
        </div>
      </div>

      <main className="relative z-10 mx-auto max-w-2xl px-6 py-16 sm:px-8 sm:py-24">
        {/* Hero */}
        <section className="mb-20 text-center sm:text-left">
          <AngelIslandLogo asLink={false} variant="mark" size="hero" priority className="mx-auto sm:mx-0 mb-6" />
          <h1 className="brand-font text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Angel Island
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted sm:text-xl max-w-xl">
            A place for musicians and creatives who care about music. No clout.
            No pressure. Just connection, collaboration, and conversation.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:gap-6">
            <Link href="/sign-in" className="btn-cloud">
              <span className="btn-cloud-blob" style={{ width: 56, height: 48, top: 14, left: 0 }} />
              <span className="btn-cloud-blob" style={{ width: 68, height: 58, top: 4, left: 38 }} />
              <span className="btn-cloud-blob" style={{ width: 62, height: 54, top: 12, left: 82 }} />
              <span className="btn-cloud-blob" style={{ width: 72, height: 60, top: 2, left: 118 }} />
              <span className="btn-cloud-blob" style={{ width: 52, height: 46, top: 18, left: 162 }} />
              <span className="btn-cloud-blob" style={{ width: 48, height: 44, top: 22, left: 188 }} />
              <span className="btn-cloud-text">Enter Angel Island</span>
            </Link>
            <a
              href="#why"
              className="inline-flex items-center justify-center text-base font-medium text-muted underline-offset-4 hover:underline hover:text-foreground"
            >
              Learn more
            </a>
          </div>
        </section>

        <hr className="mb-20 border-t border-foreground/10" />

        {/* Why It Exists */}
        <section id="why" className="mb-20 scroll-mt-24">
          <h2 className="font-serif text-2xl font-medium text-foreground sm:text-3xl">
            Why it exists
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
            Most platforms weren&apos;t built for musicians to find each other.
            They were built for attention. Angel Island exists so creatives can
            meet, learn, collaborate, and grow — without algorithms, competition,
            or noise.
          </p>
        </section>

        {/* What Happens Here */}
        <section className="mb-20">
          <h2 className="font-serif text-2xl font-medium text-foreground sm:text-3xl">
            What happens here
          </h2>
          <ul className="mt-4 list-none space-y-3 text-base leading-relaxed text-muted sm:text-lg">
            <li>Discover musicians intentionally</li>
            <li>Explore genres, influences, and ideas</li>
            <li>Join spaces to jam, collaborate, or learn</li>
            <li>Ask real questions and get thoughtful answers</li>
            <li>Make things with people who actually care</li>
          </ul>
          <p className="mt-6 text-base leading-relaxed text-muted sm:text-lg">
            Nothing to perform. Nothing to win. Just people and music.
          </p>
        </section>

        {/* Who It's For */}
        <section className="mb-20">
          <h2 className="font-serif text-2xl font-medium text-foreground sm:text-3xl">
            Who it&apos;s for
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
            Beginners. Amateurs. Serious artists. Producers and engineers. Quiet
            and neurodivergent creatives. Anyone who wants to grow through
            music.
          </p>
          <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
            If you care about music and want to get better, you belong here.
          </p>
        </section>

        {/* How It Works */}
        <section className="mb-20">
          <h2 className="font-serif text-2xl font-medium text-foreground sm:text-3xl">
            How it works
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
            You don&apos;t have to talk to anyone to belong. Explore quietly.
            Engage when you&apos;re ready. Connection happens by choice, not
            pressure.
          </p>
        </section>

        <hr className="mb-20 border-t border-foreground/10" />

        {/* Closing */}
        <section className="mb-8">
          <p className="font-serif text-xl leading-relaxed text-foreground sm:text-2xl">
            You don&apos;t need to be perfect. You don&apos;t need to be loud.
            You just need to care.
          </p>
          <div className="mt-10">
            <Link href="/sign-in" className="btn-cloud">
              <span className="btn-cloud-blob" style={{ width: 56, height: 48, top: 14, left: 0 }} />
              <span className="btn-cloud-blob" style={{ width: 68, height: 58, top: 4, left: 38 }} />
              <span className="btn-cloud-blob" style={{ width: 62, height: 54, top: 12, left: 82 }} />
              <span className="btn-cloud-blob" style={{ width: 72, height: 60, top: 2, left: 118 }} />
              <span className="btn-cloud-blob" style={{ width: 52, height: 46, top: 18, left: 162 }} />
              <span className="btn-cloud-blob" style={{ width: 48, height: 44, top: 22, left: 188 }} />
              <span className="btn-cloud-text">Enter Angel Island</span>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
