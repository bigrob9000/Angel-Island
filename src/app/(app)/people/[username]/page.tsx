"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Profile } from "@/lib/types";
import { normalizeProfile } from "@/lib/types";
import type { CollabPace } from "@/lib/types";
import { ProfileDisplay } from "@/components/ProfileDisplay";
import { UserSafetyActions, type SafetyDialog } from "@/components/UserSafetyActions";
import { checkBlockBetween, unblockUser } from "@/lib/blocks";

const MAX_PENDING = 5;
const COLLAB_ABOUT_OPTIONS = ["Co-writing", "Production", "Jam session", "Learning", "Other"] as const;
const PACE_LABELS: Record<CollabPace, string> = { "low-pressure": "Low-pressure", "structured": "Structured", "flexible": "Flexible" };
const MAX_PER_24H = 3;

function collabInviteError(message: string): string {
  if (message.includes("collab_invites") || message.includes("Could not find the table")) {
    return "Collab invites aren't set up yet. Run migration 003_collab_invites.sql in Supabase (see supabase/RUN-PENDING-MIGRATIONS.md).";
  }
  return message;
}

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwn, setIsOwn] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [existingInvite, setExistingInvite] = useState<"pending" | "declined" | null>(null);
  const [collabOpen, setCollabOpen] = useState(false);
  const [collabStep, setCollabStep] = useState(1);
  const [collabAbout, setCollabAbout] = useState("");
  const [collabMessage, setCollabMessage] = useState("");
  const [collabRole, setCollabRole] = useState("");
  const [collabPace, setCollabPace] = useState<CollabPace | "">("");
  const [collabSending, setCollabSending] = useState(false);
  const [collabError, setCollabError] = useState<string | null>(null);
  const [existingCollabInvite, setExistingCollabInvite] = useState<"pending" | "responded" | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [blockedByMe, setBlockedByMe] = useState(false);
  const [blockedByThem, setBlockedByThem] = useState(false);
  const [safetyDialog, setSafetyDialog] = useState<SafetyDialog>(null);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("profiles").select("*").eq("username", username).single(),
      supabase.auth.getUser(),
    ]).then(([profileRes, userRes]) => {
      if (profileRes.error || !profileRes.data) {
        setProfile(null);
        setLoading(false);
        return;
      }
      const p = normalizeProfile(profileRes.data as Profile);
      setProfile(p);
      setIsOwn(userRes.data.user?.id === p.id);
      setCurrentUserId(userRes.data.user?.id ?? null);
      setLoading(false);

      if (userRes.data.user && p.id !== userRes.data.user.id) {
        const userId = userRes.data.user.id;
        checkBlockBetween(userId, p.id).then((block) => {
          setBlockedByMe(block.blockedByMe);
          setBlockedByThem(block.blockedByThem);
        });

        supabase
          .from("chat_invites")
          .select("status")
          .eq("sender_id", userId)
          .eq("receiver_id", p.id)
          .maybeSingle()
          .then((r) => {
            if (r.data?.status === "pending") setExistingInvite("pending");
            else if (r.data?.status === "declined") setExistingInvite("declined");
          });

        supabase
          .from("collab_invites")
          .select("status")
          .eq("sender_id", userId)
          .eq("receiver_id", p.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
          .then((r) => {
            if (r.error) return;
            if (r.data?.status === "pending") setExistingCollabInvite("pending");
            else if (r.data) setExistingCollabInvite("responded");
          });
      }
    });
  }, [username]);

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setInviteError(null);
    setInviteSending(true);

    const blockCheck = await checkBlockBetween(user.id, profile.id);
    if (blockCheck.blockedByMe || blockCheck.blockedByThem) {
      setInviteError("This profile isn't available.");
      setInviteSending(false);
      return;
    }

    const existing = await supabase
      .from("chat_invites")
      .select("status")
      .eq("sender_id", user.id)
      .eq("receiver_id", profile.id)
      .maybeSingle();

    if (existing.data) {
      if (existing.data.status === "declined") {
        setInviteError("This invite wasn't accepted. You can't send another invite to this person.");
      } else {
        setInviteError("You already sent an invite. They haven't responded yet.");
      }
      setInviteSending(false);
      return;
    }

    const pending = await supabase.from("chat_invites").select("id").eq("sender_id", user.id).eq("status", "pending");
    if ((pending.data?.length ?? 0) >= MAX_PENDING) {
      setInviteError("You have 5 pending invites. Cancel one or wait for a response before sending more.");
      setInviteSending(false);
      return;
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recent = await supabase
      .from("chat_invites")
      .select("id")
      .eq("sender_id", user.id)
      .gte("created_at", since)
      .neq("status", "cancelled");
    if ((recent.data?.length ?? 0) >= MAX_PER_24H) {
      setInviteError("You can send 3 invites per 24 hours. Try again later.");
      setInviteSending(false);
      return;
    }

    const { error } = await supabase.from("chat_invites").insert({
      sender_id: user.id,
      receiver_id: profile.id,
      optional_message: inviteMessage.trim() || null,
      status: "pending",
    });

    setInviteSending(false);
    if (error) {
      setInviteError(error.message);
      return;
    }
    setExistingInvite("pending");
    setInviteOpen(false);
    setInviteMessage("");
  }

  async function sendCollabInvite() {
    if (!profile || !collabAbout) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCollabError(null);
    setCollabSending(true);

    const blockCheck = await checkBlockBetween(user.id, profile.id);
    if (blockCheck.blockedByMe || blockCheck.blockedByThem) {
      setCollabError("This profile isn't available.");
      setCollabSending(false);
      return;
    }

    const { error } = await supabase.from("collab_invites").insert({
      sender_id: user.id,
      receiver_id: profile.id,
      about: collabAbout,
      message: collabMessage.trim() || null,
      role: collabRole.trim() || null,
      pace: collabPace || null,
      status: "pending",
    });
    setCollabSending(false);
    if (error) {
      setCollabError(collabInviteError(error.message));
      return;
    }
    setExistingCollabInvite("pending");
    setCollabOpen(false);
    setCollabStep(1);
    setCollabAbout("");
    setCollabMessage("");
    setCollabRole("");
    setCollabPace("");
  }

  if (loading) return <p className="text-muted">Loading…</p>;
  if (!profile) {
    return (
      <div>
        <p className="text-muted">Profile not found.</p>
        <Link href="/explore" className="mt-4 inline-block text-foreground underline hover:no-underline">← Explore</Link>
      </div>
    );
  }

  if (isOwn) {
    router.replace("/profile");
    return null;
  }

  const displayName = profile.first_name ?? profile.username ?? "this person";

  if (blockedByThem) {
    return (
      <div>
        <p className="text-muted">This profile isn&apos;t available.</p>
        <Link href="/explore" className="mt-4 inline-block text-foreground underline hover:no-underline">← Explore</Link>
      </div>
    );
  }

  if (blockedByMe) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-foreground/10 bg-white/50 p-5">
          <p className="text-foreground font-medium">You&apos;ve blocked {displayName}.</p>
          <p className="mt-2 text-sm text-muted">
            They won&apos;t appear in search or Explore, and you can&apos;t message each other.
          </p>
          {currentUserId && (
            <div className="mt-4">
              <button
                type="button"
                onClick={async () => {
                  const result = await unblockUser(currentUserId, profile.id);
                  if (!result.error) setBlockedByMe(false);
                }}
                className="text-sm text-muted hover:text-foreground"
              >
                Unblock
              </button>
            </div>
          )}
        </div>
        <Link href="/settings" className="text-sm text-muted hover:text-foreground">
          Manage blocked people in Settings →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-foreground/10 bg-white/50 p-5">
        <ProfileDisplay profile={profile} />
      </div>

      <p className="text-sm text-muted">No cold DMs. Start with an invite.</p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => { setInviteOpen(true); setInviteError(null); }}
          disabled={existingInvite === "pending" || existingInvite === "declined"}
          className="rounded-md border border-foreground/30 px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {existingInvite === "pending" ? "Invite sent" : existingInvite === "declined" ? "Invite wasn't accepted" : "Invite to chat"}
        </button>
        <button
          type="button"
          onClick={() => { setCollabOpen(true); setCollabError(null); setCollabStep(1); }}
          disabled={existingCollabInvite === "pending"}
          className="rounded-md border border-foreground/30 px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {existingCollabInvite === "pending" ? "Collab invite sent" : "Invite to collaborate"}
        </button>
      </div>

      {currentUserId && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          {!blockedByMe ? (
            <button
              type="button"
              onClick={() => setSafetyDialog("block")}
              className="text-muted hover:text-foreground underline-offset-2 hover:underline"
            >
              Block
            </button>
          ) : null}
          {!blockedByMe && (
            <button
              type="button"
              onClick={() => setSafetyDialog("report")}
              className="text-muted hover:text-foreground underline-offset-2 hover:underline"
            >
              Report
            </button>
          )}
        </div>
      )}

      {currentUserId && (
        <UserSafetyActions
          currentUserId={currentUserId}
          reportedUserId={profile.id}
          reportedUserName={displayName}
          showTriggers={false}
          dialog={safetyDialog}
          onDialogChange={setSafetyDialog}
          blockedByMe={blockedByMe}
          onBlocked={() => setBlockedByMe(true)}
          onUnblocked={() => setBlockedByMe(false)}
        />
      )}

      {collabOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" aria-modal="true" role="dialog">
          <div className="bg-ethereal border border-foreground/10 rounded-lg shadow-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="font-serif text-lg font-medium text-foreground">Invite to collaborate</h2>
            {collabStep === 1 && (
              <>
                <p className="mt-2 text-sm text-muted">What&apos;s this about?</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {COLLAB_ABOUT_OPTIONS.map((opt) => (
                    <button key={opt} type="button" onClick={() => { setCollabAbout(opt); setCollabStep(2); }} className="rounded-md border border-foreground/30 px-3 py-1.5 text-sm text-foreground hover:bg-foreground/5">{opt}</button>
                  ))}
                </div>
              </>
            )}
            {collabStep === 2 && (
              <>
                <p className="mt-2 text-sm text-muted">Short invitation (optional)</p>
                <textarea value={collabMessage} onChange={(e) => setCollabMessage(e.target.value)} rows={3} className="mt-2 w-full rounded-md border border-foreground/20 bg-white px-3 py-2 text-foreground placeholder:text-muted" placeholder="A sentence or two." />
                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={() => setCollabStep(1)} className="rounded-md border border-foreground/30 px-3 py-1.5 text-sm text-muted">Back</button>
                  <button type="button" onClick={() => setCollabStep(3)} className="rounded-md bg-foreground px-3 py-1.5 text-sm text-background">Next</button>
                </div>
              </>
            )}
            {collabStep === 3 && (
              <>
                <p className="mt-2 text-sm text-muted">Your role(s)</p>
                <input type="text" value={collabRole} onChange={(e) => setCollabRole(e.target.value)} placeholder="e.g. songwriter, producer" className="mt-2 w-full rounded-md border border-foreground/20 bg-white px-3 py-2 text-foreground placeholder:text-muted" />
                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={() => setCollabStep(2)} className="rounded-md border border-foreground/30 px-3 py-1.5 text-sm text-muted">Back</button>
                  <button type="button" onClick={() => setCollabStep(4)} className="rounded-md bg-foreground px-3 py-1.5 text-sm text-background">Next</button>
                </div>
              </>
            )}
            {collabStep === 4 && (
              <>
                <p className="mt-2 text-sm text-muted">Pace</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(["low-pressure", "structured", "flexible"] as const).map((p) => (
                    <button key={p} type="button" onClick={() => setCollabPace(p)} className={`rounded-md border px-3 py-1.5 text-sm ${collabPace === p ? "border-foreground bg-foreground/10 text-foreground" : "border-foreground/30 text-muted hover:text-foreground"}`}>{PACE_LABELS[p]}</button>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={() => setCollabStep(3)} className="rounded-md border border-foreground/30 px-3 py-1.5 text-sm text-muted">Back</button>
                  <button type="button" onClick={() => setCollabStep(5)} className="rounded-md bg-foreground px-3 py-1.5 text-sm text-background">Next</button>
                </div>
              </>
            )}
            {collabStep === 5 && (
              <>
                <div className="mt-2 text-sm text-muted space-y-1">
                  <p><strong className="text-foreground">About:</strong> {collabAbout}</p>
                  {collabMessage && <p><strong className="text-foreground">Message:</strong> {collabMessage}</p>}
                  {collabRole && <p><strong className="text-foreground">Your role:</strong> {collabRole}</p>}
                  {collabPace && <p><strong className="text-foreground">Pace:</strong> {PACE_LABELS[collabPace]}</p>}
                </div>
                {collabError && <p className="mt-2 text-sm text-red-600">{collabError}</p>}
                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={() => setCollabStep(4)} className="rounded-md border border-foreground/30 px-3 py-1.5 text-sm text-muted">Back</button>
                  <button type="button" onClick={sendCollabInvite} disabled={collabSending} className="rounded-md bg-foreground px-3 py-1.5 text-sm text-background disabled:opacity-50">{collabSending ? "Sending…" : "Send invite"}</button>
                </div>
              </>
            )}
            <button type="button" onClick={() => { setCollabOpen(false); setCollabError(null); }} className="mt-4 block text-sm text-muted hover:text-foreground">Close</button>
          </div>
        </div>
      )}

      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" aria-modal="true" role="dialog">
          <div className="bg-ethereal border border-foreground/10 rounded-lg shadow-lg max-w-md w-full p-6">
            <h2 className="font-serif text-lg font-medium text-foreground">Invite to chat</h2>
            <p className="mt-2 text-sm text-muted">No obligation. They can accept or say it's not a fit.</p>
            <form onSubmit={sendInvite} className="mt-4 space-y-4">
              <label className="block">
                <span className="text-sm text-muted">Optional message (e.g. why you're reaching out)</span>
                <textarea
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full rounded-md border border-foreground/20 bg-white px-3 py-2 text-foreground placeholder:text-muted focus:border-foreground/40 focus:outline-none"
                  placeholder="Say something short, or leave blank."
                />
              </label>
              {inviteError && <p className="text-sm text-red-600">{inviteError}</p>}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={inviteSending}
                  className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
                >
                  {inviteSending ? "Sending…" : "Send invite"}
                </button>
                <button
                  type="button"
                  onClick={() => { setInviteOpen(false); setInviteError(null); }}
                  className="rounded-md border border-foreground/30 px-4 py-2 text-sm text-muted hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
