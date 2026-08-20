import { createClient } from "@/lib/supabase";

const storageKey = (userId: string) => `angel_island_collab_reads_${userId}`;

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
  for (const [collaborationId, at] of Object.entries(secondary)) {
    const existing = merged[collaborationId];
    if (!existing || new Date(at).getTime() > new Date(existing).getTime()) {
      merged[collaborationId] = at;
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

export function resetCollaborationReadsCache() {
  cachedUserId = null;
  readCache = {};
  readsLoaded = false;
}

async function persistCollaborationRead(userId: string, collaborationId: string, at: string) {
  const supabase = createClient();
  const { error } = await supabase.from("collaboration_reads").upsert(
    {
      user_id: userId,
      collaboration_id: collaborationId,
      last_read_at: at,
    },
    { onConflict: "user_id,collaboration_id" },
  );

  if (error) {
    if (error.message.includes("collaboration_reads")) {
      tableAvailable = false;
      const map = loadLegacyLocalMap(userId);
      map[collaborationId] = at;
      saveLegacyLocalMap(userId, map);
      return;
    }
    console.warn("Could not save collaboration read state:", error.message);
  }
}

async function syncMergedReadsToServer(userId: string, merged: ReadMap, dbMap: ReadMap) {
  const rows = Object.entries(merged)
    .filter(([collaborationId, at]) => {
      const dbAt = dbMap[collaborationId];
      return !dbAt || new Date(at).getTime() > new Date(dbAt).getTime();
    })
    .map(([collaboration_id, last_read_at]) => ({
      user_id: userId,
      collaboration_id,
      last_read_at,
    }));

  if (rows.length === 0) return;

  const supabase = createClient();
  const { error } = await supabase.from("collaboration_reads").upsert(rows, {
    onConflict: "user_id,collaboration_id",
  });

  if (error) {
    if (error.message.includes("collaboration_reads")) {
      tableAvailable = false;
      return;
    }
    console.warn("Could not sync collaboration read state:", error.message);
    return;
  }

  clearLegacyLocalMap(userId);
}

/** Load read timestamps from Supabase (and migrate any legacy localStorage entries). */
export async function ensureCollaborationReadsLoaded(userId: string): Promise<void> {
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
      .from("collaboration_reads")
      .select("collaboration_id, last_read_at")
      .eq("user_id", userId);

    if (error) {
      if (error.message.includes("collaboration_reads")) {
        tableAvailable = false;
      } else {
        console.warn("Could not load collaboration read state:", error.message);
      }
    } else {
      (data ?? []).forEach((row) => {
        dbMap[row.collaboration_id as string] = row.last_read_at as string;
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

export function getCollabLastReadAt(userId: string, collaborationId: string): string | null {
  if (cachedUserId === userId && readsLoaded) {
    return readCache[collaborationId] ?? null;
  }
  return loadLegacyLocalMap(userId)[collaborationId] ?? null;
}

export function markCollaborationRead(
  userId: string,
  collaborationId: string,
  at: string = new Date().toISOString(),
) {
  const atMs = new Date(at).getTime();
  const current =
    cachedUserId === userId && readsLoaded ? readCache[collaborationId] : null;
  if (current && new Date(current).getTime() >= atMs) return;

  if (cachedUserId === userId) {
    readCache[collaborationId] = at;
    readsLoaded = true;
  }

  if (tableAvailable) {
    void persistCollaborationRead(userId, collaborationId, at);
  } else {
    const map = loadLegacyLocalMap(userId);
    map[collaborationId] = at;
    saveLegacyLocalMap(userId, map);
  }
}

export function isCollaborationUnread(
  userId: string,
  preview: {
    id: string;
    lastActivityAt: string;
    lastEntryAuthorId?: string | null;
    status?: string;
  },
  openCollaborationId?: string | null,
): boolean {
  if (preview.status === "ended") return false;
  if (openCollaborationId === preview.id) return false;
  if (!preview.lastEntryAuthorId || preview.lastEntryAuthorId === userId) return false;

  const lastRead = getCollabLastReadAt(userId, preview.id);
  if (!lastRead) return true;
  return new Date(preview.lastActivityAt).getTime() > new Date(lastRead).getTime();
}

export function collabActivityPreview(
  entryType: string,
  body: string | null,
  url: string | null,
): string {
  if (entryType === "reference") {
    return body?.trim() || url?.trim() || "Shared a link";
  }
  if (entryType === "step") {
    return body?.trim() || "Added a next step";
  }
  const text = body?.trim();
  if (!text) return "Added a note";
  return text.length > 80 ? `${text.slice(0, 80).trim()}…` : text;
}

export function collabActivityLabel(entryType: string): string {
  if (entryType === "reference") return "shared a link";
  if (entryType === "step") return "added a next step";
  return "added a note";
}
