"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { CollabPace, Profile } from "@/lib/types";
import { normalizeProfile } from "@/lib/types";
import { isDiscoverableProfile } from "@/lib/profile";
import { loadBlockedUserIds } from "@/lib/blocks";
import {
  createGroupCollabInvite,
  GROUP_COLLAB_MAX_INVITEES,
  groupCollabSetupError,
} from "@/lib/group-collaborations";
import { COLLAB_PACE_LABELS } from "@/lib/types";

const inputClass =
  "mt-1 block w-full rounded-md border border-foreground/20 bg-white px-3 py-2 text-foreground placeholder:text-muted focus:border-foreground/40 focus:outline-none";

export default function NewGroupCollabPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [about, setAbout] = useState("");
  const [message, setMessage] = useState("");
  const [role, setRole] = useState("");
  const [pace, setPace] = useState<CollabPace | "">("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tableMissing, setTableMissing] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.replace("/sign-in");
        return;
      }
      const [{ data }, { blockedIds }] = await Promise.all([
        supabase.from("profiles").select("*").neq("id", user.id).order("first_name"),
        loadBlockedUserIds(user.id),
      ]);
      setProfiles(
        (data ?? [])
          .map((row) => normalizeProfile(row as Profile))
          .filter(isDiscoverableProfile)
          .filter((p) => !blockedIds.has(p.id)),
      );
      setLoading(false);
    });
  }, [router]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return profiles.slice(0, 30);
    return profiles
      .filter((p) => {
        const hay = [p.first_name, p.username, p.location, ...(p.roles ?? [])]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 30);
  }, [profiles, query]);

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= GROUP_COLLAB_MAX_INVITEES) return prev;
      return [...prev, id];
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!about.trim()) {
      setError("Describe what you're exploring together.");
      return;
    }
    if (selected.length < 1) {
      setError("Pick at least one person to invite.");
      return;
    }

    setSending(true);
    const result = await createGroupCollabInvite({
      about: about.trim(),
      message: message.trim() || undefined,
      role: role.trim() || undefined,
      pace: pace || null,
      recipientIds: selected,
    });
    setSending(false);

    if (result.tableMissing) {
      setTableMissing(true);
      setError(result.error ?? groupCollabSetupError());
      return;
    }
    if (result.error) {
      setError(result.error);
      return;
    }

    router.push("/collaborations");
  }

  if (loading) return <p className="text-muted">Loading…</p>;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/collaborations" className="text-sm text-muted hover:text-foreground">
          ← Collaborations
        </Link>
        <h1 className="page-lead mt-2">Start a group collab</h1>
        <p className="section-copy">
          Invite up to {GROUP_COLLAB_MAX_INVITEES} people in one invite. Everyone responds within
          14 days — the workspace opens when all have answered and at least one person is
          interested.
        </p>
      </div>

      {tableMissing && <p className="text-sm text-muted">{groupCollabSetupError()}</p>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <label className="block">
          <span className="text-sm font-medium text-foreground">What are you exploring?</span>
          <input
            type="text"
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            className={inputClass}
            placeholder="e.g. Blues trio for local gigs"
            maxLength={200}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-foreground">Optional message</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className={inputClass}
            placeholder="A little context for everyone"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-foreground">Role (optional)</span>
            <input type="text" value={role} onChange={(e) => setRole(e.target.value)} className={inputClass} />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-foreground">Pace (optional)</span>
            <select
              value={pace}
              onChange={(e) => setPace(e.target.value as CollabPace | "")}
              className={inputClass}
            >
              <option value="">Choose…</option>
              {(Object.keys(COLLAB_PACE_LABELS) as CollabPace[]).map((key) => (
                <option key={key} value={key}>
                  {COLLAB_PACE_LABELS[key]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium text-foreground">Invite people</span>
            <span className="text-xs text-muted">
              {selected.length}/{GROUP_COLLAB_MAX_INVITEES} selected
            </span>
          </div>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={inputClass}
            placeholder="Search by name, role, location…"
          />
          <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto rounded-md border border-foreground/10 bg-white/50 p-2">
            {filtered.map((profile) => {
              const checked = selected.includes(profile.id);
              const disabled = !checked && selected.length >= GROUP_COLLAB_MAX_INVITEES;
              return (
                <li key={profile.id}>
                  <label
                    className={`flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-white/60 ${
                      disabled ? "opacity-50" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggle(profile.id)}
                    />
                    <span className="text-sm text-foreground">
                      {profile.first_name ?? profile.username ?? "Musician"}
                      {profile.username ? ` (@${profile.username})` : ""}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={sending} className="btn-primary">
          {sending ? "Sending…" : "Send group invite"}
        </button>
      </form>
    </div>
  );
}
