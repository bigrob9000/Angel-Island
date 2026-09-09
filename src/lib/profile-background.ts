import { createClient } from "@/lib/supabase";

export const PROFILE_BACKGROUND_PRESETS = [
  "ethereal",
  "dusk",
  "sage",
  "warm",
  "lavender",
  "night",
] as const;

export type ProfileBackgroundPreset = (typeof PROFILE_BACKGROUND_PRESETS)[number];

export const DEFAULT_PROFILE_BACKGROUND_PRESET: ProfileBackgroundPreset = "ethereal";

const BUCKET = "profile-backgrounds";
const MAX_BYTES = 3 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function isProfileBackgroundPreset(value: string | null | undefined): value is ProfileBackgroundPreset {
  return Boolean(value && PROFILE_BACKGROUND_PRESETS.includes(value as ProfileBackgroundPreset));
}

export function resolveProfileBackgroundPreset(value: string | null | undefined): ProfileBackgroundPreset {
  return isProfileBackgroundPreset(value) ? value : DEFAULT_PROFILE_BACKGROUND_PRESET;
}

export function validateProfileBackgroundFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return "Use a JPG, PNG, or WebP image.";
  }
  if (file.size > MAX_BYTES) {
    return "Image must be 3 MB or smaller.";
  }
  return null;
}

function backgroundObjectPath(userId: string, ext: string): string {
  return `${userId}/background.${ext}`;
}

function extFromMime(type: string): string {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

export async function uploadProfileBackground(
  userId: string,
  file: File,
): Promise<{ backgroundUrl: string | null; error: string | null }> {
  const validationError = validateProfileBackgroundFile(file);
  if (validationError) return { backgroundUrl: null, error: validationError };

  const supabase = createClient();
  const ext = extFromMime(file.type);
  const path = backgroundObjectPath(userId, ext);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    return { backgroundUrl: null, error: uploadError.message };
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const backgroundUrl = `${data.publicUrl}?v=${Date.now()}`;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      profile_background_url: backgroundUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (profileError) {
    return { backgroundUrl: null, error: profileError.message };
  }

  return { backgroundUrl, error: null };
}

export async function removeProfileBackground(userId: string): Promise<{ error: string | null }> {
  const supabase = createClient();

  for (const ext of ["jpg", "jpeg", "png", "webp"]) {
    await supabase.storage.from(BUCKET).remove([`${userId}/background.${ext}`]);
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      profile_background_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  return { error: error?.message ?? null };
}

export async function saveProfileRoomFields(
  userId: string,
  fields: {
    profile_mantra?: string | null;
    profile_background_preset?: ProfileBackgroundPreset;
  },
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const patch: Record<string, string | null> = {
    updated_at: new Date().toISOString(),
  };

  if (fields.profile_mantra !== undefined) {
    const trimmed = fields.profile_mantra?.trim() ?? "";
    patch.profile_mantra = trimmed.length > 0 ? trimmed.slice(0, 120) : null;
  }

  if (fields.profile_background_preset !== undefined) {
    patch.profile_background_preset = fields.profile_background_preset;
  }

  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  return { error: error?.message ?? null };
}
