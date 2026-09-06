"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ProfileCard } from "@/components/ProfileCard";
import { SearchBar } from "@/components/SearchBar";
import { EmptyState } from "@/components/EmptyState";
import { createClient } from "@/lib/supabase";
import { searchAll, type CollaborationSearchResult, type ConversationSearchResult } from "@/lib/search";
import { rankProfilesForViewer } from "@/lib/discovery";
import {
  collaborationStatusLabel,
  conversationStatusLabel,
} from "@/lib/i18n/labels";
import { translateRoomDescription, translateRoomName } from "@/lib/i18n/rooms";
import { normalizeProfile, type Profile, type Room } from "@/lib/types";

export default function SearchPageContent() {
  const t = useTranslations("search");
  const tStatus = useTranslations("status");
  const tRooms = useTranslations("rooms");
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";

  const [submitted, setSubmitted] = useState("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [people, setPeople] = useState<ReturnType<typeof rankProfilesForViewer>>([]);
  const [conversations, setConversations] = useState<ConversationSearchResult[]>([]);
  const [collaborations, setCollaborations] = useState<CollaborationSearchResult[]>([]);
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

    let rankedPeople = rankProfilesForViewer(null, results.people);
    if (user) {
      const { data: viewerRow } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      const viewer = viewerRow ? normalizeProfile(viewerRow as Profile) : null;
      rankedPeople = rankProfilesForViewer(viewer, results.people);
    }

    setRooms(results.rooms);
    setPeople(rankedPeople);
    setConversations(results.conversations);
    setCollaborations(results.collaborations);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (initialQuery.trim()) {
      runSearch(initialQuery);
    }
  }, [initialQuery, runSearch]);

  const hasResults =
    rooms.length > 0 ||
    people.length > 0 ||
    conversations.length > 0 ||
    collaborations.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-lead">{t("title")}</h1>
        <p className="section-copy">{t("subtitle")}</p>
      </div>

      <SearchBar defaultValue={initialQuery} />

      {loading && <p className="text-sm text-muted">{t("searching")}</p>}

      {searched && !loading && !hasResults && (
        <EmptyState
          title={t("empty")}
          description={t("emptyDescription")}
        >
          <Link href="/rooms" className="btn-secondary">
            {t("exploreRooms")}
          </Link>
          <Link href="/explore" className="btn-secondary">
            {t("explorePeople")}
          </Link>
        </EmptyState>
      )}

      {rooms.length > 0 && (
        <section>
          <h2 className="section-heading">{t("rooms")}</h2>
          <ul className="mt-4 space-y-2">
            {rooms.map((room) => (
              <li key={room.id}>
                <Link
                  href={`/rooms/${room.slug}`}
                  className="surface-interactive block px-4 py-3"
                >
                  <p className="font-medium text-foreground">{translateRoomName(room, tRooms)}</p>
                  {room.description && (
                    <p className="mt-1 text-sm text-muted">{translateRoomDescription(room, tRooms)}</p>
                  )}
                  {submitted && (
                    <p className="mt-2 text-xs text-muted italic">
                      {t("roomMatch", { query: submitted })}
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
          <h2 className="section-heading">{t("people")}</h2>
          <ul className="mt-4 space-y-3">
            {people.map((profile) => (
              <li key={profile.id}>
                <ProfileCard
                  profile={profile}
                  reason={
                    profile.reason ??
                    (submitted ? t("profileMatch", { query: submitted }) : undefined)
                  }
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {conversations.length > 0 && (
        <section>
          <h2 className="section-heading">{t("conversations")}</h2>
          <ul className="mt-4 space-y-2">
            {conversations.map((conv) => {
              const statusLabel = conversationStatusLabel(conv.conversation_status, tStatus);
              return (
                <li key={conv.id}>
                  <Link
                    href={`/messages/${conv.id}`}
                    className="surface-interactive block px-4 py-3"
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
      {collaborations.length > 0 && (
        <section>
          <h2 className="section-heading">{t("collaborations")}</h2>
          <ul className="mt-4 space-y-2">
            {collaborations.map((collab) => {
              const statusLabel = collaborationStatusLabel(collab.status, tStatus);
              return (
                <li key={collab.id}>
                  <Link
                    href={`/collaborations/${collab.id}`}
                    className="surface-interactive block px-4 py-3"
                  >
                    <p className="font-medium text-foreground">
                      {collab.otherName}
                      {statusLabel && (
                        <span className="ml-2 text-xs font-normal text-muted">· {statusLabel}</span>
                      )}
                    </p>
                    <p className="mt-1 text-sm text-muted">{collab.focus}</p>
                    <p className="mt-1 text-sm text-muted truncate">{collab.preview}</p>
                    <p className="mt-2 text-xs text-muted italic">{collab.reason}</p>
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
