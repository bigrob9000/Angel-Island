import { createClient } from "@/lib/supabase";
import type { Profile, UserBlock } from "@/lib/types";
import { normalizeProfile } from "@/lib/types";
import { emptyProfile } from "@/lib/profile";

export type BlockedUser = UserBlock & { profile?: Profile };

export type BlockCheckResult = {
  blockedByMe: boolean;
  blockedByThem: boolean;
  tableMissing: boolean;
};

function isBlocksTableMissing(message: string, code?: string): boolean {
  return message.includes("user_blocks") || code === "PGRST205";
}

export function blocksSetupError(): string {
  return "Blocking isn't set up yet. Run migration 009_user_blocks_and_reports.sql in Supabase (see supabase/RUN-PENDING-MIGRATIONS.md).";
}

export async function loadBlockedUserIds(userId: string): Promise<{
  blockedIds: Set<string>;
  tableMissing: boolean;
}> {
  const supabase = createClient();

  const [iBlocked, blockedMe] = await Promise.all([
    supabase.from("user_blocks").select("blocked_id").eq("blocker_id", userId),
    supabase.from("user_blocks").select("blocker_id").eq("blocked_id", userId),
  ]);

  if (iBlocked.error && isBlocksTableMissing(iBlocked.error.message, iBlocked.error.code)) {
    return { blockedIds: new Set(), tableMissing: true };
  }

  const blockedIds = new Set<string>();
  (iBlocked.data ?? []).forEach((row) => blockedIds.add(row.blocked_id));
  (blockedMe.data ?? []).forEach((row) => blockedIds.add(row.blocker_id));

  return { blockedIds, tableMissing: false };
}

export async function checkBlockBetween(
  userId: string,
  otherUserId: string
): Promise<BlockCheckResult> {
  const supabase = createClient();

  const [iBlocked, blockedMe] = await Promise.all([
    supabase
      .from("user_blocks")
      .select("id")
      .eq("blocker_id", userId)
      .eq("blocked_id", otherUserId)
      .maybeSingle(),
    supabase
      .from("user_blocks")
      .select("id")
      .eq("blocker_id", otherUserId)
      .eq("blocked_id", userId)
      .maybeSingle(),
  ]);

  if (iBlocked.error && isBlocksTableMissing(iBlocked.error.message, iBlocked.error.code)) {
    return { blockedByMe: false, blockedByThem: false, tableMissing: true };
  }

  return {
    blockedByMe: !!iBlocked.data,
    blockedByThem: !!blockedMe.data,
    tableMissing: false,
  };
}

export async function loadBlockedUsers(userId: string): Promise<{
  blocks: BlockedUser[];
  tableMissing: boolean;
  error?: string;
}> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_blocks")
    .select("*")
    .eq("blocker_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    if (isBlocksTableMissing(error.message, error.code)) {
      return { blocks: [], tableMissing: true };
    }
    return { blocks: [], tableMissing: false, error: error.message };
  }

  const blocks = (data ?? []) as UserBlock[];
  const blockedIds = blocks.map((b) => b.blocked_id);
  if (blockedIds.length === 0) return { blocks: [], tableMissing: false };

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, first_name")
    .in("id", blockedIds);

  const profilesById: Record<string, Profile> = {};
  (profiles ?? []).forEach((row) => {
    profilesById[row.id] = normalizeProfile({ ...emptyProfile(row.id), ...row });
  });

  return {
    blocks: blocks.map((block) => ({
      ...block,
      profile: profilesById[block.blocked_id],
    })),
    tableMissing: false,
  };
}

async function endInteractionsBetween(blockerId: string, blockedId: string): Promise<void> {
  const supabase = createClient();
  const now = new Date().toISOString();

  await supabase
    .from("chat_invites")
    .update({ conversation_status: "ended", ended_at: now, paused_by: null })
    .eq("status", "accepted")
    .or(
      `and(sender_id.eq.${blockerId},receiver_id.eq.${blockedId}),and(sender_id.eq.${blockedId},receiver_id.eq.${blockerId})`
    );

  await supabase
    .from("chat_invites")
    .update({ status: "cancelled" })
    .eq("status", "pending")
    .or(
      `and(sender_id.eq.${blockerId},receiver_id.eq.${blockedId}),and(sender_id.eq.${blockedId},receiver_id.eq.${blockerId})`
    );
}

export async function blockUser(
  blockerId: string,
  blockedId: string
): Promise<{ error?: string }> {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "You're signed out. Refresh the page and sign in again." };
  }

  if (user.id === blockedId) {
    return { error: "You can't block yourself." };
  }

  const { data, error } = await supabase
    .from("user_blocks")
    .insert({
      blocker_id: user.id,
      blocked_id: blockedId,
    })
    .select("id")
    .single();

  if (error) {
    if (isBlocksTableMissing(error.message, error.code)) {
      return { error: blocksSetupError() };
    }
    if (error.code === "23505") {
      await endInteractionsBetween(user.id, blockedId);
      return {};
    }
    if (error.code === "42501") {
      return {
        error:
          "Permission denied. Run migration 010_block_rls_fix.sql in Supabase (see supabase/RUN-PENDING-MIGRATIONS.md).",
      };
    }
    return { error: error.message };
  }

  if (!data) {
    return { error: "Block didn't save. Try again." };
  }

  await endInteractionsBetween(user.id, blockedId);
  return {};
}

export async function unblockUser(
  blockerId: string,
  blockedId: string
): Promise<{ error?: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("user_blocks")
    .delete()
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId);

  if (error) {
    if (isBlocksTableMissing(error.message, error.code)) {
      return { error: blocksSetupError() };
    }
    return { error: error.message };
  }

  return {};
}
