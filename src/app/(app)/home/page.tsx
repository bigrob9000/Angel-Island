"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import type { Profile, Room } from "@/lib/types";
import { normalizeProfile } from "@/lib/types";
import { isDiscoverableProfile } from "@/lib/profile";
import { ProfileCard } from "@/components/ProfileCard";
import { SearchBar } from "@/components/SearchBar";
import { ConversationPreviewLink } from "@/components/ConversationPreviewLink";
import { loadConversationPreviews, type ConversationPreview } from "@/lib/conversations";

export default function HomePage() {
  const [dismissedBanner, setDismissedBanner] = useState(false);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [myRooms, setMyRooms] = useState<Room[]>([]);
  const [people, setPeople] = useState<Profile[]>([]);
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      const name = user?.user_metadata?.first_name ?? user?.email?.split("@")[0] ?? null;
      setFirstName(name ?? null);

      if (!user) {
        setConversationsLoading(false);
        return;
      }

      supabase
        .from("profiles")
        .select("*")
        .neq("id", user.id)
        .order("updated_at", { ascending: false })
        .limit(5)
        .then((peopleRes) =>
          setPeople(
            (peopleRes.data ?? [])
              .map((row) => normalizeProfile(row as Profile))
              .filter(isDiscoverableProfile)
          )
        );

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

      loadConversationPreviews(user.id, 5)
        .then(setConversations)
        .catch(() => setConversations([]))
        .finally(() => setConversationsLoading(false));
    });
  }, []);

  const welcomeName = firstName ? `, ${firstName}` : "";

  return (
    <div className="space-y-10">
      {!dismissedBanner && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-foreground/10 bg-white/60 px-4 py-3">
          <p className="text-sm text-muted">
            Start anywhere. Or just look around.
          </p>
          <button
            type="button"
            onClick={() => setDismissedBanner(true)}
            className="text-sm text-muted hover:text-foreground shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      <SearchBar />

      <p className="font-serif text-xl text-foreground sm:text-2xl">
        Welcome back{welcomeName}. Where would you like to spend your time today?
      </p>

      <section>
        <h2 className="font-serif text-lg font-medium text-foreground">Your Spaces</h2>
        <p className="mt-2 text-sm text-muted">
          Rooms you&apos;ve added. No obligation to post — just a place to return to.
        </p>
        {myRooms.length === 0 ? (
          <div className="mt-4 rounded-lg border border-foreground/10 bg-white/40 px-4 py-8 text-center text-sm text-muted">
            No spaces yet. <Link href="/rooms" className="text-foreground underline hover:no-underline">Explore rooms</Link> to add some.
          </div>
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
          People on Angel Island — no ranking by popularity.
        </p>
        {people.length === 0 ? (
          <div className="mt-4 rounded-lg border border-foreground/10 bg-white/40 px-4 py-6 text-center text-sm text-muted">
            <p>Nothing here right now besides you.</p>
            <p className="mt-2">
              <Link href="/explore" className="text-foreground underline hover:no-underline">
                Explore people
              </Link>
              {" "}when others join.
            </p>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {people.map((profile) => (
              <li key={profile.id}>
                <ProfileCard profile={profile} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-serif text-lg font-medium text-foreground">Conversations</h2>
          {conversations.length > 0 && (
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
        ) : conversations.length === 0 ? (
          <div className="mt-4 rounded-lg border border-foreground/10 bg-white/40 px-4 py-6 text-center text-sm text-muted">
            No conversations yet.{" "}
            <Link href="/messages" className="text-foreground underline hover:no-underline">
              Messages
            </Link>
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {conversations.map((conv) => (
              <li key={conv.id}>
                <ConversationPreviewLink conversation={conv} />
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
            href="/rooms/listen?compose=conversation"
            className="rounded-md border border-foreground/30 px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5"
          >
            Share what you&apos;re working on
          </Link>
        </div>
      </section>
    </div>
  );
}
