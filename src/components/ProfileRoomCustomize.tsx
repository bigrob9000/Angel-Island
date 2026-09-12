"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { Profile } from "@/lib/types";
import {
  PROFILE_BACKGROUND_PRESETS,
  type ProfileBackgroundPreset,
  applyProfileBackgroundPreset,
  removeProfileBackground,
  resolveProfileBackgroundPreset,
  saveProfileRoomFields,
  uploadProfileBackground,
} from "@/lib/profile-background";

type Props = {
  userId: string;
  username?: string | null;
  profile: Pick<
    Profile,
    "profile_mantra" | "profile_background_preset" | "profile_background_url"
  >;
  onChange: (
    patch: Partial<
      Pick<Profile, "profile_mantra" | "profile_background_preset" | "profile_background_url">
    >,
  ) => void;
};

function localizeRoomError(code: string, t: ReturnType<typeof useTranslations<"profile.room">>): string {
  if (code === "fileType") return t("errors.fileType");
  if (code === "fileSize") return t("errors.fileSize");
  if (code === "migration") return t("errors.migration");
  return code;
}

export function ProfileRoomCustomize({ userId, username, profile, onChange }: Props) {
  const t = useTranslations("profile.room");
  const inputRef = useRef<HTMLInputElement>(null);
  const [mantra, setMantra] = useState(profile.profile_mantra ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mantraSaved, setMantraSaved] = useState(false);

  const activePreset = resolveProfileBackgroundPreset(profile.profile_background_preset);
  const hasCustom = Boolean(profile.profile_background_url?.trim());
  const savedMantra = (profile.profile_mantra ?? "").trim();
  const mantraDirty = mantra.trim() !== savedMantra;

  useEffect(() => {
    setMantra(profile.profile_mantra ?? "");
  }, [profile.profile_mantra]);

  async function handlePreset(preset: ProfileBackgroundPreset) {
    setError(null);
    setBusy(true);
    const { error: saveError } = await applyProfileBackgroundPreset(userId, preset, hasCustom);
    setBusy(false);
    if (saveError) {
      setError(localizeRoomError(saveError, t));
      return;
    }
    onChange({
      profile_background_preset: preset,
      ...(hasCustom ? { profile_background_url: null } : {}),
    });
  }

  async function handleMantraSave() {
    const trimmed = mantra.trim();
    if (trimmed === savedMantra) return;

    setError(null);
    setMantraSaved(false);
    setBusy(true);
    const { error: saveError } = await saveProfileRoomFields(userId, {
      profile_mantra: trimmed || null,
    });
    setBusy(false);
    if (saveError) {
      setError(localizeRoomError(saveError, t));
      return;
    }
    onChange({ profile_mantra: trimmed || null });
    setMantraSaved(true);
  }

  async function handleFile(file: File) {
    setError(null);
    setBusy(true);
    const { backgroundUrl, error: uploadError } = await uploadProfileBackground(userId, file);
    setBusy(false);
    if (uploadError) {
      setError(localizeRoomError(uploadError, t));
      return;
    }
    onChange({ profile_background_url: backgroundUrl });
  }

  async function handleRemoveCustom() {
    setError(null);
    setBusy(true);
    const { error: removeError } = await removeProfileBackground(userId);
    setBusy(false);
    if (removeError) {
      setError(localizeRoomError(removeError, t));
      return;
    }
    onChange({ profile_background_url: null });
  }

  return (
    <section id="your-room" className="surface p-5 space-y-5 scroll-mt-6">
      <div>
        <h2 className="section-heading">{t("title")}</h2>
        <p className="mt-1 text-sm text-muted leading-relaxed">{t("copy")}</p>
        <p className="mt-3">
          {username?.trim() ? (
            <Link
              href={`/people/${encodeURIComponent(username.trim())}`}
              className="text-sm text-foreground underline underline-offset-2 hover:no-underline"
            >
              {t("viewPublicProfile")}
            </Link>
          ) : (
            <Link
              href="/profile/edit?step=0"
              className="text-sm text-muted underline underline-offset-2 hover:text-foreground hover:no-underline"
            >
              {t("viewPublicProfileNeedsUsername")}
            </Link>
          )}
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="profile-mantra" className="block text-sm font-medium text-foreground">
          {t("mantraLabel")}
        </label>
        <input
          id="profile-mantra"
          type="text"
          value={mantra}
          maxLength={120}
          disabled={busy}
          onChange={(e) => {
            setMantra(e.target.value);
            setMantraSaved(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleMantraSave();
            }
          }}
          placeholder={t("mantraPlaceholder")}
          className="block w-full rounded-md border border-foreground/20 bg-white px-3 py-2 text-foreground placeholder:text-muted focus:border-foreground/40 focus:outline-none"
        />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <button
            type="button"
            disabled={busy || !mantraDirty}
            onClick={() => void handleMantraSave()}
            className="rounded-md border border-foreground/30 px-3 py-1.5 text-sm font-medium text-foreground hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? t("working") : t("saveMantra")}
          </button>
          {mantraSaved && (
            <span className="text-sm text-accent" role="status">
              {t("mantraSaved")}
            </span>
          )}
        </div>
        <p className="text-xs text-muted">{t("mantraHint")}</p>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">{t("presetsLabel")}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PROFILE_BACKGROUND_PRESETS.map((preset) => {
            const selected = !hasCustom && activePreset === preset;
            return (
              <button
                key={preset}
                type="button"
                disabled={busy}
                onClick={() => void handlePreset(preset)}
                className={`profile-room-preset-btn profile-room-bg-${preset} ${
                  selected ? "profile-room-preset-selected" : ""
                }`}
                aria-pressed={selected}
              >
                <span className="profile-room-preset-label">{t(`presets.${preset}`)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">{t("uploadLabel")}</p>
        <p className="text-sm text-muted">{t("uploadCopy")}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="btn-secondary"
          >
            {busy ? t("working") : hasCustom ? t("changeUpload") : t("uploadButton")}
          </button>
          {hasCustom && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleRemoveCustom()}
              className="rounded-md border border-foreground/20 px-3 py-1.5 text-sm text-muted hover:text-foreground disabled:opacity-50"
            >
              {t("removeUpload")}
            </button>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void handleFile(file);
        }}
      />

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
