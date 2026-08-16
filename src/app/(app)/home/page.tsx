"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import type { Profile, Room } from "@/lib/types";
import { normalizeProfile } from "@/lib/types";
import { useInbox } from "@/components/InboxProvider";
import { loadBlockedUserIds } from "@/lib/blocks";
import { isDiscoverableProfile } from "@/lib/profile";
import { getOptionalProfileCompleteness } from "@/lib/profile-completeness";
import { isOnboardingComplete } from "@/lib/onboarding";
import { rankProfilesForViewer } from "@/lib/discovery";
import { ProfileCard } from "@/components/ProfileCard";
import { SearchBar } from "@/components/SearchBar";
import { ConversationPreviewLink } from "@/components/ConversationPreviewLink";
import { EmptyState } from "@/components/EmptyState";
import { GettingStartedGuide } from "@/components/GettingStartedGuide";
import { ProfileCompletenessNudge } from "@/components/ProfileCompletenessNudge";
import { CollaborationPreviewLink } from "@/components/CollaborationPreviewLink";
import { loadCollaborationPreviews, type CollaborationPreview } from "@/lib/collaborations";

export default function HomePage() {
  const [firstName, setFirstName] = useState<string | null>(null);
  const [viewerProfile, setViewerProfile] = useState<Profile | null>(null);
  const [myRooms, setMyRooms] = useState<Room[]>([]);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [people, setPeople] = useState<ReturnType<typeof rankProfilesForViewer>>([]);
  const [activeCollabs, setActiveCollabs] = useState<CollaborationPreview[]>([]);
  const { conversations, loading: conversationsLoading } = useInbox();
  const recentConversations = conversations.slice(0, 5);

  useEffect(() => {
    setOnboardingDone(isOnboardingComplete());
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      const name = user?.user_metadata?.first_name ?? user?.email?.split("@")[0] ?? null;
      setFirstName(name ?? null);

      if (!user) {
        return;
      }

      const [peopleRes, viewerRes, { blockedIds }] = await Promise.all([
        supabase.from("profiles").select("*").neq("id", user.id),
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        loadBlockedUserIds(user.id),
      ]);

      const viewer = viewerRes.data ? normalizeProfile(viewerRes.data as Profile) : null;
      setViewerProfile(viewer);

      const candidates = (peopleRes.data ?? [])
        .map((row) => normalizeProfile(row as Profile))
        .filter(isDiscoverableProfile)
        .filter((profile) => !blockedIds.has(profile.id));

      setPeople(rankProfilesForViewer(viewer, candidates).slice(0, 5));

      const collabResult = await loadCollaborationPreviews(user.id, "active");
      setActiveCollabs(collabResult.previews.slice(0, 3));

      supabase
        .from("room_members")
        .select("room_id")
        .eq("user_id", user.id)
        .then((res) => {
          const ids = (res.data ?? []).map((r) => r.room_id);
          if (ids.length === 0) {
            setMyRooms([]);
            return;
          }
          supabase
            .from("rooms")
            .select("*")
            .in("id", ids)
            .order("name")
            .then((roomsRes) => setMyRooms(roomsRes.data ?? []));
        });
    });
  }, []);

  const welcomeName = firstName ? `, ${firstName}` : "";
  const optionalComplete = viewerProfile
    ? getOptionalProfileCompleteness(viewerProfile).isComplete
    : true;
  const hasConnected = conversations.length > 0;
  const hasCollabs = activeCollabs.length > 0;
  const gettingStartedComplete =
    optionalComplete && myRooms.length > 0 && hasConnected && hasCollabs;
  const showGettingStarted =
    onboardingDone && Boolean(viewerProfile) && !gettingStartedComplete;

  return (
    <div className="space-y-10">
      <SearchBar />

      <p className="font-serif text-xl text-foreground sm:text-2xl">
        Welcome back{welcomeName}. Where would you like to spend your time today?
      </p>

      <GettingStartedGuide
        show={showGettingStarted}
        profile={viewerProfile}
        hasRooms={myRooms.length > 0}
        hasConnected={hasConnected}
        hasCollabs={hasCollabs}
      />

      {viewerProfile && <ProfileCompletenessNudge profile={viewerProfile} />}

      <section>
        <h2 className="font-serif text-lg font-medium text-foreground">Your Spaces</h2>
        <p className="mt-2 text-sm text-muted">
          Rooms you&apos;ve added. No obligation to post — just a place to return to.
        </p>
        {myRooms.length === 0 ? (
          <EmptyState
            className="mt-4"
            title="No spaces yet."
            description="Rooms are calm corners for listening, learning, and collab posts. Add one when something catches your eye."
          >
            <Link
              href="/rooms"
              className="rounded-md border border-foreground/30 px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5"
            >
              Explore rooms
            </Link>
          </EmptyState>
        ) : (
          <ul className="mt-4 space-y-2">
            {myRooms.map((room) => (
              <li key={room.id}>
                <Link
                  href={`/rooms/${room.slug}`}
                  className="block rounded-lg border border-foreground/10 bg-white/40 px-4 py-3 text-foreground hover:bg-white/60"
                >
                  <span className="font-medium">{room.name}</span>
                  {room.description && <span className="ml-2 text-sm text-muted">— {room.description}</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-serif text-lg font-medium text-foreground">Explore</h2>
          <Link href="/explore" className="text-sm text-muted hover:text-foreground shrink-0">
            See all
          </Link>
        </div>
        <p className="mt-2 text-sm text-muted">
          People you might want to spend time with — shared genres, roles, and interests when we
          can see them.
        </p>
        {people.length === 0 ? (
          <EmptyState
            className="mt-4"
            title="You're the first one here — or almost."
            description="As others join, they'll show up here. You can browse Explore anytime."
          >
            <Link
              href="/explore"
              className="rounded-md border border-foreground/30 px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5"
            >
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
          <h2 className="font-serif text-lg font-medium text-foreground">Conversations</h2>
          {recentConversations.length > 0 && (
            <Link href="/messages" className="text-sm text-muted hover:text-foreground shrink-0">
              See all
            </Link>
          )}
        </div>
        <p className="mt-2 text-sm text-muted">
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
            <Link
              href="/explore"
              className="rounded-md border border-foreground/30 px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5"
            >
              Explore people
            </Link>
            <Link
              href="/messages"
              className="rounded-md border border-foreground/30 px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5"
            >
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
          <h2 className="font-serif text-lg font-medium text-foreground">Collaborations</h2>
          <Link href="/collaborations" className="text-sm text-muted hover:text-foreground shrink-0">
            See all
          </Link>
        </div>
        <p className="mt-2 text-sm text-muted">
          Shared spaces for projects you&apos;re exploring with other people.
        </p>
        {activeCollabs.length === 0 ? (
          <EmptyState
            className="mt-4"
            title="No active collaborations yet."
            description="When someone responds interested to a collab invite, a shared workspace opens here for notes, links, and next steps."
          >
            <Link
              href="/explore"
              className="rounded-md border border-foreground/30 px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5"
            >
              Explore people
            </Link>
            <Link
              href="/collaborations"
              className="rounded-md border border-foreground/30 px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5"
            >
              View Collabs
            </Link>
          </EmptyState>
        ) : (
          <ul className="mt-4 space-y-3">
            {activeCollabs.map((preview) => (
              <li key={preview.id}>
                <CollaborationPreviewLink preview={preview} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-t border-foreground/10 pt-8">
        <p className="text-sm text-muted mb-4">Invitations only — no pressure.</p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/rooms/collaborate?compose=collab_invite"
            className="rounded-md border border-foreground/30 px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5"
          >
            Start a collab post
          </Link>
          <Link
            href="/rooms/learn?compose=question"
            className="rounded-md border border-foreground/30 px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5"
          >
            Ask a question
          </Link>
          <Link
            href="/rooms/listen?compose=share_work"
            className="rounded-md border border-foreground/30 px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5"
          >
            Share what you&apos;re working on
          </Link>
        </div>
      </section>
    </div>
  );
}
