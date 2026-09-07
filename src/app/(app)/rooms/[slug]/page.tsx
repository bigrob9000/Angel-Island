"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase";
import type { Room, Post, Profile, PostIntent } from "@/lib/types";
import { normalizeProfile } from "@/lib/types";
import { usePreferences } from "@/components/PreferencesProvider";
import { emptyProfile, PROFILE_ATTRIBUTION_FIELDS } from "@/lib/profile";
import { isIntroductionsRoom } from "@/lib/introductions";
import { isListenRoom, LISTEN_COMPOSE_INTENTS, MUSIC_SHARING_DISCLAIMER } from "@/lib/listen";
import { translateRoomDescription, translateRoomName, translateRoomPurposeNorms } from "@/lib/i18n/rooms";
import { IntroductionsPinned } from "@/components/IntroductionsPinned";
import { ListenPinned } from "@/components/ListenPinned";
import { MediaEmbed } from "@/components/MediaEmbed";
import { PostAuthorActions } from "@/components/PostAuthorActions";
import { NotFoundPanel } from "@/components/NotFoundPanel";
import { PageLoading } from "@/components/PageLoading";
import { normalizeMediaUrl } from "@/lib/media-embed";
import { PostCommentSection } from "@/components/PostCommentSection";
import { PostLoveButton } from "@/components/PostLoveButton";
import { TranslatableText } from "@/components/TranslatableText";
import { ProfileAttribution } from "@/components/ProfileAttribution";
import { loadCommentsForPosts, type PostCommentWithAuthor } from "@/lib/post-comments";
import { loadPostLoveState } from "@/lib/post-loves";
import { loadBlockedUserIds } from "@/lib/blocks";
import { RoomSearch } from "@/components/RoomSearch";
import {
  groupRoomSearchResults,
  searchRoomPosts,
  type RoomSearchGroup,
} from "@/lib/room-search";

const inputClass =
  "mt-1 block w-full rounded-md border border-foreground/20 bg-white px-3 py-2 text-foreground placeholder:text-muted focus:border-foreground/40 focus:outline-none";

const COMPOSE_INTENTS: PostIntent[] = [
  "conversation",
  "question",
  "collab_invite",
  "idea",
  "share_work",
];

function parseComposeIntent(value: string | null): PostIntent | null {
  if (!value) return null;
  return COMPOSE_INTENTS.includes(value as PostIntent) ? (value as PostIntent) : null;
}

export default function RoomPage() {
  const t = useTranslations("rooms");
  const tc = useTranslations("common");
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const isIntroductions = isIntroductionsRoom(slug);
  const isListen = isListenRoom(slug);
  const composeFromUrl = parseComposeIntent(searchParams.get("compose"));

  const [room, setRoom] = useState<Room | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [composeIntent, setComposeIntent] = useState<PostIntent | null>(
    isIntroductions ? "conversation" : null
  );
  const [composeTitle, setComposeTitle] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeMediaUrl, setComposeMediaUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [commentsByPost, setCommentsByPost] = useState<Record<string, PostCommentWithAuthor[]>>({});
  const [commentsTableMissing, setCommentsTableMissing] = useState(false);
  const [lovedPostIds, setLovedPostIds] = useState<Set<string>>(new Set());
  const [loveCountByPost, setLoveCountByPost] = useState<Record<string, number>>({});
  const [lovesTableMissing, setLovesTableMissing] = useState(false);
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());
  const [roomSearchQuery, setRoomSearchQuery] = useState("");
  const { motionReduced } = usePreferences();

  const myIntroPost = userId ? posts.find((p) => p.author_id === userId) : undefined;

  const isSearching = roomSearchQuery.trim().length > 0;

  const displayedPosts = useMemo(
    () => searchRoomPosts(posts, profiles, roomSearchQuery, isIntroductions),
    [posts, profiles, roomSearchQuery, isIntroductions]
  );

  const searchGroups = useMemo(
    () =>
      groupRoomSearchResults(displayedPosts, {
        isIntroductions,
        isListen,
      }),
    [displayedPosts, isIntroductions, isListen]
  );

  const postSections: RoomSearchGroup[] = isSearching
    ? searchGroups
    : [{ title: "", posts: displayedPosts }];

  function translateSearchGroupTitle(title: string): string {
    switch (title) {
      case "Recent conversations":
        return t("searchConversations");
      case "Questions":
        return t("searchQuestions");
      case "Collaboration posts":
        return t("searchCollabPosts");
      case "Ideas":
        return t("searchIdeas");
      case "Shared work":
        return t("sharedWork");
      case "Introductions":
        return t("introductions");
      default:
        return title;
    }
  }

  useEffect(() => {
    if (isIntroductions || !composeFromUrl) return;
    if (composeFromUrl === "share_work" && !isListen) return;
    setComposeIntent(composeFromUrl);
    setShowCompose(true);
  }, [isIntroductions, isListen, composeFromUrl]);

  useEffect(() => {
    const supabase = createClient();

    supabase
      .from("rooms")
      .select("*")
      .eq("slug", slug)
      .single()
      .then((res) => {
        if (res.error || !res.data) {
          setRoom(null);
          setLoading(false);
          return;
        }
        setRoom(res.data as Room);

        supabase
          .from("posts")
          .select("*")
          .eq("room_id", res.data.id)
          .order("created_at", { ascending: false })
          .then(async (postsRes) => {
            const {
              data: { user },
            } = await supabase.auth.getUser();
            setUserId(user?.id ?? null);

            const postList = (postsRes.data ?? []) as Post[];
            setPosts(postList);

            const authorIds = [...new Set(postList.map((p) => p.author_id))];
            if (authorIds.length > 0) {
              const profRes = await supabase
                .from("profiles")
                .select(PROFILE_ATTRIBUTION_FIELDS)
                .in("id", authorIds);
              const byId: Record<string, Profile> = {};
              (profRes.data ?? []).forEach((p) => {
                byId[p.id] = normalizeProfile({ ...emptyProfile(p.id), ...p });
              });
              setProfiles(byId);
            }

            if (postList.length > 0) {
              const [{ byPost, tableMissing }, loveState] = await Promise.all([
                loadCommentsForPosts(postList.map((p) => p.id)),
                loadPostLoveState(postList, user?.id ?? null),
              ]);
              setCommentsByPost(byPost);
              setCommentsTableMissing(tableMissing);
              setLovedPostIds(loveState.lovedPostIds);
              setLoveCountByPost(loveState.loveCountByPost);
              setLovesTableMissing(loveState.tableMissing);
            }

            if (user?.id) {
              const { blockedIds } = await loadBlockedUserIds(user.id);
              setBlockedUserIds(blockedIds);
            }

            setLoading(false);
          });
      });
  }, [slug]);

  useEffect(() => {
    if (loading || posts.length === 0) return;
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (!hash.startsWith("#post-")) return;
    const el = document.querySelector(hash);
    el?.scrollIntoView({ behavior: motionReduced ? "auto" : "smooth", block: "center" });
  }, [loading, posts, motionReduced]);

  function resetCompose() {
    setShowCompose(false);
    setEditingPost(null);
    setComposeIntent(isIntroductions ? "conversation" : null);
    setComposeTitle("");
    setComposeBody("");
    setComposeMediaUrl("");
    setComposeError(null);
  }

  function startEditPost(post: Post) {
    setEditingPost(post);
    setComposeIntent(post.intent);
    setComposeTitle(post.title ?? "");
    setComposeBody(post.body);
    setComposeMediaUrl(post.media_url ?? "");
    setComposeError(null);
    setShowCompose(true);
    requestAnimationFrame(() => {
      document.getElementById("room-compose")?.scrollIntoView({
        behavior: motionReduced ? "auto" : "smooth",
        block: "start",
      });
    });
  }

  function intentLabel(intent: PostIntent): string {
    switch (intent) {
      case "conversation":
        return t("intentConversation");
      case "question":
        return t("intentQuestion");
      case "collab_invite":
        return t("intentCollabInvite");
      case "idea":
        return t("intentIdea");
      case "share_work":
        return t("intentShareWork");
      default:
        return intent;
    }
  }

  async function handleSubmitPost(e: React.FormEvent) {
    e.preventDefault();
    if (!room || !composeIntent) return;

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setSubmitting(true);
    setComposeError(null);

    const title = composeTitle.trim() || null;
    const body = composeBody.trim();
    const now = new Date().toISOString();
    const isShareWork = composeIntent === "share_work";

    if (editingPost) {
      const patch: {
        title: string | null;
        body: string;
        updated_at: string;
        media_url?: string | null;
      } = {
        title,
        body,
        updated_at: now,
      };

      if (isShareWork) {
        if (!composeMediaUrl.trim()) {
          setComposeError(t("errorMediaRequired"));
          setSubmitting(false);
          return;
        }
        const normalized = normalizeMediaUrl(composeMediaUrl);
        if (!normalized) {
          setComposeError(t("errorInvalidUrl"));
          setSubmitting(false);
          return;
        }
        patch.media_url = normalized;
      } else if (!body) {
        setComposeError(t("errorBodyRequired"));
        setSubmitting(false);
        return;
      }

      const { data, error } = await supabase
        .from("posts")
        .update(patch)
        .eq("id", editingPost.id)
        .eq("author_id", user.id)
        .select("*")
        .single();

      setSubmitting(false);
      if (error) {
        setComposeError(error.message);
        return;
      }

      const updated = data as Post;
      setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      resetCompose();
      return;
    }

    let mediaUrl: string | null = null;

    if (isShareWork) {
      if (!composeMediaUrl.trim()) {
        setComposeError(t("errorMediaRequired"));
        setSubmitting(false);
        return;
      }
      mediaUrl = normalizeMediaUrl(composeMediaUrl);
      if (!mediaUrl) {
        setComposeError(t("errorInvalidUrl"));
        setSubmitting(false);
        return;
      }
    } else if (!composeBody.trim()) {
      setSubmitting(false);
      return;
    }

    if (isIntroductions && myIntroPost) {
      setComposeError(t("errorIntroExists"));
      setSubmitting(false);
      return;
    }

    const { data, error } = await supabase
      .from("posts")
      .insert({
        room_id: room.id,
        author_id: user.id,
        intent: composeIntent,
        title,
        body,
        media_url: mediaUrl,
      })
      .select("*")
      .single();

    setSubmitting(false);
    if (error) {
      setComposeError(error.message);
      return;
    }

    const newPost = data as Post;
    const authorProfile: Profile = {
      ...emptyProfile(user.id),
      username: user.user_metadata?.username ?? null,
      first_name: user.user_metadata?.first_name ?? null,
    };
    setPosts((prev) => [newPost, ...prev]);
    setProfiles((prev) => ({ ...prev, [user.id]: authorProfile }));
    resetCompose();
  }

  async function handleDeletePost(postId: string) {
    if (!userId) return;
    const supabase = createClient();
    setDeletingId(postId);
    const { error } = await supabase.from("posts").delete().eq("id", postId).eq("author_id", userId);
    setDeletingId(null);
    if (error) return;
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    if (editingPost?.id === postId) resetCompose();
  }

  function handleLoveChange(postId: string, loved: boolean, loveCount: number) {
    setLovedPostIds((prev) => {
      const next = new Set(prev);
      if (loved) next.add(postId);
      else next.delete(postId);
      return next;
    });
    setLoveCountByPost((prev) => ({ ...prev, [postId]: loveCount }));
  }

  if (loading) {
    return <PageLoading />;
  }

  if (!room) {
    return (
      <NotFoundPanel
        title={t("notFound")}
        description={t("notFoundDescription")}
        backHref="/rooms"
        backLabel={t("backToRooms")}
      />
    );
  }

  const intentOptions: PostIntent[] = isListen
    ? [...LISTEN_COMPOSE_INTENTS]
    : ["conversation", "question", "collab_invite", "idea"];

  function postIntentLabel(post: Post): string {
    if (isIntroductions) return t("intentIntroduction");
    return intentLabel(post.intent);
  }

  function renderPost(post: Post) {
    const author = profiles[post.author_id];
    const isOwn = post.author_id === userId;
    const time = new Date(post.created_at).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

    const edited =
      post.updated_at &&
      new Date(post.updated_at).getTime() > new Date(post.created_at).getTime() + 1000;

    return (
      <li id={`post-${post.id}`} key={post.id} className="surface p-4 scroll-mt-24">
        <div className="flex flex-wrap items-baseline gap-2 text-xs text-muted">
          <span className="chip chip-muted text-xs">
            {postIntentLabel(post)}
          </span>
          <ProfileAttribution profile={author} />
          <span>
            {time}
            {edited && <span className="text-muted/80"> · {t("edited")}</span>}
          </span>
        </div>
        {!isIntroductions && post.title && (
          <TranslatableText
            text={post.title}
            as="p"
            className="mt-2 font-medium text-foreground"
          />
        )}
        {post.media_url && <MediaEmbed url={post.media_url} />}
        {post.body && (
          <TranslatableText
            text={post.body}
            className="mt-2 text-muted whitespace-pre-wrap leading-relaxed"
          />
        )}
        <PostAuthorActions
          username={author?.username ?? ""}
          roomSlug={slug}
          postId={post.id}
          isOwn={isOwn}
          interactionBlocked={blockedUserIds.has(post.author_id)}
        />
        {isOwn && (
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => startEditPost(post)}
              className="text-sm text-foreground underline hover:no-underline"
            >
              {t("editPost")}
            </button>
            <button
              type="button"
              onClick={() => handleDeletePost(post.id)}
              disabled={deletingId === post.id}
              className="text-sm text-muted hover:text-foreground disabled:opacity-50"
            >
              {deletingId === post.id ? t("deleting") : t("deletePost")}
            </button>
          </div>
        )}
        <PostLoveButton
          postId={post.id}
          postAuthorId={post.author_id}
          userId={userId}
          isOwn={isOwn}
          loved={lovedPostIds.has(post.id)}
          loveCount={loveCountByPost[post.id] ?? 0}
          interactionBlocked={blockedUserIds.has(post.author_id)}
          tableMissing={lovesTableMissing}
          onLovedChange={handleLoveChange}
        />
        <PostCommentSection
          postId={post.id}
          postAuthorId={post.author_id}
          userId={userId}
          comments={commentsByPost[post.id] ?? []}
          tableMissing={commentsTableMissing}
          variant={isIntroductions ? "introductions" : "room"}
          onCommentsChange={(postId, comments) =>
            setCommentsByPost((prev) => ({ ...prev, [postId]: comments }))
          }
        />
      </li>
    );
  }

  return (
    <div className={`space-y-8 ${motionReduced ? "" : "room-enter"}`}>
      <div>
        <Link href="/rooms" className="text-sm text-muted hover:text-foreground">
          {t("backToRooms")}
        </Link>
        <h1 className="page-lead mt-2">{translateRoomName(room, t)}</h1>
        {room.description && (
          <p className="mt-1 text-muted">{translateRoomDescription(room, t)}</p>
        )}
        {!isIntroductions && room.purpose_norms && (
          <p className="mt-2 text-sm text-muted border-l-2 border-foreground/20 pl-3">
            {translateRoomPurposeNorms(room, t)}
          </p>
        )}
      </div>

      {isIntroductions && <IntroductionsPinned />}
      {isListen && <ListenPinned />}

      {posts.length > 0 && (
        <RoomSearch value={roomSearchQuery} onChange={setRoomSearchQuery} />
      )}

      {!showCompose ? (
        <div className="space-y-2">
          {isIntroductions ? (
            myIntroPost ? (
              <p className="text-sm text-muted">{t("introAlreadyShared")}</p>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setComposeIntent("conversation");
                  setShowCompose(true);
                }}
                className="btn-secondary"
              >
                {t("shareIntroduction")}
              </button>
            )
          ) : isListen ? (
            <button
              type="button"
              onClick={() => {
                setComposeIntent("share_work");
                setShowCompose(true);
              }}
              className="btn-secondary"
              >
              {t("shareWorkingOn")}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowCompose(true)}
              className="btn-secondary"
            >
              {t("addSomething")}
            </button>
          )}
        </div>
      ) : (
        <div id="room-compose" className="surface p-4 scroll-mt-24">
          {!isIntroductions && !composeIntent ? (
            <div>
              <p className="text-sm text-muted mb-3">{t("chooseIntent")}</p>
              <div className="flex flex-wrap gap-2">
                {intentOptions.map((intent) => (
                  <button
                    key={intent}
                    type="button"
                    onClick={() => setComposeIntent(intent)}
                    className="chip chip-muted"
                  >
                    {intentLabel(intent)}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={resetCompose}
                className="mt-4 btn-secondary btn-sm"
              >
                {tc("cancel")}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmitPost} className="space-y-4">
              <p className="text-sm text-muted">
                {isIntroductions
                  ? editingPost
                    ? t("editIntroduction")
                    : t("introComposeCopy")
                  : editingPost
                    ? t("editPostHeading")
                    : intentLabel(composeIntent!)}
              </p>
              {!isIntroductions && (
                <label className="block">
                  <span className="text-sm text-muted">{t("titleOptional")}</span>
                  <input
                    type="text"
                    value={composeTitle}
                    onChange={(e) => setComposeTitle(e.target.value)}
                    placeholder={
                      composeIntent === "share_work" ? t("titleShareWorkPlaceholder") : t("titlePlaceholder")
                    }
                    className={inputClass}
                  />
                </label>
              )}
              {composeIntent === "share_work" && (
                <>
                  <label className="block">
                    <span className="text-sm text-muted">{t("mediaUrlLabel")}</span>
                    <input
                      type="url"
                      value={composeMediaUrl}
                      onChange={(e) => setComposeMediaUrl(e.target.value)}
                      required
                      placeholder={t("mediaUrlPlaceholder")}
                      className={inputClass}
                    />
                  </label>
                  <p className="text-xs text-muted leading-relaxed">{MUSIC_SHARING_DISCLAIMER}</p>
                </>
              )}
              <label className="block">
                <span className="text-sm text-muted">
                  {isIntroductions
                    ? t("introduceYourself")
                    : composeIntent === "share_work"
                      ? t("shareWorkNoteLabel")
                      : t("bodyLabel")}
                </span>
                <textarea
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  required={
                    composeIntent !== "share_work" && !isIntroductions
                  }
                  rows={composeIntent === "share_work" ? 3 : 5}
                  className={inputClass}
                  placeholder={
                    isIntroductions
                      ? t("introBodyPlaceholder")
                      : composeIntent === "share_work"
                        ? t("shareWorkBodyPlaceholder")
                        : t("bodyPlaceholder")
                  }
                />
              </label>
              {composeError && <p className="text-sm text-red-600">{composeError}</p>}
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary"
                >
                  {submitting
                    ? tc("saving")
                    : editingPost
                      ? t("saveChanges")
                      : isIntroductions
                        ? t("postIntroduction")
                        : composeIntent === "share_work"
                          ? t("share")
                          : t("post")}
                </button>
                {!isIntroductions && (
                  <button
                    type="button"
                    onClick={() => {
                      setComposeIntent(null);
                      setComposeTitle("");
                      setComposeBody("");
                      setComposeMediaUrl("");
                    }}
                    className="btn-secondary"
                  >
                    {t("back")}
                  </button>
                )}
                <button
                  type="button"
                  onClick={resetCompose}
                  className="btn-secondary"
                >
                  {tc("cancel")}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <section>
        <h2 className="section-heading">
          {isSearching
            ? t("results")
            : isIntroductions
              ? t("introductions")
              : isListen
                ? t("sharedWork")
                : t("posts")}
        </h2>
        {posts.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            {isIntroductions
              ? t("emptyIntro")
              : isListen
                ? t("emptyListen")
                : t("emptyPosts")}
          </p>
        ) : isSearching && displayedPosts.length === 0 ? (
          <div className="mt-4 surface px-4 py-8 text-center text-sm text-muted">
            <p>{t("searchNoResults")}</p>
            <p className="mt-2">{t("searchNoResultsHint")}</p>
          </div>
        ) : (
          <div className="mt-4 space-y-8">
            {postSections.map((section) => (
              <div key={section.title || "all"}>
                {isSearching && section.title && (
                  <h3 className="mb-3 text-sm font-medium text-foreground">
                    {translateSearchGroupTitle(section.title)}
                  </h3>
                )}
                <ul className="space-y-6">{section.posts.map((post) => renderPost(post))}</ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
