"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Room, Post, Profile, PostIntent } from "@/lib/types";
import { POST_INTENT_LABELS } from "@/lib/types";
import { normalizeProfile } from "@/lib/types";
import { usePreferences } from "@/components/PreferencesProvider";
import { emptyProfile } from "@/lib/profile";
import { isIntroductionsRoom } from "@/lib/introductions";
import { IntroductionsPinned } from "@/components/IntroductionsPinned";
import { PostCommentSection } from "@/components/PostCommentSection";
import { ProfileAttribution } from "@/components/ProfileAttribution";
import { loadCommentsForPosts, type PostCommentWithAuthor } from "@/lib/post-comments";

const inputClass =
  "mt-1 block w-full rounded-md border border-foreground/20 bg-white px-3 py-2 text-foreground placeholder:text-muted focus:border-foreground/40 focus:outline-none";

const COMPOSE_INTENTS: PostIntent[] = ["conversation", "question", "collab_invite", "idea"];

function parseComposeIntent(value: string | null): PostIntent | null {
  if (!value) return null;
  return COMPOSE_INTENTS.includes(value as PostIntent) ? (value as PostIntent) : null;
}

export default function RoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const isIntroductions = isIntroductionsRoom(slug);
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
  const [submitting, setSubmitting] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [commentsByPost, setCommentsByPost] = useState<Record<string, PostCommentWithAuthor[]>>({});
  const [commentsTableMissing, setCommentsTableMissing] = useState(false);
  const { motionReduced } = usePreferences();

  const myIntroPost = userId ? posts.find((p) => p.author_id === userId) : undefined;

  useEffect(() => {
    if (isIntroductions || !composeFromUrl) return;
    setComposeIntent(composeFromUrl);
    setShowCompose(true);
  }, [isIntroductions, composeFromUrl]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
    });

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
            const postList = (postsRes.data ?? []) as Post[];
            setPosts(postList);

            const authorIds = [...new Set(postList.map((p) => p.author_id))];
            if (authorIds.length > 0) {
              const profRes = await supabase
                .from("profiles")
                .select("id, username, first_name")
                .in("id", authorIds);
              const byId: Record<string, Profile> = {};
              (profRes.data ?? []).forEach((p) => {
                byId[p.id] = normalizeProfile({ ...emptyProfile(p.id), ...p });
              });
              setProfiles(byId);
            }

            if (postList.length > 0) {
              const { byPost, tableMissing } = await loadCommentsForPosts(
                postList.map((p) => p.id)
              );
              setCommentsByPost(byPost);
              setCommentsTableMissing(tableMissing);
            }

            setLoading(false);
          });
      });
  }, [slug]);

  function resetCompose() {
    setShowCompose(false);
    setEditingPost(null);
    setComposeIntent(isIntroductions ? "conversation" : null);
    setComposeTitle("");
    setComposeBody("");
    setComposeError(null);
  }

  function startEditIntro(post: Post) {
    setEditingPost(post);
    setComposeIntent(post.intent);
    setComposeTitle(post.title ?? "");
    setComposeBody(post.body);
    setComposeError(null);
    setShowCompose(true);
  }

  async function handleSubmitPost(e: React.FormEvent) {
    e.preventDefault();
    if (!room || !composeIntent || !composeBody.trim()) return;

    if (isIntroductions && !editingPost && myIntroPost) {
      setComposeError("You already have an introduction here. Edit or delete it to change.");
      return;
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setSubmitting(true);
    setComposeError(null);

    const title = composeTitle.trim() || null;
    const body = composeBody.trim();
    const now = new Date().toISOString();

    if (editingPost) {
      const { data, error } = await supabase
        .from("posts")
        .update({ title, body, updated_at: now })
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

    const { data, error } = await supabase
      .from("posts")
      .insert({
        room_id: room.id,
        author_id: user.id,
        intent: composeIntent,
        title,
        body,
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

  async function handleDeleteIntro(postId: string) {
    if (!userId) return;
    const supabase = createClient();
    setDeletingId(postId);
    const { error } = await supabase.from("posts").delete().eq("id", postId).eq("author_id", userId);
    setDeletingId(null);
    if (error) return;
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    if (editingPost?.id === postId) resetCompose();
  }

  if (loading) {
    return (
      <div>
        <p className="text-muted">Loading…</p>
      </div>
    );
  }

  if (!room) {
    return (
      <div>
        <p className="text-muted">Room not found.</p>
        <Link href="/rooms" className="mt-4 inline-block text-foreground underline hover:no-underline">
          ← Back to Rooms
        </Link>
      </div>
    );
  }

  const intentOptions: PostIntent[] = ["conversation", "question", "collab_invite", "idea"];

  function postIntentLabel(post: Post): string {
    if (isIntroductions) return "Introduction";
    return POST_INTENT_LABELS[post.intent];
  }

  return (
    <div className={`space-y-8 ${motionReduced ? "" : "room-enter"}`}>
      <div>
        <Link href="/rooms" className="text-sm text-muted hover:text-foreground">
          ← Rooms
        </Link>
        <h1 className="font-serif text-2xl font-medium text-foreground mt-2">{room.name}</h1>
        {room.description && <p className="mt-1 text-muted">{room.description}</p>}
        {!isIntroductions && room.purpose_norms && (
          <p className="mt-2 text-sm text-muted border-l-2 border-foreground/20 pl-3">{room.purpose_norms}</p>
        )}
      </div>

      {isIntroductions && <IntroductionsPinned />}

      {!showCompose ? (
        <div className="space-y-2">
          {isIntroductions ? (
            myIntroPost ? (
              <p className="text-sm text-muted">
                You&apos;ve shared an introduction. You can edit or delete it anytime below.
              </p>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setComposeIntent("conversation");
                  setShowCompose(true);
                }}
                className="rounded-md border border-foreground/30 px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5"
              >
                Share your introduction (optional)
              </button>
            )
          ) : (
            <button
              type="button"
              onClick={() => setShowCompose(true)}
              className="rounded-md border border-foreground/30 px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5"
            >
              Want to add something?
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-foreground/10 bg-white/60 p-4">
          {!isIntroductions && !composeIntent ? (
            <div>
              <p className="text-sm text-muted mb-3">Choose what you&apos;re adding:</p>
              <div className="flex flex-wrap gap-2">
                {intentOptions.map((intent) => (
                  <button
                    key={intent}
                    type="button"
                    onClick={() => setComposeIntent(intent)}
                    className="rounded-md border border-foreground/30 px-3 py-1.5 text-sm text-foreground hover:bg-foreground/5"
                  >
                    {POST_INTENT_LABELS[intent]}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={resetCompose}
                className="mt-4 text-sm text-muted hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmitPost} className="space-y-4">
              <p className="text-sm text-muted">
                {isIntroductions
                  ? editingPost
                    ? "Edit your introduction"
                    : "Your introduction — one post per person, edit or delete anytime."
                  : POST_INTENT_LABELS[composeIntent!]}
              </p>
              {!isIntroductions && (
                <label className="block">
                  <span className="text-sm text-muted">Title (optional)</span>
                  <input
                    type="text"
                    value={composeTitle}
                    onChange={(e) => setComposeTitle(e.target.value)}
                    placeholder="Short title"
                    className={inputClass}
                  />
                </label>
              )}
              <label className="block">
                <span className="text-sm text-muted">
                  {isIntroductions ? "Introduce yourself" : "What do you want to say?"}
                </span>
                <textarea
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  required
                  rows={5}
                  className={inputClass}
                  placeholder={
                    isIntroductions
                      ? "A few honest sentences is enough. No pressure to impress."
                      : "Write your post…"
                  }
                />
              </label>
              {composeError && <p className="text-sm text-red-600">{composeError}</p>}
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
                >
                  {submitting
                    ? "Saving…"
                    : isIntroductions
                      ? editingPost
                        ? "Save changes"
                        : "Post introduction"
                      : "Post"}
                </button>
                {!isIntroductions && (
                  <button
                    type="button"
                    onClick={() => {
                      setComposeIntent(null);
                      setComposeTitle("");
                      setComposeBody("");
                    }}
                    className="rounded-md border border-foreground/30 px-4 py-2 text-sm text-muted hover:text-foreground"
                  >
                    Back
                  </button>
                )}
                <button
                  type="button"
                  onClick={resetCompose}
                  className="rounded-md border border-foreground/30 px-4 py-2 text-sm text-muted hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <section>
        <h2 className="font-serif text-lg font-medium text-foreground">
          {isIntroductions ? "Introductions" : "Posts"}
        </h2>
        {posts.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            {isIntroductions
              ? "No introductions yet. You're welcome to listen first — posting is optional."
              : "No posts yet. Start a conversation, ask a question, or invite collaborators."}
          </p>
        ) : (
          <ul className="mt-4 space-y-6">
            {posts.map((post) => {
              const author = profiles[post.author_id];
              const isOwn = post.author_id === userId;
              const time = new Date(post.created_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              });
              return (
                <li key={post.id} className="rounded-lg border border-foreground/10 bg-white/40 p-4">
                  <div className="flex flex-wrap items-baseline gap-2 text-xs text-muted">
                    <span className="rounded bg-foreground/10 px-1.5 py-0.5 font-medium text-foreground">
                      {postIntentLabel(post)}
                    </span>
                    <ProfileAttribution profile={author} />
                    <span>{time}</span>
                  </div>
                  {!isIntroductions && post.title && (
                    <p className="mt-2 font-medium text-foreground">{post.title}</p>
                  )}
                  <p className="mt-2 text-muted whitespace-pre-wrap leading-relaxed">{post.body}</p>
                  {isIntroductions && isOwn && (
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => startEditIntro(post)}
                        className="text-sm text-foreground underline hover:no-underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteIntro(post.id)}
                        disabled={deletingId === post.id}
                        className="text-sm text-muted hover:text-foreground disabled:opacity-50"
                      >
                        {deletingId === post.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  )}
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
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
