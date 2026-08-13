"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { HERE_FOR_OPTIONS } from "@/lib/profile-options";

const REASONS = [...HERE_FOR_OPTIONS];

const LOCATIONS = ["Remote", "Prefer not to say"];

const ONBOARDING_KEY = "angel_island_onboarding";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reasonChoices, setReasonChoices] = useState<string[]>([]);
  const [firstName, setFirstName] = useState("");
  const [username, setUsername] = useState("");
  const [location, setLocation] = useState("");
  const [locationCustom, setLocationCustom] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/sign-in");
        return;
      }
      if (typeof window !== "undefined" && window.localStorage.getItem(ONBOARDING_KEY) === "done") {
        router.replace("/home");
        return;
      }
      setLoading(false);
    });
  }, [router]);

  function finishOnboarding() {
    const supabase = createClient();
    const save =
      reasonChoices.length > 0
        ? supabase.auth.updateUser({ data: { here_for: reasonChoices } })
        : Promise.resolve();
    save.finally(() => {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(ONBOARDING_KEY, "done");
      }
      router.push("/home");
    });
  }

  function toggleReason(r: string) {
    setReasonChoices((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-ethereal flex items-center justify-center">
        <p className="text-muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ethereal text-foreground flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Step 0: Welcome */}
        {step === 0 && (
          <>
            <h1 className="brand-font text-2xl font-semibold text-foreground sm:text-3xl">
              Welcome to Angel Island
            </h1>
            <p className="mt-4 text-muted leading-relaxed">
              A calm space for musicians and creatives. No pressure — we&apos;ll take it one step at a time.
            </p>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="mt-8 w-full rounded-md bg-foreground py-2.5 text-sm font-medium text-background hover:opacity-90"
            >
              Continue
            </button>
          </>
        )}

        {/* Step 1: Right now, I'm here to… */}
        {step === 1 && (
          <>
            <h1 className="font-serif text-2xl font-medium text-foreground sm:text-3xl">
              Right now, I&apos;m here to…
            </h1>
            <p className="mt-2 text-sm text-muted">Pick any that fit. Optional — you can skip.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => toggleReason(r)}
                  className={`rounded-full px-4 py-2 text-sm border transition-colors ${
                    reasonChoices.includes(r)
                      ? "border-foreground bg-foreground/10 text-foreground"
                      : "border-foreground/30 text-muted hover:border-foreground/50"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 rounded-md bg-foreground py-2.5 text-sm font-medium text-background hover:opacity-90"
              >
                Continue
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-md border border-foreground/30 py-2.5 px-4 text-sm text-muted hover:text-foreground"
              >
                Skip
              </button>
            </div>
          </>
        )}

        {/* Step 2: A few basics */}
        {step === 2 && (
          <>
            <h1 className="font-serif text-2xl font-medium text-foreground sm:text-3xl">
              A few basics
            </h1>
            <p className="mt-2 text-sm text-muted">First name and username are used on your profile.</p>
            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="text-sm text-muted">First name</span>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Alex"
                  className="mt-1 block w-full rounded-md border border-foreground/20 bg-white/80 px-3 py-2 text-foreground placeholder:text-muted focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20"
                />
              </label>
              <label className="block">
                <span className="text-sm text-muted">Username (for your profile link)</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
                  placeholder="e.g. angelisland"
                  className="mt-1 block w-full rounded-md border border-foreground/20 bg-white/80 px-3 py-2 text-foreground placeholder:text-muted focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20"
                />
              </label>
              <label className="block">
                <span className="text-sm text-muted">Location</span>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-foreground/20 bg-white/80 px-3 py-2 text-foreground focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20"
                >
                  <option value="">Choose one…</option>
                  {LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                  <option value="other">Other (type below)</option>
                </select>
                {location === "other" && (
                  <input
                    type="text"
                    value={locationCustom}
                    onChange={(e) => setLocationCustom(e.target.value)}
                    placeholder="City or region"
                    className="mt-2 block w-full rounded-md border border-foreground/20 bg-white/80 px-3 py-2 text-foreground placeholder:text-muted focus:border-foreground/40 focus:outline-none"
                  />
                )}
              </label>
            </div>
            <button
              type="button"
              onClick={async () => {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                const loc = location === "other" ? locationCustom : location || undefined;
                await supabase.auth.updateUser({
                  data: {
                    first_name: firstName || undefined,
                    username: username || undefined,
                    location: loc,
                    here_for: reasonChoices.length > 0 ? reasonChoices : undefined,
                  },
                });
                if (user) {
                  await supabase.from("profiles").upsert(
                    {
                      id: user.id,
                      first_name: firstName || null,
                      username: username || null,
                      location: loc ?? null,
                      here_for: reasonChoices,
                      updated_at: new Date().toISOString(),
                    },
                    { onConflict: "id" }
                  );
                }
                setStep(3);
              }}
              className="mt-8 w-full rounded-md bg-foreground py-2.5 text-sm font-medium text-background hover:opacity-90"
            >
              Continue
            </button>
          </>
        )}

        {/* Step 3: How things work */}
        {step === 3 && (
          <>
            <h1 className="font-serif text-2xl font-medium text-foreground sm:text-3xl">
              How things work
            </h1>
            <ul className="mt-6 space-y-4 text-muted leading-relaxed">
              <li><strong className="text-foreground">Rooms hold intention.</strong> Each space has a purpose — jam, learn, collaborate — so you know what to expect.</li>
              <li><strong className="text-foreground">Conversation over reaction.</strong> No likes or counts. Just posts, questions, and real replies.</li>
              <li><strong className="text-foreground">You can listen first.</strong> Explore quietly. Jump in when you&apos;re ready. There&apos;s no rush.</li>
            </ul>
            <p className="mt-6 text-sm text-muted">
              You can adjust the space anytime in{" "}
              <Link href="/settings" className="text-foreground underline hover:no-underline">
                Settings
              </Link>
              .
            </p>
            <button
              type="button"
              onClick={finishOnboarding}
              className="brand-font mt-8 w-full rounded-md bg-foreground py-2.5 text-sm font-semibold text-background hover:opacity-90"
            >
              Enter Angel Island
            </button>
          </>
        )}
      </div>
      {step > 0 && step < 3 && (
        <button
          type="button"
          onClick={finishOnboarding}
          className="mt-8 text-sm text-muted hover:text-foreground"
        >
          Skip onboarding →
        </button>
      )}
    </div>
  );
}
