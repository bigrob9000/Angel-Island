import { createClient } from "@/lib/supabase";

const storageKey = (userId: string) => `angel_island_reads_${userId}`;

type ReadMap = Record<string, string>;

let cachedUserId: string | null = null;
let readCache: ReadMap = {};
let readsLoaded = false;
let tableAvailable = true;

function loadLegacyLocalMap(userId: string): ReadMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    return raw ? (JSON.parse(raw) as ReadMap) : {};
  } catch {
    return {};
  }
}

function saveLegacyLocalMap(userId: string, map: ReadMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(map));
  } catch {
    /* ignore quota errors */
  }
}

function mergeReadMaps(primary: ReadMap, secondary: ReadMap): ReadMap {
  const merged = { ...primary };
  for (const [inviteId, at] of Object.entries(secondary)) {
    const existing = merged[inviteId];
    if (!existing || new Date(at).getTime() > new Date(existing).getTime()) {
      merged[inviteId] = at;
    }
  }
  return merged;
}

function clearLegacyLocalMap(userId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(userId));
  } catch {
    /* ignore */
  }
}

export function resetConversationReadsCache() {
  cachedUserId = null;
  readCache = {};
  readsLoaded = false;
}

async function persistConversationRead(userId: string, inviteId: string, at: string) {
  const supabase = createClient();
  const { error } = await supabase.from("conversation_reads").upsert(
    {
      user_id: userId,
      invite_id: inviteId,
      last_read_at: at,
    },
    { onConflict: "user_id,invite_id" },
  );

  if (error) {
    if (error.message.includes("conversation_reads")) {
      tableAvailable = false;
      const map = loadLegacyLocalMap(userId);
      map[inviteId] = at;
      saveLegacyLocalMap(userId, map);
      return;
    }
    console.warn("Could not save conversation read state:", error.message);
  }
}

async function syncMergedReadsToServer(userId: string, merged: ReadMap, dbMap: ReadMap) {
  const rows = Object.entries(merged)
    .filter(([inviteId, at]) => {
      const dbAt = dbMap[inviteId];
      return !dbAt || new Date(at).getTime() > new Date(dbAt).getTime();
    })
    .map(([invite_id, last_read_at]) => ({
      user_id: userId,
      invite_id,
      last_read_at,
    }));

  if (rows.length === 0) return;

  const supabase = createClient();
  const { error } = await supabase.from("conversation_reads").upsert(rows, {
    onConflict: "user_id,invite_id",
  });

  if (error) {
    if (error.message.includes("conversation_reads")) {
      tableAvailable = false;
      return;
    }
    console.warn("Could not sync conversation read state:", error.message);
    return;
  }

  clearLegacyLocalMap(userId);
}

/** Load read timestamps from Supabase (and migrate any legacy localStorage entries). */
export async function ensureConversationReadsLoaded(userId: string): Promise<void> {
  if (readsLoaded && cachedUserId === userId) return;

  if (cachedUserId !== userId) {
    readCache = {};
    readsLoaded = false;
    cachedUserId = userId;
  }

  const legacy = loadLegacyLocalMap(userId);
  let dbMap: ReadMap = {};

  if (tableAvailable) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("conversation_reads")
      .select("invite_id, last_read_at")
      .eq("user_id", userId);

    if (error) {
      if (error.message.includes("conversation_reads")) {
        tableAvailable = false;
      } else {
        console.warn("Could not load conversation read state:", error.message);
      }
    } else {
      (data ?? []).forEach((row) => {
        dbMap[row.invite_id as string] = row.last_read_at as string;
      });
    }
  }

  if (tableAvailable) {
    readCache = mergeReadMaps(dbMap, legacy);
    await syncMergedReadsToServer(userId, readCache, dbMap);
  } else {
    readCache = mergeReadMaps(legacy, dbMap);
  }

  readsLoaded = true;
}

export function getLastReadAt(userId: string, inviteId: string): string | null {
  if (cachedUserId === userId && readsLoaded) {
    return readCache[inviteId] ?? null;
  }
  return loadLegacyLocalMap(userId)[inviteId] ?? null;
}

export function markConversationRead(
  userId: string,
  inviteId: string,
  at: string = new Date().toISOString(),
) {
  const atMs = new Date(at).getTime();
  const current = cachedUserId === userId && readsLoaded ? readCache[inviteId] : null;
  if (current && new Date(current).getTime() >= atMs) return;

  if (cachedUserId === userId) {
    readCache[inviteId] = at;
    readsLoaded = true;
  }

  if (tableAvailable) {
    void persistConversationRead(userId, inviteId, at);
  } else {
    const map = loadLegacyLocalMap(userId);
    map[inviteId] = at;
    saveLegacyLocalMap(userId, map);
  }
}

export function isConversationUnread(
  userId: string,
  preview: {
    id: string;
    lastActivityAt: string;
    lastMessageSenderId?: string | null;
  },
  openInviteId?: string | null,
): boolean {
  if (openInviteId === preview.id) return false;
  if (!preview.lastMessageSenderId || preview.lastMessageSenderId === userId) return false;

  const lastRead = getLastReadAt(userId, preview.id);
  if (!lastRead) return true;
  return new Date(preview.lastActivityAt).getTime() > new Date(lastRead).getTime();
}
