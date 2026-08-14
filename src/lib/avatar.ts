import { createClient } from "@/lib/supabase";

const BUCKET = "avatars";
const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function avatarInitials(profile: {
  first_name?: string | null;
  username?: string | null;
}): string {
  const source = profile.first_name?.trim() || profile.username?.trim();
  if (!source) return "?";
  return source.charAt(0).toUpperCase();
}

export function validateAvatarFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return "Use a JPG, PNG, or WebP image.";
  }
  if (file.size > MAX_BYTES) {
    return "Image must be 2 MB or smaller.";
  }
  return null;
}

function avatarObjectPath(userId: string, ext: string): string {
  return `${userId}/avatar.${ext}`;
}

function extFromMime(type: string): string {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

export async function uploadProfileAvatar(
  userId: string,
  file: File
): Promise<{ avatarUrl: string | null; error: string | null }> {
  const validationError = validateAvatarFile(file);
  if (validationError) return { avatarUrl: null, error: validationError };

  const supabase = createClient();
  const ext = extFromMime(file.type);
  const path = avatarObjectPath(userId, ext);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    return { avatarUrl: null, error: uploadError.message };
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const avatarUrl = `${data.publicUrl}?v=${Date.now()}`;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (profileError) {
    return { avatarUrl: null, error: profileError.message };
  }

  return { avatarUrl, error: null };
}

export async function removeProfileAvatar(userId: string): Promise<{ error: string | null }> {
  const supabase = createClient();

  for (const ext of ["jpg", "jpeg", "png", "webp"]) {
    await supabase.storage.from(BUCKET).remove([`${userId}/avatar.${ext}`]);
  }

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: null, updated_at: new Date().toISOString() })
    .eq("id", userId);

  return { error: error?.message ?? null };
}
