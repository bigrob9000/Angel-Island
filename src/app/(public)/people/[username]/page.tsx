"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { findOpenCollaborationBetweenUsers } from "@/lib/collaborations";
import type { Profile } from "@/lib/types";
import { normalizeProfile } from "@/lib/types";
import type { CollabPace } from "@/lib/types";
import { ProfileDisplay } from "@/components/ProfileDisplay";
import { ProfileListenShares } from "@/components/ProfileListenShares";
import { ProfileRoomShell } from "@/components/ProfileRoomShell";
import { RoomDiscoveryBanner } from "@/components/RoomDiscoveryBanner";
import { UserSafetyActions, type SafetyDialog } from "@/components/UserSafetyActions";
import { loadRecentListenShares, type ProfileListenShare } from "@/lib/profile-shares";
import { checkBlockBetween, unblockUser } from "@/lib/blocks";
import {
  parseRoomProfileContext,
  postPreviewText,
  suggestedInviteMessageFromRoom,
} from "@/lib/room-context";
import { NotFoundPanel } from "@/components/NotFoundPanel";
import { PageLoading } from "@/components/PageLoading";
import { translatePace, type TranslateFn } from "@/lib/i18n/labels";

const MAX_PENDING = 5;
const COLLAB_ABOUT_OPTIONS = ["Co-writing", "Production", "Jam session", "Learning", "Other"] as const;
const COLLAB_ABOUT_KEYS: Record<(typeof COLLAB_ABOUT_OPTIONS)[number], string> = {
  "Co-writing": "collabAbout.coWriting",
  Production: "collabAbout.production",
  "Jam session": "collabAbout.jamSession",
  Learning: "collabAbout.learning",
  Other: "collabAbout.other",
};
const MAX_PER_24H = 3;

function collabInviteError(message: string, t: TranslateFn): string {
  if (message.includes("collab_invites") || message.includes("Could not find the table")) {
    return t("errors.collabInvitesNotSetup");
  }
  return message;
}

function PublicProfilePageContent() {
  const t = useTranslations("people");
  const tc = useTranslations("common");
  const tPace = useTranslations("pace");
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const username = params.username as string;
  const roomContext = parseRoomProfileContext(searchParams);
  const openInviteFromUrl = searchParams.get("invite") === "1";
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
  const [openCollaborationId, setOpenCollaborationId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [blockedByMe, setBlockedByMe] = useState(false);
  const [blockedByThem, setBlockedByThem] = useState(false);
  const [safetyDialog, setSafetyDialog] = useState<SafetyDialog>(null);
  const [listenShares, setListenShares] = useState<ProfileListenShare[]>([]);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [roomPostPreview, setRoomPostPreview] = useState<string | null>(null);
  const [invitePrefillApplied, setInvitePrefillApplied] = useState(false);

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
      void loadRecentListenShares(p.id).then(setListenShares);
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

        findOpenCollaborationBetweenUsers(userId, p.id).then((match) => {
          setOpenCollaborationId(match?.collaborationId ?? null);
        });
      }
    });
  }, [username]);

  useEffect(() => {
    if (!roomContext) {
      setRoomName(null);
      setRoomPostPreview(null);
      return;
    }

    const supabase = createClient();
    void supabase
      .from("rooms")
      .select("name")
      .eq("slug", roomContext.roomSlug)
      .maybeSingle()
      .then(({ data }) => {
        setRoomName(data?.name ?? roomContext.roomSlug);
      });

    if (!roomContext.postId) {
      setRoomPostPreview(null);
      return;
    }

    void supabase
      .from("posts")
      .select("body, title")
      .eq("id", roomContext.postId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) {
          setRoomPostPreview(null);
          return;
        }
        const text = data.body?.trim() || data.title?.trim() || "";
        setRoomPostPreview(text ? postPreviewText(text) : null);
      });
  }, [roomContext]);

  useEffect(() => {
    if (!roomContext || !roomName || invitePrefillApplied || loading || !profile || isOwn) return;

    const suggested = suggestedInviteMessageFromRoom(roomName, {
      roomSlug: roomContext.roomSlug,
      postPreview: roomPostPreview,
    });

    setInviteMessage((current) => current || suggested);
    if (openInviteFromUrl) {
      setInviteOpen(true);
    }
    setInvitePrefillApplied(true);
  }, [
    roomContext,
    roomName,
    roomPostPreview,
    openInviteFromUrl,
    invitePrefillApplied,
    loading,
    profile,
    isOwn,
  ]);

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
      setInviteError(t("errors.profileUnavailable"));
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
        setInviteError(t("errors.inviteDeclined"));
      } else {
        setInviteError(t("errors.invitePending"));
      }
      setInviteSending(false);
      return;
    }

    const pending = await supabase.from("chat_invites").select("id").eq("sender_id", user.id).eq("status", "pending");
    if ((pending.data?.length ?? 0) >= MAX_PENDING) {
      setInviteError(t("errors.tooManyPending"));
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
      setInviteError(t("errors.rateLimit"));
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
      setCollabError(t("errors.profileUnavailable"));
      setCollabSending(false);
      return;
    }

    const openCollab = await findOpenCollaborationBetweenUsers(user.id, profile.id);
    if (openCollab) {
      setOpenCollaborationId(openCollab.collaborationId);
      setCollabError(t("errors.openCollabExists"));
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
      setCollabError(collabInviteError(error.message, t));
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

  if (loading) return <PageLoading />;
  if (!profile) {
    return (
      <NotFoundPanel
        title={t("notFoundTitle")}
        description={t("notFoundDescription")}
        backHref="/"
        backLabel={t("backToAbout")}
      />
    );
  }

  if (isOwn && currentUserId) {
    router.replace("/profile");
    return null;
  }

  const displayName = profile.first_name ?? profile.username ?? t("defaultName");

  if (blockedByThem) {
    return (
      <div>
        <p className="text-muted">{t("profileUnavailable")}</p>
        <Link href="/explore" className="mt-4 inline-block text-foreground underline hover:no-underline">{t("backToExplore")}</Link>
      </div>
    );
  }

  if (blockedByMe) {
    return (
      <div className="space-y-6">
        <div className="surface p-5">
          <p className="text-foreground font-medium">{t("blockedTitle", { name: displayName })}</p>
          <p className="mt-2 text-sm text-muted">{t("blockedCopy")}</p>
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
                {tc("unblock")}
              </button>
            </div>
          )}
        </div>
        <Link href="/settings" className="text-sm text-muted hover:text-foreground">
          {t("manageBlocked")}
        </Link>
      </div>
    );
  }

  return (
    <ProfileRoomShell profile={profile}>
      {roomContext && roomName && (
        <RoomDiscoveryBanner
          roomName={roomName}
          roomSlug={roomContext.roomSlug}
          postId={roomContext.postId}
          postPreview={roomPostPreview}
          authorName={displayName}
        />
      )}

      <div className="surface p-5">
        <ProfileDisplay profile={profile} />
      </div>

      <ProfileListenShares shares={listenShares} />

      {!currentUserId ? (
        <div className="surface p-5 space-y-3">
          <p className="text-sm text-muted">{t("signInPrompt", { name: displayName })}</p>
          <Link
            href="/sign-in"
            className="inline-block rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
          >
            {t("signInToConnect")}
          </Link>
        </div>
      ) : (
        <>
      <p className="text-sm text-muted">{t("noColdDms")}</p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => { setInviteOpen(true); setInviteError(null); }}
          disabled={existingInvite === "pending" || existingInvite === "declined"}
          className="rounded-md border border-foreground/30 px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {existingInvite === "pending" ? t("inviteSent") : existingInvite === "declined" ? t("inviteDeclined") : t("inviteToChat")}
        </button>
        {openCollaborationId ? (
          <Link
            href={`/collaborations/${openCollaborationId}`}
            className="rounded-md border border-foreground/30 px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5"
          >
            {t("openCollaboration")}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => { setCollabOpen(true); setCollabError(null); setCollabStep(1); }}
            disabled={existingCollabInvite === "pending"}
            className="rounded-md border border-foreground/30 px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {existingCollabInvite === "pending" ? t("collabInviteSent") : t("inviteToCollaborate")}
          </button>
        )}
      </div>

      {currentUserId && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          {!blockedByMe ? (
            <button
              type="button"
              onClick={() => setSafetyDialog("block")}
              className="text-muted hover:text-foreground underline-offset-2 hover:underline"
            >
              {tc("block")}
            </button>
          ) : null}
          {!blockedByMe && (
            <button
              type="button"
              onClick={() => setSafetyDialog("report")}
              className="text-muted hover:text-foreground underline-offset-2 hover:underline"
            >
              {tc("report")}
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
            <h2 className="font-serif text-lg font-medium text-foreground">{t("inviteToCollaborate")}</h2>
            {collabStep === 1 && (
              <>
                <p className="mt-2 text-sm text-muted">{t("collabAboutPrompt")}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {COLLAB_ABOUT_OPTIONS.map((opt) => (
                    <button key={opt} type="button" onClick={() => { setCollabAbout(opt); setCollabStep(2); }} className="rounded-md border border-foreground/30 px-3 py-1.5 text-sm text-foreground hover:bg-foreground/5">{t(COLLAB_ABOUT_KEYS[opt])}</button>
                  ))}
                </div>
              </>
            )}
            {collabStep === 2 && (
              <>
                <p className="mt-2 text-sm text-muted">{t("collabMessageLabel")}</p>
                <textarea value={collabMessage} onChange={(e) => setCollabMessage(e.target.value)} rows={3} className="mt-2 w-full rounded-md border border-foreground/20 bg-white px-3 py-2 text-foreground placeholder:text-muted" placeholder={t("collabMessagePlaceholder")} />
                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={() => setCollabStep(1)} className="rounded-md border border-foreground/30 px-3 py-1.5 text-sm text-muted">{t("back")}</button>
                  <button type="button" onClick={() => setCollabStep(3)} className="rounded-md bg-foreground px-3 py-1.5 text-sm text-background">{t("next")}</button>
                </div>
              </>
            )}
            {collabStep === 3 && (
              <>
                <p className="mt-2 text-sm text-muted">{t("collabRoleLabel")}</p>
                <input type="text" value={collabRole} onChange={(e) => setCollabRole(e.target.value)} placeholder={t("collabRolePlaceholder")} className="mt-2 w-full rounded-md border border-foreground/20 bg-white px-3 py-2 text-foreground placeholder:text-muted" />
                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={() => setCollabStep(2)} className="rounded-md border border-foreground/30 px-3 py-1.5 text-sm text-muted">{t("back")}</button>
                  <button type="button" onClick={() => setCollabStep(4)} className="rounded-md bg-foreground px-3 py-1.5 text-sm text-background">{t("next")}</button>
                </div>
              </>
            )}
            {collabStep === 4 && (
              <>
                <p className="mt-2 text-sm text-muted">{t("collabPaceLabel")}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(["low-pressure", "structured", "flexible"] as const).map((p) => (
                    <button key={p} type="button" onClick={() => setCollabPace(p)} className={`rounded-md border px-3 py-1.5 text-sm ${collabPace === p ? "border-foreground bg-foreground/10 text-foreground" : "border-foreground/30 text-muted hover:text-foreground"}`}>{translatePace(p, tPace)}</button>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={() => setCollabStep(3)} className="rounded-md border border-foreground/30 px-3 py-1.5 text-sm text-muted">{t("back")}</button>
                  <button type="button" onClick={() => setCollabStep(5)} className="rounded-md bg-foreground px-3 py-1.5 text-sm text-background">{t("next")}</button>
                </div>
              </>
            )}
            {collabStep === 5 && (
              <>
                <div className="mt-2 text-sm text-muted space-y-1">
                  <p><strong className="text-foreground">{t("reviewAbout")}</strong> {COLLAB_ABOUT_OPTIONS.includes(collabAbout as (typeof COLLAB_ABOUT_OPTIONS)[number]) ? t(COLLAB_ABOUT_KEYS[collabAbout as (typeof COLLAB_ABOUT_OPTIONS)[number]]) : collabAbout}</p>
                  {collabMessage && <p><strong className="text-foreground">{t("reviewMessage")}</strong> {collabMessage}</p>}
                  {collabRole && <p><strong className="text-foreground">{t("reviewRole")}</strong> {collabRole}</p>}
                  {collabPace && <p><strong className="text-foreground">{t("reviewPace")}</strong> {translatePace(collabPace, tPace)}</p>}
                </div>
                {collabError && <p className="mt-2 text-sm text-red-600">{collabError}</p>}
                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={() => setCollabStep(4)} className="rounded-md border border-foreground/30 px-3 py-1.5 text-sm text-muted">{t("back")}</button>
                  <button type="button" onClick={sendCollabInvite} disabled={collabSending} className="rounded-md bg-foreground px-3 py-1.5 text-sm text-background disabled:opacity-50">{collabSending ? tc("sending") : t("sendInvite")}</button>
                </div>
              </>
            )}
            <button type="button" onClick={() => { setCollabOpen(false); setCollabError(null); }} className="mt-4 block text-sm text-muted hover:text-foreground">{t("close")}</button>
          </div>
        </div>
      )}

      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" aria-modal="true" role="dialog">
          <div className="bg-ethereal border border-foreground/10 rounded-lg shadow-lg max-w-md w-full p-6">
            <h2 className="font-serif text-lg font-medium text-foreground">{t("inviteToChat")}</h2>
            <p className="mt-2 text-sm text-muted">{t("inviteChatCopy")}</p>
            <form onSubmit={sendInvite} className="mt-4 space-y-4">
              <label className="block">
                <span className="text-sm text-muted">{t("inviteMessageLabel")}</span>
                <textarea
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full rounded-md border border-foreground/20 bg-white px-3 py-2 text-foreground placeholder:text-muted focus:border-foreground/40 focus:outline-none"
                  placeholder={t("inviteMessagePlaceholder")}
                />
              </label>
              {inviteError && <p className="text-sm text-red-600">{inviteError}</p>}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={inviteSending}
                  className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
                >
                  {inviteSending ? tc("sending") : t("sendInvite")}
                </button>
                <button
                  type="button"
                  onClick={() => { setInviteOpen(false); setInviteError(null); }}
                  className="rounded-md border border-foreground/30 px-4 py-2 text-sm text-muted hover:text-foreground"
                >
                  {tc("cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </>
      )}
      <div className="pb-8" />
    </ProfileRoomShell>
  );
}

export default function PublicProfilePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <PublicProfilePageContent />
    </Suspense>
  );
}
