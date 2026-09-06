"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
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
import { translateOpenToQuestions, translateProfileOption } from "@/lib/i18n/labels";

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
  const t = useTranslations("profile");
  const tc = useTranslations("common");
  const tOnboarding = useTranslations("onboarding");
  const tProfileOptions = useTranslations("profileOptions");
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
        {tc("backToProfile")}
      </Link>

      <div>
        <p className="text-sm text-muted">
          {t("stepProgress", { current: step + 1, total: STEP_COUNT })}
        </p>
        <h1 className="font-serif text-2xl font-medium text-foreground mt-1">{t("editTitle")}</h1>
        <p className="mt-2 text-sm text-muted leading-relaxed">{t("editIntro")}</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {step === 0 && (
        <section className="space-y-4">
          <h2 className="font-medium text-foreground">{t("editBasics")}</h2>
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
            <span className="text-sm text-muted">{tOnboarding("firstNameLabel")}</span>
            <input
              type="text"
              value={form.first_name ?? ""}
              onChange={(e) => updateForm({ first_name: e.target.value })}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-sm text-muted">{t("usernameLabel")}</span>
            <input
              type="text"
              value={form.username ?? ""}
              onChange={(e) =>
                updateForm({ username: e.target.value.toLowerCase().replace(/\s/g, "") })
              }
              placeholder={t("usernamePlaceholder")}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-sm text-muted">{t("pronounsLabel")}</span>
            <input
              type="text"
              value={form.pronouns ?? ""}
              onChange={(e) => updateForm({ pronouns: e.target.value })}
              placeholder={t("pronounsPlaceholder")}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-sm text-muted">{tOnboarding("locationLabel")}</span>
            <input
              type="text"
              value={form.location ?? ""}
              onChange={(e) => updateForm({ location: e.target.value })}
              placeholder={t("locationPlaceholder")}
              className={inputClass}
            />
          </label>
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-medium text-foreground">{t("editHereFor")}</h3>
            <p className="text-sm text-muted">{t("editHereForCopy")}</p>
            <ChipSelect
              options={HERE_FOR_OPTIONS}
              selected={form.here_for}
              onChange={(here_for) => updateForm({ here_for })}
              formatLabel={(option) => translateProfileOption(option, tProfileOptions)}
            />
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="space-y-3">
          <h2 className="font-medium text-foreground">{t("editOpenTo")}</h2>
          <p className="text-sm text-muted">{t("editOpenToCopy")}</p>
          <ChipSelect
            options={OPEN_TO_OPTIONS}
            selected={form.open_to}
            onChange={(open_to) => updateForm({ open_to })}
            formatLabel={(option) => translateProfileOption(option, tProfileOptions)}
          />
        </section>
      )}

      {step === 2 && (
        <section className="space-y-3">
          <h2 className="font-medium text-foreground">{t("editAbout")}</h2>
          <p className="text-sm text-muted">{t("editAboutCopy")}</p>
          <textarea
            value={form.about ?? ""}
            onChange={(e) => updateForm({ about: e.target.value })}
            rows={6}
            className={inputClass}
            placeholder={t("editAboutPlaceholder")}
          />
        </section>
      )}

      {step === 3 && (
        <section className="space-y-3">
          <h2 className="font-medium text-foreground">{t("editRoles")}</h2>
          <p className="text-sm text-muted">{t("editRolesCopy")}</p>
          <ChipSelect
            options={ROLE_OPTIONS}
            selected={form.roles}
            onChange={(roles) => updateForm({ roles })}
            formatLabel={(option) => translateProfileOption(option, tProfileOptions)}
          />
        </section>
      )}

      {step === 4 && (
        <section className="space-y-3">
          <h2 className="font-medium text-foreground">{t("editCollaborateAs")}</h2>
          <p className="text-sm text-muted">{t("editCollaborateAsCopy")}</p>
          <ChipSelect
            options={ROLE_OPTIONS}
            selected={form.collaborate_as}
            onChange={(collaborate_as) => updateForm({ collaborate_as })}
            max={2}
            formatLabel={(option) => translateProfileOption(option, tProfileOptions)}
          />
        </section>
      )}

      {step === 5 && (
        <section className="space-y-6">
          <div className="space-y-3">
            <h2 className="font-medium text-foreground">{t("editGenresMake")}</h2>
            <p className="text-sm text-muted">{t("editGenresMakeCopy")}</p>
            <TagInput
              tags={form.genres_make}
              onChange={(genres_make) => updateForm({ genres_make })}
              max={5}
              placeholder={tOnboarding("genresPlaceholder")}
            />
          </div>
          <div className="space-y-3">
            <h2 className="font-medium text-foreground">{t("editGenresLove")}</h2>
            <TagInput
              tags={form.genres_love}
              onChange={(genres_love) => updateForm({ genres_love })}
              placeholder={t("editGenresLovePlaceholder")}
            />
          </div>
        </section>
      )}

      {step === 6 && (
        <section className="space-y-3">
          <h2 className="font-medium text-foreground">{t("editWorkingStyle")}</h2>
          <p className="text-sm text-muted">{t("editWorkingStyleCopy")}</p>
          <ChipSelect
            options={WORKING_STYLE_OPTIONS}
            selected={form.working_style}
            onChange={(working_style) => updateForm({ working_style })}
            formatLabel={(option) => translateProfileOption(option, tProfileOptions)}
          />
        </section>
      )}

      {step === 7 && (
        <section className="space-y-3">
          <h2 className="font-medium text-foreground">{t("editLearning")}</h2>
          <p className="text-sm text-muted">{t("editLearningCopy")}</p>
          <div className="flex flex-wrap gap-2">
            {OPEN_TO_QUESTIONS_OPTIONS.map(({ value }) => (
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
                {translateOpenToQuestions(value as OpenToQuestions, tProfileOptions)}
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 8 && (
        <section className="space-y-3">
          <h2 className="font-medium text-foreground">{t("editWorkLinks")}</h2>
          <p className="text-sm text-muted">{t("editWorkLinksCopy")}</p>
          <textarea
            value={form.work_links ?? ""}
            onChange={(e) => updateForm({ work_links: e.target.value })}
            rows={4}
            className={inputClass}
            placeholder={t("editWorkLinksPlaceholder")}
          />
          <p className="text-sm text-muted italic">{t("editClosingNote")}</p>
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
            {saving ? tc("saving") : tc("continue")}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={handleFinish}
              disabled={saving}
              className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
            >
              {saving ? tc("saving") : t("saveAndExplore")}
            </button>
            <button
              type="button"
              onClick={handleSaveExit}
              disabled={saving}
              className="rounded-md border border-foreground/30 px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5 disabled:opacity-50"
            >
              {t("save")}
            </button>
          </>
        )}
        <button
          type="button"
          onClick={handleSaveExit}
          disabled={saving}
          className="rounded-md border border-foreground/30 px-4 py-2 text-sm text-muted hover:text-foreground disabled:opacity-50"
        >
          {t("saveAndExit")}
        </button>
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            disabled={saving}
            className="rounded-md border border-foreground/30 px-4 py-2 text-sm text-muted hover:text-foreground disabled:opacity-50"
          >
            {t("back")}
          </button>
        )}
      </div>
    </div>
  );
}
