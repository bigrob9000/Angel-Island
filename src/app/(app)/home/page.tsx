"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import type { Profile, Room } from "@/lib/types";
import { normalizeProfile } from "@/lib/types";
import { useInbox } from "@/components/InboxProvider";
import { loadBlockedUserIds } from "@/lib/blocks";
import { isDiscoverableProfile } from "@/lib/profile";
import { getOptionalProfileCompleteness } from "@/lib/profile-completeness";
import { isOnboardingCompleteFromProfile } from "@/lib/onboarding";
import { rankProfilesForViewer } from "@/lib/discovery";
import { ProfileCard } from "@/components/ProfileCard";
import { SearchBar } from "@/components/SearchBar";
import { ConversationPreviewLink } from "@/components/ConversationPreviewLink";
import { EmptyState } from "@/components/EmptyState";
import { GettingStartedGuide } from "@/components/GettingStartedGuide";
import { IphonePwaHint } from "@/components/IphonePwaHint";
import { AndroidInstallHint } from "@/components/AndroidInstallHint";
import { ProfileCompletenessNudge } from "@/components/ProfileCompletenessNudge";
import { CollaborationPreviewLink } from "@/components/CollaborationPreviewLink";
import { useCollab } from "@/components/CollabProvider";
import { loadCollaborationPreviews, type CollaborationPreview } from "@/lib/collaborations";

export default function HomePage() {
  const [firstName, setFirstName] = useState<string | null>(null);
  const [viewerProfile, setViewerProfile] = useState<Profile | null>(null);
  const [myRooms, setMyRooms] = useState<Room[]>([]);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [people, setPeople] = useState<ReturnType<typeof rankProfilesForViewer>>([]);
  const [activeCollabs, setActiveCollabs] = useState<CollaborationPreview[]>([]);
  const [homeReady, setHomeReady] = useState(false);
  const { conversations, loading: conversationsLoading } = useInbox();
  const { collaborations: trackedCollabs } = useCollab();
  const recentConversations = conversations.slice(0, 5);

  const collabUnreadById = useMemo(() => {
    const map: Record<string, boolean> = {};
    trackedCollabs.forEach((collab) => {
      if (collab.unread) map[collab.id] = true;
    });
    return map;
  }, [trackedCollabs]);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    void (async () => {
      setHomeReady(false);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;

      const name = user?.user_metadata?.first_name ?? user?.email?.split("@")[0] ?? null;
      setFirstName(name ?? null);

      if (!user) {
        setHomeReady(true);
        return;
      }

      const [peopleRes, viewerRes, { blockedIds }, collabResult, roomMembersRes] =
        await Promise.all([
          supabase.from("profiles").select("*").neq("id", user.id),
          supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
          loadBlockedUserIds(user.id),
          loadCollaborationPreviews(user.id, "active"),
          supabase.from("room_members").select("room_id").eq("user_id", user.id),
        ]);

      if (cancelled) return;

      const viewer = viewerRes.data ? normalizeProfile(viewerRes.data as Profile) : null;
      setViewerProfile(viewer);
      setOnboardingDone(isOnboardingCompleteFromProfile(viewer));

      const candidates = (peopleRes.data ?? [])
        .map((row) => normalizeProfile(row as Profile))
        .filter(isDiscoverableProfile)
        .filter((profile) => !blockedIds.has(profile.id));

      setPeople(rankProfilesForViewer(viewer, candidates).slice(0, 5));
      setActiveCollabs(collabResult.previews.slice(0, 3));

      const roomIds = (roomMembersRes.data ?? []).map((row) => row.room_id);
      if (roomIds.length === 0) {
        setMyRooms([]);
      } else {
        const roomsRes = await supabase.from("rooms").select("*").in("id", roomIds).order("name");
        if (!cancelled) {
          setMyRooms(roomsRes.data ?? []);
        }
      }

      if (!cancelled) {
        setHomeReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const welcomeName = firstName ? `, ${firstName}` : "";
  const optionalComplete = viewerProfile
    ? getOptionalProfileCompleteness(viewerProfile).isComplete
    : true;
  const hasConnected = conversations.length > 0;
  const hasCollabs = activeCollabs.length > 0;
  const gettingStartedComplete =
    optionalComplete && myRooms.length > 0 && hasConnected && hasCollabs;
  const homeDataReady = homeReady && !conversationsLoading;
  const showGettingStarted =
    homeDataReady && onboardingDone && Boolean(viewerProfile) && !gettingStartedComplete;

  return (
    <div className="space-y-10">
      <SearchBar />

      <p className="page-lead">
        Welcome back{welcomeName}. Where would you like to spend your time today?
      </p>

      <GettingStartedGuide
        show={showGettingStarted}
        profile={viewerProfile}
        hasRooms={myRooms.length > 0}
        hasConnected={hasConnected}
        hasCollabs={hasCollabs}
      />

      {homeDataReady && viewerProfile && (
        <ProfileCompletenessNudge profile={viewerProfile} />
      )}

      <IphonePwaHint />
      <AndroidInstallHint />

      <section>
        <h2 className="section-heading">Your Spaces</h2>
        <p className="section-copy">
          Rooms you&apos;ve added. No obligation to post — just a place to return to.
        </p>
        {myRooms.length === 0 ? (
          <EmptyState
            className="mt-4"
            title="No spaces yet."
            description="Rooms are calm corners for listening, learning, and collab posts. Add one when something catches your eye."
          >
            <Link href="/rooms" className="btn-secondary">
              Explore rooms
            </Link>
          </EmptyState>
        ) : (
          <ul className="mt-4 space-y-2">
            {myRooms.map((room) => (
              <li key={room.id}>
                <Link
                  href={`/rooms/${room.slug}`}
                  className="surface-interactive block px-4 py-3 text-foreground"
                >
                  <span className="font-medium">{room.name}</span>
                  {room.description && (
                    <span className="mt-1 block text-sm text-muted">{room.description}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="section-heading">Explore</h2>
          <Link href="/explore" className="text-sm text-muted hover:text-foreground shrink-0">
            See all
          </Link>
        </div>
        <p className="section-copy">
          People you might want to spend time with — shared genres, roles, and interests when we
          can see them.
        </p>
        {people.length === 0 ? (
          <EmptyState
            className="mt-4"
            title="You're the first one here — or almost."
            description="As others join, they'll show up here. You can browse Explore anytime."
          >
            <Link href="/explore" className="btn-secondary">
              Explore people
            </Link>
          </EmptyState>
        ) : (
          <ul className="mt-4 space-y-3">
            {people.map((profile) => (
              <li key={profile.id}>
                <ProfileCard profile={profile} reason={profile.reason ?? undefined} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="section-heading">Conversations</h2>
          {recentConversations.length > 0 && (
            <Link href="/messages" className="text-sm text-muted hover:text-foreground shrink-0">
              See all
            </Link>
          )}
        </div>
        <p className="section-copy">
          Chats and collab threads you&apos;re part of.
        </p>
        {conversationsLoading ? (
          <p className="mt-4 text-sm text-muted">Loading…</p>
        ) : recentConversations.length === 0 ? (
          <EmptyState
            className="mt-4"
            title="No conversations yet."
            description="Messages start with an invite — send one from someone's profile, or wait for one to arrive."
          >
            <Link href="/explore" className="btn-secondary">
              Explore people
            </Link>
            <Link href="/messages" className="btn-secondary">
              Open Messages
            </Link>
          </EmptyState>
        ) : (
          <ul className="mt-4 space-y-2">
            {recentConversations.map((conv) => (
              <li key={conv.id}>
                <ConversationPreviewLink conversation={conv} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="section-heading">Collaborations</h2>
          <Link href="/collaborations" className="text-sm text-muted hover:text-foreground shrink-0">
            See all
          </Link>
        </div>
        <p className="section-copy">
          Shared spaces for projects you&apos;re exploring with other people.
        </p>
        {activeCollabs.length === 0 ? (
          <EmptyState
            className="mt-4"
            title="No active collaborations yet."
            description="When someone responds interested to a collab invite, a shared workspace opens here for notes, links, and next steps."
          >
            <Link href="/explore" className="btn-secondary">
              Explore people
            </Link>
            <Link href="/collaborations" className="btn-secondary">
              View Collabs
            </Link>
          </EmptyState>
        ) : (
          <ul className="mt-4 space-y-3">
            {activeCollabs.map((preview) => (
              <li key={preview.id}>
                <CollaborationPreviewLink
                  preview={preview}
                  showActions
                  unread={Boolean(collabUnreadById[preview.id])}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-t border-foreground/5 pt-8">
        <p className="text-sm text-muted mb-4">Invitations only — no pressure.</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/rooms/collaborate?compose=collab_invite" className="btn-secondary">
            Start a collab post
          </Link>
          <Link href="/rooms/learn?compose=question" className="btn-secondary">
            Ask a question
          </Link>
          <Link href="/rooms/listen?compose=share_work" className="btn-secondary">
            Share what you&apos;re working on
          </Link>
        </div>
      </section>
    </div>
  );
}
