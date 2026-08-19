export type PostIntent = "conversation" | "question" | "collab_invite" | "idea" | "share_work";

export interface Room {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  purpose_norms: string | null;
  best_for: string[];
  created_at: string;
}

export interface RoomMember {
  id: string;
  room_id: string;
  user_id: string;
  created_at: string;
}

export interface Post {
  id: string;
  room_id: string;
  author_id: string;
  intent: PostIntent;
  title: string | null;
  body: string;
  media_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PostComment {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

export type OpenToQuestions = "yes" | "sometimes" | "not_now";

export interface Profile {
  id: string;
  username: string | null;
  first_name: string | null;
  pronouns: string | null;
  location: string | null;
  about: string | null;
  here_for: string[];
  open_to: string[];
  roles: string[];
  collaborate_as: string[];
  genres_make: string[];
  genres_love: string[];
  working_style: string[];
  open_to_questions: OpenToQuestions | null;
  work_links: string | null;
  avatar_url: string | null;
  notify_email_messages: boolean;
  notify_email_collab: boolean;
  notify_push_collab: boolean;
  onboarding_complete: boolean;
  updated_at: string;
}

export function normalizeProfile(row: Partial<Profile> & { id: string }): Profile {
  return {
    id: row.id,
    username: row.username ?? null,
    first_name: row.first_name ?? null,
    pronouns: row.pronouns ?? null,
    location: row.location ?? null,
    about: row.about ?? null,
    here_for: row.here_for ?? [],
    open_to: row.open_to ?? [],
    roles: row.roles ?? [],
    collaborate_as: row.collaborate_as ?? [],
    genres_make: row.genres_make ?? [],
    genres_love: row.genres_love ?? [],
    working_style: row.working_style ?? [],
    open_to_questions: row.open_to_questions ?? null,
    work_links: row.work_links ?? null,
    avatar_url: row.avatar_url ?? null,
    notify_email_messages: row.notify_email_messages ?? true,
    notify_email_collab: row.notify_email_collab ?? true,
    notify_push_collab: row.notify_push_collab ?? false,
    onboarding_complete: row.onboarding_complete ?? false,
    updated_at: row.updated_at ?? "",
  };
}

export const POST_INTENT_LABELS: Record<PostIntent, string> = {
  conversation: "Conversation",
  question: "Question",
  collab_invite: "Collab invite",
  idea: "Idea",
  share_work: "Share work",
};

export type ChatInviteStatus = "pending" | "accepted" | "declined" | "cancelled";
export type ConversationStatus = "active" | "paused" | "ended";

export interface ChatInvite {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: ChatInviteStatus;
  optional_message: string | null;
  conversation_status: ConversationStatus;
  paused_at: string | null;
  paused_by: string | null;
  ended_at: string | null;
  created_at: string;
}

export function normalizeConversationStatus(
  value: string | null | undefined
): ConversationStatus {
  if (value === "paused" || value === "ended") return value;
  return "active";
}

export interface Message {
  id: string;
  invite_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export type CollabPace = "low-pressure" | "structured" | "flexible";
export type CollabInviteStatus = "pending" | "interested" | "maybe" | "not_fit" | "cancelled";

export type CollaborationStatus = "active" | "paused" | "ended";
export type CollaborationEntryType = "note" | "reference" | "step";

export interface Collaboration {
  id: string;
  collab_invite_id: string;
  chat_invite_id: string | null;
  status: CollaborationStatus;
  paused_at: string | null;
  paused_by: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CollaborationEntry {
  id: string;
  collaboration_id: string;
  author_id: string;
  entry_type: CollaborationEntryType;
  body: string | null;
  url: string | null;
  is_done: boolean;
  created_at: string;
  updated_at: string;
}

export const COLLAB_PACE_LABELS: Record<CollabPace, string> = {
  "low-pressure": "Low-pressure",
  structured: "Structured",
  flexible: "Flexible",
};

export interface CollabInvite {
  id: string;
  sender_id: string;
  receiver_id: string;
  about: string;
  message: string | null;
  role: string | null;
  pace: CollabPace | null;
  status: CollabInviteStatus;
  created_at: string;
}

export interface UserBlock {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export type ReportTargetType = "user" | "post" | "comment" | "message" | "conversation";
export type ReportStatus = "pending" | "reviewed" | "dismissed";

export interface Report {
  id: string;
  reporter_id: string;
  target_type: ReportTargetType;
  target_id: string;
  reported_user_id: string | null;
  reason: string;
  details: string | null;
  status: ReportStatus;
  created_at: string;
}

export const REPORT_REASONS = [
  { value: "harassment", label: "Harassment or unwanted contact" },
  { value: "spam", label: "Spam or misleading" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "other", label: "Something else" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["value"];

