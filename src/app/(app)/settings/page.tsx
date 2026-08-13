"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { SettingsToggle } from "@/components/SettingsToggle";
import { usePreferences } from "@/components/PreferencesProvider";
import { loadBlockedUsers, unblockUser } from "@/lib/blocks";
import type { BlockedUser } from "@/lib/blocks";

export default function SettingsPage() {
  const { preferences, setPreference } = usePreferences();
  const [email, setEmail] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountMessage, setAccountMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [accountSaving, setAccountSaving] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [blocksLoading, setBlocksLoading] = useState(true);
  const [blocksTableMissing, setBlocksTableMissing] = useState(false);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const [blocksMessage, setBlocksMessage] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? null);
      setUserId(user?.id ?? null);
      if (!user) {
        setBlocksLoading(false);
        return;
      }
      loadBlockedUsers(user.id).then((result) => {
        setBlockedUsers(result.blocks);
        setBlocksTableMissing(result.tableMissing);
        setBlocksLoading(false);
      });
    });
  }, []);

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setAccountMessage(null);

    if (newPassword.length < 6) {
      setAccountMessage({ type: "error", text: "Password must be at least 6 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setAccountMessage({ type: "error", text: "Passwords do not match." });
      return;
    }

    setAccountSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setAccountSaving(false);

    if (error) {
      setAccountMessage({ type: "error", text: error.message });
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    setAccountMessage({ type: "ok", text: "Password updated." });
  }

  async function handleUnblock(blockedId: string) {
    if (!userId) return;
    setUnblockingId(blockedId);
    setBlocksMessage(null);
    const result = await unblockUser(userId, blockedId);
    setUnblockingId(null);
    if (result.error) {
      setBlocksMessage(result.error);
      return;
    }
    setBlockedUsers((prev) => prev.filter((b) => b.blocked_id !== blockedId));
  }

  return (
    <div className="space-y-8">
      <Link href="/profile" className="text-sm text-muted hover:text-foreground">
        ← Profile
      </Link>
      <div>
        <h1 className="font-serif text-2xl font-medium text-foreground">Settings</h1>
        <p className="mt-2 text-sm text-muted">Adjust the space to feel right for you.</p>
      </div>

      <section className="rounded-lg border border-foreground/10 bg-white/50 p-5 space-y-5">
        <div>
          <h2 className="font-medium text-foreground">Account</h2>
          <p className="mt-1 text-sm text-muted">Your sign-in details.</p>
        </div>

        <div>
          <p className="text-sm text-muted">Email</p>
          <p className="mt-1 text-foreground">{email ?? "—"}</p>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-4 border-t border-foreground/10 pt-5">
          <p className="text-sm font-medium text-foreground">Change password</p>
          <label className="block">
            <span className="text-sm text-muted">New password</span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              className="mt-1 block w-full rounded-md border border-foreground/20 bg-white px-3 py-2 text-foreground focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20"
            />
          </label>
          <label className="block">
            <span className="text-sm text-muted">Confirm new password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              className="mt-1 block w-full rounded-md border border-foreground/20 bg-white px-3 py-2 text-foreground focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20"
            />
          </label>
          {accountMessage && (
            <p
              className={`text-sm ${accountMessage.type === "ok" ? "text-accent" : "text-foreground"}`}
              role="status"
            >
              {accountMessage.text}
            </p>
          )}
          <button
            type="submit"
            disabled={accountSaving || !newPassword}
            className="rounded-md border border-foreground/30 px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5 disabled:opacity-50"
          >
            {accountSaving ? "Saving…" : "Update password"}
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-foreground/10 bg-white/50 p-5 space-y-6">
        <div>
          <h2 className="font-medium text-foreground">Calm Mode</h2>
          <p className="mt-1 text-sm text-muted">
            Softer colors, less motion, and a little more breathing room.
          </p>
        </div>

        <SettingsToggle
          id="calm-mode"
          label="Calm Mode"
          description="Reduced contrast, softer palette, no drifting clouds, and slightly larger text."
          checked={preferences.calmMode}
          onChange={(checked) => setPreference("calmMode", checked)}
        />

        {preferences.calmMode && (
          <SettingsToggle
            id="easier-reading"
            label="Easier reading font"
            description="Use a simpler sans-serif font that's easier to scan."
            checked={preferences.easierReadingFont}
            onChange={(checked) => setPreference("easierReadingFont", checked)}
          />
        )}
      </section>

      <section className="rounded-lg border border-foreground/10 bg-white/50 p-5 space-y-5">
        <div>
          <h2 className="font-medium text-foreground">Blocked people</h2>
          <p className="mt-1 text-sm text-muted">
            People you&apos;ve blocked won&apos;t appear in search or Explore, and you can&apos;t
            message each other.
          </p>
        </div>

        {blocksLoading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : blocksTableMissing ? (
          <p className="text-sm text-muted">
            Blocking isn&apos;t set up yet. Run migration{" "}
            <code className="text-xs">009_user_blocks_and_reports.sql</code> in Supabase.
          </p>
        ) : blockedUsers.length === 0 ? (
          <p className="text-sm text-muted">You haven&apos;t blocked anyone.</p>
        ) : (
          <ul className="space-y-3">
            {blockedUsers.map((block) => {
              const name =
                block.profile?.first_name ?? block.profile?.username ?? "Someone";
              const username = block.profile?.username;
              return (
                <li
                  key={block.id}
                  className="flex flex-wrap items-center justify-between gap-3 text-sm"
                >
                  <div>
                    <p className="text-foreground">{name}</p>
                    {username && (
                      <Link
                        href={`/people/${username}`}
                        className="text-xs text-muted hover:text-foreground"
                      >
                        @{username}
                      </Link>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUnblock(block.blocked_id)}
                    disabled={unblockingId === block.blocked_id}
                    className="rounded-md border border-foreground/30 px-3 py-1.5 text-sm text-muted hover:text-foreground disabled:opacity-50"
                  >
                    {unblockingId === block.blocked_id ? "Unblocking…" : "Unblock"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {blocksMessage && (
          <p className="text-sm text-red-600" role="alert">
            {blocksMessage}
          </p>
        )}
      </section>

      <section className="rounded-lg border border-foreground/10 bg-white/50 p-5">
        <SettingsToggle
          id="reduce-motion"
          label="Reduce motion"
          description="Turn off gentle transitions and hover animations, even when Calm Mode is off."
          checked={preferences.reduceMotion}
          onChange={(checked) => setPreference("reduceMotion", checked)}
        />
      </section>
    </div>
  );
}
