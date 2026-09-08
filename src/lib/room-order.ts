import { LISTEN_SLUG } from "@/lib/listen";
import type { Room } from "@/lib/types";

/** Listen & Share first — calm showcase room, then alphabetical. */
export function orderRoomsWithListenFirst(rooms: Room[]): Room[] {
  return [...rooms].sort((a, b) => {
    if (a.slug === LISTEN_SLUG) return -1;
    if (b.slug === LISTEN_SLUG) return 1;
    return (a.name ?? "").localeCompare(b.name ?? "", undefined, { sensitivity: "base" });
  });
}
