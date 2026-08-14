const storageKey = (userId: string) => `angel_island_reads_${userId}`;

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

export function getLastReadAt(userId: string, inviteId: string): string | null {
  return loadMap(userId)[inviteId] ?? null;
}

export function markConversationRead(
  userId: string,
  inviteId: string,
  at: string = new Date().toISOString()
) {
  const map = loadMap(userId);
  map[inviteId] = at;
  saveMap(userId, map);
}

export function isConversationUnread(
  userId: string,
  preview: {
    id: string;
    lastActivityAt: string;
    lastMessageSenderId?: string | null;
  },
  openInviteId?: string | null
): boolean {
  if (openInviteId === preview.id) return false;
  if (!preview.lastMessageSenderId || preview.lastMessageSenderId === userId) return false;

  const lastRead = getLastReadAt(userId, preview.id);
  if (!lastRead) return true;
  return new Date(preview.lastActivityAt).getTime() > new Date(lastRead).getTime();
}
