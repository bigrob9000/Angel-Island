import type { Room } from "@/lib/types";
import type { TranslateFn } from "@/lib/i18n/labels";

/** Room slugs seeded in Supabase — display copy is translated by slug, not DB text. */
export const KNOWN_ROOM_SLUGS = [
  "introductions",
  "jam",
  "learn",
  "collaborate",
  "listen",
] as const;

export type KnownRoomSlug = (typeof KNOWN_ROOM_SLUGS)[number];

function isKnownRoomSlug(slug: string): slug is KnownRoomSlug {
  return (KNOWN_ROOM_SLUGS as readonly string[]).includes(slug);
}

type RoomTextField = "name" | "description" | "purposeNorms";

function translateRoomField(
  slug: string,
  field: RoomTextField,
  fallback: string | null | undefined,
  t: TranslateFn,
): string {
  if (!slug || !isKnownRoomSlug(slug)) {
    return fallback?.trim() || "";
  }
  return t(`catalog.${slug}.${field}`);
}

export function translateRoomName(room: Pick<Room, "slug" | "name">, t: TranslateFn): string {
  return translateRoomField(room.slug, "name", room.name, t);
}

export function translateRoomDescription(
  room: Pick<Room, "slug" | "description">,
  t: TranslateFn,
): string {
  return translateRoomField(room.slug, "description", room.description, t);
}

export function translateRoomPurposeNorms(
  room: Pick<Room, "slug" | "purpose_norms">,
  t: TranslateFn,
): string {
  return translateRoomField(room.slug, "purposeNorms", room.purpose_norms, t);
}
