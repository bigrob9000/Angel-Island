"use client";

import { useRef, useState } from "react";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { removeProfileAvatar, uploadProfileAvatar } from "@/lib/avatar";

type Props = {
  userId: string;
  first_name: string | null;
  username: string | null;
  avatar_url: string | null;
  onAvatarChange: (avatarUrl: string | null) => void;
};

export function ProfileAvatarUpload({
  userId,
  first_name,
  username,
  avatar_url,
  onAvatarChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setBusy(true);
    const { avatarUrl, error: uploadError } = await uploadProfileAvatar(userId, file);
    setBusy(false);
    if (uploadError) {
      setError(uploadError);
      return;
    }
    onAvatarChange(avatarUrl);
  }

  async function handleRemove() {
    setError(null);
    setBusy(true);
    const { error: removeError } = await removeProfileAvatar(userId);
    setBusy(false);
    if (removeError) {
      setError(removeError);
      return;
    }
    onAvatarChange(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <ProfileAvatar
          profile={{ avatar_url, first_name, username }}
          size="lg"
        />
        <div className="space-y-2">
          <p className="text-sm text-muted">
            Optional — add a photo if you&apos;d like. Not required to explore or use Angel Island.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="rounded-md border border-foreground/30 px-3 py-1.5 text-sm text-foreground hover:bg-foreground/5 disabled:opacity-50"
            >
              {busy ? "Working…" : avatar_url ? "Change photo" : "Add photo"}
            </button>
            {avatar_url && (
              <button
                type="button"
                disabled={busy}
                onClick={handleRemove}
                className="rounded-md border border-foreground/20 px-3 py-1.5 text-sm text-muted hover:text-foreground disabled:opacity-50"
              >
                Remove
              </button>
            )}
          </div>
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
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
