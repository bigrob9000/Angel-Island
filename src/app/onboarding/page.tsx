"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { normalizeProfile } from "@/lib/types";
import { HERE_FOR_OPTIONS, ROLE_OPTIONS } from "@/lib/profile-options";
import { ChipSelect } from "@/components/ChipSelect";
import { TagInput } from "@/components/TagInput";
import { getOptionalProfileCompleteness } from "@/lib/profile-completeness";
import { formatProfileSaveError, validateUsername } from "@/lib/profile-errors";
import { hasFinishedOnboarding, markOnboardingCompleteLocal } from "@/lib/onboarding";
import { PageLoading } from "@/components/PageLoading";
import { translateProfileOption } from "@/lib/i18n/labels";

const REASONS = [...HERE_FOR_OPTIONS];

const LOCATION_KEYS = ["remote", "preferNotToSay"] as const;
const LOCATION_VALUES: string[] = ["Remote", "Prefer not to say"];
const LOCATIONS = LOCATION_VALUES;

const STEP_KEYS = ["stepWelcome", "stepHereFor", "stepBasics", "stepYourMusic", "stepHowItWorks"] as const;

const TOTAL_STEPS = STEP_KEYS.length;

export default function OnboardingPage() {
  const t = useTranslations("onboarding");
  const tc = useTranslations("common");
  const tProfileOptions = useTranslations("profileOptions");
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [reasonChoices, setReasonChoices] = useState<string[]>([]);
  const [firstName, setFirstName] = useState("");
  const [username, setUsername] = useState("");
  const [location, setLocation] = useState("");
  const [locationCustom, setLocationCustom] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [genresMake, setGenresMake] = useState<string[]>([]);
  const [about, setAbout] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace("/sign-in");
        return;
      }

      setUserId(session.user.id);
      const meta = session.user.user_metadata ?? {};
      if (typeof meta.first_name === "string") setFirstName(meta.first_name);
      if (typeof meta.username === "string") setUsername(meta.username);
      if (typeof meta.location === "string") {
        if (LOCATIONS.includes(meta.location)) setLocation(meta.location);
        else if (meta.location) {
          setLocation("other");
          setLocationCustom(meta.location);
        }
      }
      if (Array.isArray(meta.here_for)) {
        setReasonChoices(meta.here_for.filter((x): x is string => typeof x === "string"));
      }

      const { data: profileRow } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profileRow) {
        const profile = normalizeProfile(profileRow);
        if (hasFinishedOnboarding(profile)) {
          router.replace("/home");
          return;
        }
        if (profile.first_name) setFirstName(profile.first_name);
        if (profile.username) setUsername(profile.username);
        if (profile.location) {
          if (LOCATIONS.includes(profile.location)) setLocation(profile.location);
          else {
            setLocation("other");
            setLocationCustom(profile.location);
          }
        }
        if (profile.here_for.length > 0) setReasonChoices(profile.here_for);
        if (profile.roles.length > 0) setRoles(profile.roles);
        if (profile.genres_make.length > 0) setGenresMake(profile.genres_make);
        if (profile.about) setAbout(profile.about);
      } else if (hasFinishedOnboarding(null)) {
        router.replace("/home");
        return;
      }

      setLoading(false);
    });
  }, [router]);

  function toggleReason(r: string) {
    setReasonChoices((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  }

  function resolvedLocation(): string | null {
    if (location === "other") return locationCustom.trim() || null;
    return location.trim() || null;
  }

  async function saveProfile(partial?: { skipOptional?: boolean; markComplete?: boolean }) {
    if (!userId) return false;
    setSaveError(null);
    setSaving(true);

    const supabase = createClient();
    const trimmedName = firstName.trim();
    const trimmedUsername = username.trim().toLowerCase();
    const usernameError = validateUsername(trimmedUsername);
    if (usernameError) {
      setSaveError(usernameError);
      setSaving(false);
      return false;
    }

    const loc = resolvedLocation();

    const row = {
      id: userId,
      first_name: trimmedName || null,
      username: trimmedUsername || null,
      location: loc,
      here_for: reasonChoices,
      roles: partial?.skipOptional ? [] : roles,
      genres_make: partial?.skipOptional ? [] : genresMake.slice(0, 5),
      about: partial?.skipOptional ? null : about.trim() || null,
      onboarding_complete: partial?.markComplete ? true : undefined,
      updated_at: new Date().toISOString(),
    };

    const upsertRow = partial?.markComplete
      ? row
      : Object.fromEntries(Object.entries(row).filter(([, value]) => value !== undefined));

    const { error } = await supabase.from("profiles").upsert(upsertRow, { onConflict: "id" });

    if (error) {
      setSaveError(formatProfileSaveError(error));
      setSaving(false);
      return false;
    }

    await supabase.auth.updateUser({
      data: {
        first_name: trimmedName || undefined,
        username: trimmedUsername || undefined,
        location: loc ?? undefined,
        here_for: reasonChoices.length > 0 ? reasonChoices : undefined,
      },
    });

    setSaving(false);
    return true;
  }

  async function finishOnboarding() {
    const ok = await saveProfile({ markComplete: true });
    if (!ok) return;
    markOnboardingCompleteLocal();
    router.push("/home");
  }

  async function continueFromBasics() {
    if (!firstName.trim() || !username.trim()) return;
    const ok = await saveProfile({ skipOptional: true });
    if (ok) setStep(3);
  }

  async function continueFromOptional() {
    const ok = await saveProfile();
    if (ok) setStep(4);
  }

  const optionalPreview = getOptionalProfileCompleteness({
    first_name: firstName,
    username,
    avatar_url: null,
    about,
    genres_make: genresMake,
    roles,
    here_for: reasonChoices,
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-ethereal flex items-center justify-center">
        <PageLoading />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ethereal text-foreground flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {step > 0 && (
          <p className="mb-6 text-sm text-muted">
            {t("stepProgress", { current: step + 1, total: TOTAL_STEPS, step: t(STEP_KEYS[step]) })}
          </p>
        )}

        {saveError && (
          <p className="mb-4 text-sm text-red-600" role="alert">
            {saveError}
          </p>
        )}

        {step === 0 && (
          <>
            <h1 className="brand-font text-2xl font-semibold text-foreground sm:text-3xl">
              {t("welcomeTitle")}
            </h1>
            <p className="mt-4 text-muted leading-relaxed">{t("welcomeCopy")}</p>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="mt-8 w-full rounded-md bg-foreground py-2.5 text-sm font-medium text-background hover:opacity-90"
            >
              {tc("continue")}
            </button>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="font-serif text-2xl font-medium text-foreground sm:text-3xl">
              {t("hereForTitle")}
            </h1>
            <p className="mt-2 text-sm text-muted">{t("hereForCopy")}</p>
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
                  {translateProfileOption(r, tProfileOptions)}
                </button>
              ))}
            </div>
            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 rounded-md bg-foreground py-2.5 text-sm font-medium text-background hover:opacity-90"
              >
                {tc("continue")}
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-md border border-foreground/30 py-2.5 px-4 text-sm text-muted hover:text-foreground"
              >
                {tc("skip")}
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="font-serif text-2xl font-medium text-foreground sm:text-3xl">
              {t("basicsTitle")}
            </h1>
            <p className="mt-2 text-sm text-muted">{t("basicsCopy")}</p>
            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="text-sm text-muted">{t("firstNameLabel")}</span>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder={t("firstNamePlaceholder")}
                  required
                  className="mt-1 block w-full rounded-md border border-foreground/20 bg-white/80 px-3 py-2 text-foreground placeholder:text-muted focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20"
                />
              </label>
              <label className="block">
                <span className="text-sm text-muted">{t("usernameLabel")}</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
                  placeholder={t("usernamePlaceholder")}
                  required
                  minLength={2}
                  className="mt-1 block w-full rounded-md border border-foreground/20 bg-white/80 px-3 py-2 text-foreground placeholder:text-muted focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20"
                />
              </label>
              <label className="block">
                <span className="text-sm text-muted">{t("locationLabel")}</span>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-foreground/20 bg-white/80 px-3 py-2 text-foreground focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20"
                >
                  <option value="">{t("locationChoose")}</option>
                  {LOCATION_VALUES.map((loc, index) => (
                    <option key={loc} value={loc}>
                      {t(`locations.${LOCATION_KEYS[index]}`)}
                    </option>
                  ))}
                  <option value="other">{t("locationOther")}</option>
                </select>
                {location === "other" && (
                  <input
                    type="text"
                    value={locationCustom}
                    onChange={(e) => setLocationCustom(e.target.value)}
                    placeholder={t("locationCustomPlaceholder")}
                    className="mt-2 block w-full rounded-md border border-foreground/20 bg-white/80 px-3 py-2 text-foreground placeholder:text-muted focus:border-foreground/40 focus:outline-none"
                  />
                )}
              </label>
            </div>
            <button
              type="button"
              disabled={!firstName.trim() || !username.trim() || saving}
              onClick={() => void continueFromBasics()}
              className="mt-8 w-full rounded-md bg-foreground py-2.5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
            >
              {saving ? tc("saving") : tc("continue")}
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="font-serif text-2xl font-medium text-foreground sm:text-3xl">
              {t("yourMusicTitle")}
            </h1>
            <p className="mt-2 text-sm text-muted">{t("yourMusicCopy")}</p>
            <div className="mt-6 space-y-6">
              <div>
                <p className="text-sm font-medium text-foreground">{t("yourMusicRoles")}</p>
                <p className="mt-1 text-sm text-muted">{t("yourMusicRolesCopy")}</p>
                <div className="mt-3">
                  <ChipSelect
                    options={ROLE_OPTIONS}
                    selected={roles}
                    onChange={setRoles}
                    formatLabel={(option) => translateProfileOption(option, tProfileOptions)}
                  />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{t("yourMusicGenres")}</p>
                <p className="mt-1 text-sm text-muted">{t("yourMusicGenresCopy")}</p>
                <div className="mt-3">
                  <TagInput
                    tags={genresMake}
                    onChange={setGenresMake}
                    max={5}
                    placeholder={t("genresPlaceholder")}
                  />
                </div>
              </div>
              <label className="block">
                <span className="text-sm font-medium text-foreground">{t("yourMusicAbout")}</span>
                <span className="mt-1 block text-sm text-muted">{t("yourMusicAboutCopy")}</span>
                <textarea
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  rows={4}
                  placeholder={t("aboutPlaceholder")}
                  className="mt-2 block w-full rounded-md border border-foreground/20 bg-white/80 px-3 py-2 text-foreground placeholder:text-muted focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20"
                />
              </label>
            </div>
            <div className="mt-8 flex gap-3">
              <button
                type="button"
                disabled={saving}
                onClick={() => void continueFromOptional()}
                className="flex-1 rounded-md bg-foreground py-2.5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
              >
                {saving ? tc("saving") : tc("continue")}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  const ok = await saveProfile({ skipOptional: true });
                  if (ok) setStep(4);
                }}
                className="rounded-md border border-foreground/30 py-2.5 px-4 text-sm text-muted hover:text-foreground disabled:opacity-50"
              >
                {tc("skip")}
              </button>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h1 className="font-serif text-2xl font-medium text-foreground sm:text-3xl">
              {t("howItWorksTitle")}
            </h1>
            <ul className="mt-6 space-y-4 text-muted leading-relaxed">
              <li>{t("howItWorks1")}</li>
              <li>{t("howItWorks2")}</li>
              <li>{t("howItWorks3")}</li>
            </ul>
            {optionalPreview.completeCount < optionalPreview.items.length && (
              <p className="mt-6 text-sm text-muted">
                {t("optionalProfileProgress", {
                  complete: optionalPreview.completeCount,
                  total: optionalPreview.items.length,
                })}{" "}
                <Link href="/profile/edit" className="text-foreground underline hover:no-underline">
                  {t("editProfile")}
                </Link>
              </p>
            )}
            <p className="mt-4 text-sm text-muted">
              {t("settingsHint")}{" "}
              <Link href="/settings" className="text-foreground underline hover:no-underline">
                {t("settingsLink")}
              </Link>
              .
            </p>
            <button
              type="button"
              disabled={saving}
              onClick={() => void finishOnboarding()}
              className="brand-font mt-8 w-full rounded-md bg-foreground py-2.5 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-50"
            >
              {saving ? tc("saving") : t("enterAngelIsland")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
