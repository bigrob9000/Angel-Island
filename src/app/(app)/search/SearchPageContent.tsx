"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ProfileCard } from "@/components/ProfileCard";
import { SearchBar } from "@/components/SearchBar";
import { createClient } from "@/lib/supabase";
import { searchAll, type ConversationSearchResult } from "@/lib/search";
import { conversationStatusLabel } from "@/lib/conversations";
import type { Profile, Room } from "@/lib/types";

export default function SearchPageContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";

  const [submitted, setSubmitted] = useState("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [people, setPeople] = useState<Profile[]>([]);
  const [conversations, setConversations] = useState<ConversationSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;

    setLoading(true);
    setSubmitted(trimmed);
    setSearched(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const results = await searchAll(trimmed, user?.id);
    setRooms(results.rooms);
    setPeople(results.people);
    setConversations(results.conversations);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (initialQuery.trim()) {
      runSearch(initialQuery);
    }
  }, [initialQuery, runSearch]);

  const hasResults = rooms.length > 0 || people.length > 0 || conversations.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-2xl font-medium text-foreground">Search Angel Island</h1>
        <p className="mt-2 text-sm text-muted">Find rooms, people, and conversations — no popularity ranking.</p>
      </div>

      <SearchBar defaultValue={initialQuery} />

      {loading && <p className="text-sm text-muted">Searching…</p>}

      {searched && !loading && !hasResults && (
        <div className="rounded-lg border border-foreground/10 bg-white/40 px-4 py-8 text-center text-sm text-muted">
          <p>Nothing like that turned up.</p>
          <p className="mt-2">You might try a different word — or explore a room instead.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link href="/rooms" className="text-foreground underline hover:no-underline">
              Explore Rooms
            </Link>
            <Link href="/explore" className="text-foreground underline hover:no-underline">
              Explore People
            </Link>
          </div>
        </div>
      )}

      {rooms.length > 0 && (
        <section>
          <h2 className="font-serif text-lg font-medium text-foreground">Rooms</h2>
          <ul className="mt-4 space-y-2">
            {rooms.map((room) => (
              <li key={room.id}>
                <Link
                  href={`/rooms/${room.slug}`}
                  className="block rounded-lg border border-foreground/10 bg-white/50 px-4 py-3 hover:bg-white/70"
                >
                  <p className="font-medium text-foreground">{room.name}</p>
                  {room.description && <p className="mt-1 text-sm text-muted">{room.description}</p>}
                  {submitted && (
                    <p className="mt-2 text-xs text-muted italic">
                      Matches &ldquo;{submitted}&rdquo; in room name or description
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {people.length > 0 && (
        <section>
          <h2 className="font-serif text-lg font-medium text-foreground">People</h2>
          <ul className="mt-4 space-y-3">
            {people.map((profile) => (
              <li key={profile.id}>
                <ProfileCard
                  profile={profile}
                  reason={submitted ? `Matches "${submitted}" in profile` : undefined}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {conversations.length > 0 && (
        <section>
          <h2 className="font-serif text-lg font-medium text-foreground">Conversations</h2>
          <ul className="mt-4 space-y-2">
            {conversations.map((conv) => {
              const statusLabel = conversationStatusLabel(conv.conversation_status);
              return (
                <li key={conv.id}>
                  <Link
                    href={`/messages/${conv.id}`}
                    className="block rounded-lg border border-foreground/10 bg-white/50 px-4 py-3 hover:bg-white/70"
                  >
                    <p className="font-medium text-foreground">
                      {conv.otherName}
                      {statusLabel && (
                        <span className="ml-2 text-xs font-normal text-muted">· {statusLabel}</span>
                      )}
                    </p>
                    <p className="mt-1 text-sm text-muted truncate">{conv.preview}</p>
                    <p className="mt-2 text-xs text-muted italic">{conv.reason}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
