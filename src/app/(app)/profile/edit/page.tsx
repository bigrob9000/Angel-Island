"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { OpenToQuestions } from "@/lib/types";
import { normalizeProfile } from "@/lib/types";
import {
  HERE_FOR_OPTIONS,
  OPEN_TO_OPTIONS,
  OPEN_TO_QUESTIONS_OPTIONS,
  ROLE_OPTIONS,
  WORKING_STYLE_OPTIONS,
} from "@/lib/profile-options";
import {
  buildProfileRow,
  emptyProfile,
  profileToForm,
  type ProfileFormState,
} from "@/lib/profile";
import { ChipSelect } from "@/components/ChipSelect";
import { TagInput } from "@/components/TagInput";
import { formatProfileSaveError, validateUsername } from "@/lib/profile-errors";
import { ProfileAvatarUpload } from "@/components/ProfileAvatarUpload";
import { PageLoading } from "@/components/PageLoading";

const STEP_COUNT = 9;

const inputClass =
  "mt-1 block w-full rounded-md border border-foreground/20 bg-white px-3 py-2 text-foreground placeholder:text-muted focus:border-foreground/40 focus:outline-none";

export default function EditProfilePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <EditProfilePageContent />
    </Suspense>
  );
}

function EditProfilePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ProfileFormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/sign-in");
        return;
      }
      setUserId(user.id);
      void Promise.resolve(
        supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()
          .then((res) => {
            const profile = res.data ? normalizeProfile(res.data) : emptyProfile(user.id);
            const formState = profileToForm(profile);
            const metaHereFor = user.user_metadata?.here_for;
            if (
              formState.here_for.length === 0 &&
              Array.isArray(metaHereFor) &&
              metaHereFor.length > 0
            ) {
              formState.here_for = metaHereFor.filter((x): x is string => typeof x === "string");
            }
            setForm(formState);
          })
      ).finally(() => setLoading(false));
    });
  }, [router]);

  useEffect(() => {
    const stepParam = searchParams.get("step");
    if (!stepParam) return;
    const parsed = Number.parseInt(stepParam, 10);
    if (!Number.isNaN(parsed) && parsed >= 0 && parsed < STEP_COUNT) {
      setStep(parsed);
    }
  }, [searchParams]);

  function updateForm(patch: Partial<ProfileFormState>) {
    setForm((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  async function persist(exitTo?: "/profile" | "/explore") {
    if (!userId || !form) return false;
    setError(null);
    setSaving(true);

    const supabase = createClient();
    const row = buildProfileRow(userId, form);
    if (row.username) {
      const usernameError = validateUsername(row.username);
      if (usernameError) {
        setError(usernameError);
        setSaving(false);
        return false;
      }
    }
    const { error: profileError } = await supabase.from("profiles").upsert(row, { onConflict: "id" });

    if (profileError) {
      setError(formatProfileSaveError(profileError));
      setSaving(false);
      return false;
    }

    await supabase.auth.updateUser({
      data: {
        first_name: row.first_name ?? undefined,
        username: row.username ?? undefined,
        location: row.location ?? undefined,
        here_for: row.here_for.length > 0 ? row.here_for : undefined,
      },
    });

    setSaving(false);
    if (exitTo) router.push(exitTo);
    return true;
  }

  async function handleContinue() {
    const ok = await persist();
    if (ok) setStep((s) => Math.min(s + 1, STEP_COUNT - 1));
  }

  async function handleSaveExit() {
    await persist("/profile");
  }

  async function handleFinish() {
    await persist("/explore");
  }

  if (loading || !form) return <PageLoading />;

  return (
    <div className="space-y-8 max-w-lg">
      <Link href="/profile" className="text-sm text-muted hover:text-foreground">
        ← Profile
      </Link>

      <div>
        <p className="text-sm text-muted">
          Step {step + 1} of {STEP_COUNT}
        </p>
        <h1 className="font-serif text-2xl font-medium text-foreground mt-1">Edit profile</h1>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          Fill out as much or as little as you want. Your profile can change whenever you do.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {step === 0 && (
        <section className="space-y-4">
          <h2 className="font-medium text-foreground">Basics</h2>
          {userId && (
            <ProfileAvatarUpload
              userId={userId}
              first_name={form.first_name}
              username={form.username}
              avatar_url={form.avatar_url}
              onAvatarChange={(avatar_url) => updateForm({ avatar_url })}
            />
          )}
          <label className="block">
            <span className="text-sm text-muted">First name</span>
            <input
              type="text"
              value={form.first_name ?? ""}
              onChange={(e) => updateForm({ first_name: e.target.value })}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-sm text-muted">Username (for your profile link)</span>
            <input
              type="text"
              value={form.username ?? ""}
              onChange={(e) =>
                updateForm({ username: e.target.value.toLowerCase().replace(/\s/g, "") })
              }
              placeholder="e.g. angelisland"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-sm text-muted">Pronouns (optional)</span>
            <input
              type="text"
              value={form.pronouns ?? ""}
              onChange={(e) => updateForm({ pronouns: e.target.value })}
              placeholder="e.g. she/her"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-sm text-muted">Location</span>
            <input
              type="text"
              value={form.location ?? ""}
              onChange={(e) => updateForm({ location: e.target.value })}
              placeholder="e.g. Remote, or a city"
              className={inputClass}
            />
          </label>
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-medium text-foreground">Right now, I&apos;m here to…</h3>
            <p className="text-sm text-muted">From onboarding — pick any that fit. Optional.</p>
            <ChipSelect
              options={HERE_FOR_OPTIONS}
              selected={form.here_for}
              onChange={(here_for) => updateForm({ here_for })}
            />
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="space-y-3">
          <h2 className="font-medium text-foreground">Currently open to</h2>
          <p className="text-sm text-muted">How do you want to show up right now? Pick any that fit.</p>
          <ChipSelect
            options={OPEN_TO_OPTIONS}
            selected={form.open_to}
            onChange={(open_to) => updateForm({ open_to })}
          />
        </section>
      )}

      {step === 2 && (
        <section className="space-y-3">
          <h2 className="font-medium text-foreground">About you</h2>
          <p className="text-sm text-muted">
            How do you relate to music right now? A few honest sentences is enough.
          </p>
          <textarea
            value={form.about ?? ""}
            onChange={(e) => updateForm({ about: e.target.value })}
            rows={6}
            className={inputClass}
            placeholder="Optional — no minimum length."
          />
        </section>
      )}

      {step === 3 && (
        <section className="space-y-3">
          <h2 className="font-medium text-foreground">What you do</h2>
          <p className="text-sm text-muted">Select any roles. You don&apos;t have to be an expert.</p>
          <ChipSelect
            options={ROLE_OPTIONS}
            selected={form.roles}
            onChange={(roles) => updateForm({ roles })}
          />
        </section>
      )}

      {step === 4 && (
        <section className="space-y-3">
          <h2 className="font-medium text-foreground">Looking to collaborate as</h2>
          <p className="text-sm text-muted">Up to two roles. This can change anytime.</p>
          <ChipSelect
            options={ROLE_OPTIONS}
            selected={form.collaborate_as}
            onChange={(collaborate_as) => updateForm({ collaborate_as })}
            max={2}
          />
        </section>
      )}

      {step === 5 && (
        <section className="space-y-6">
          <div className="space-y-3">
            <h2 className="font-medium text-foreground">Genres I make</h2>
            <p className="text-sm text-muted">A few is enough (up to 5).</p>
            <TagInput
              tags={form.genres_make}
              onChange={(genres_make) => updateForm({ genres_make })}
              max={5}
              placeholder="e.g. indie, jazz"
            />
          </div>
          <div className="space-y-3">
            <h2 className="font-medium text-foreground">Genres I love / want to explore</h2>
            <TagInput
              tags={form.genres_love}
              onChange={(genres_love) => updateForm({ genres_love })}
              placeholder="Add as many as you like"
            />
          </div>
        </section>
      )}

      {step === 6 && (
        <section className="space-y-3">
          <h2 className="font-medium text-foreground">Working style</h2>
          <p className="text-sm text-muted">This helps people reach out respectfully.</p>
          <ChipSelect
            options={WORKING_STYLE_OPTIONS}
            selected={form.working_style}
            onChange={(working_style) => updateForm({ working_style })}
          />
        </section>
      )}

      {step === 7 && (
        <section className="space-y-3">
          <h2 className="font-medium text-foreground">Learning & sharing</h2>
          <p className="text-sm text-muted">Open to answering questions or sharing what you know?</p>
          <div className="flex flex-wrap gap-2">
            {OPEN_TO_QUESTIONS_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => updateForm({ open_to_questions: value as OpenToQuestions })}
                className={`rounded-full px-4 py-2 text-sm border ${
                  form.open_to_questions === value
                    ? "border-foreground bg-foreground/10 text-foreground"
                    : "border-foreground/30 text-muted hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 8 && (
        <section className="space-y-3">
          <h2 className="font-medium text-foreground">Work / links</h2>
          <p className="text-sm text-muted">
            Optional links or descriptions — one per line. Not sharing anything is fine.
          </p>
          <textarea
            value={form.work_links ?? ""}
            onChange={(e) => updateForm({ work_links: e.target.value })}
            rows={4}
            className={inputClass}
            placeholder="https://…"
          />
          <p className="text-sm text-muted italic">
            Your profile reflects where you are right now. You can change it anytime.
          </p>
        </section>
      )}

      <div className="flex flex-wrap gap-3 pt-2">
        {step < STEP_COUNT - 1 ? (
          <button
            type="button"
            onClick={handleContinue}
            disabled={saving}
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Continue"}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={handleFinish}
              disabled={saving}
              className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save & explore"}
            </button>
            <button
              type="button"
              onClick={handleSaveExit}
              disabled={saving}
              className="rounded-md border border-foreground/30 px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5 disabled:opacity-50"
            >
              Save
            </button>
          </>
        )}
        <button
          type="button"
          onClick={handleSaveExit}
          disabled={saving}
          className="rounded-md border border-foreground/30 px-4 py-2 text-sm text-muted hover:text-foreground disabled:opacity-50"
        >
          Save & exit
        </button>
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            disabled={saving}
            className="rounded-md border border-foreground/30 px-4 py-2 text-sm text-muted hover:text-foreground disabled:opacity-50"
          >
            Back
          </button>
        )}
      </div>
    </div>
  );
}
