const storageKey = (userId: string) => `angel_island_collab_reads_${userId}`;

type ReadMap = Record<string, string>;

function loadMap(userId: string): ReadMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    return raw ? (JSON.parse(raw) as ReadMap) : {};
  } catch {
    return {};
  }
}

function saveMap(userId: string, map: ReadMap) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(userId), JSON.stringify(map));
}

export function getCollabLastReadAt(userId: string, collaborationId: string): string | null {
  return loadMap(userId)[collaborationId] ?? null;
}

export function markCollaborationRead(
  userId: string,
  collaborationId: string,
  at: string = new Date().toISOString(),
) {
  const map = loadMap(userId);
  map[collaborationId] = at;
  saveMap(userId, map);
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
