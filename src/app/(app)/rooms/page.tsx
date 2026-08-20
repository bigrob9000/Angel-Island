"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Room } from "@/lib/types";

function activityLabel(lastAt: string | null): string {
  if (!lastAt) return "Quiet";
  const d = new Date(lastAt);
  const now = new Date();
  const days = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
  if (days <= 1) return "Active this week";
  if (days <= 7) return "Some conversation";
  return "Quiet";
}

/* Positions for room clouds (left %, top %) — well spaced so clouds and labels don’t overlap */
/* Symmetrical: top left/right, middle left/right, bottom center — spaced so no cloud covers another's Add button */
/* Rows spaced so each add button (just under its cloud) sits in clear gap above the next row */
const ROOM_POSITIONS: Array<[number, number]> = [
  [20, 8],    /* top-left */
  [80, 8],    /* top-right */
  [20, 50],   /* middle-left */
  [80, 50],   /* middle-right */
  [50, 92],   /* bottom center */
];

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [memberRoomIds, setMemberRoomIds] = useState<Set<string>>(new Set());
  const [lastActivity, setLastActivity] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("rooms").select("*").order("name"),
      supabase.auth.getUser(),
    ]).then(([roomsRes, userRes]) => {
      if (roomsRes.error) {
        setLoading(false);
        return;
      }
      setRooms(roomsRes.data ?? []);

      const userId = userRes.data.user?.id;
      if (!userId) {
        setLoading(false);
        return;
      }

      supabase
        .from("room_members")
        .select("room_id")
        .eq("user_id", userId)
        .then((membersRes) => {
          if (membersRes.data) {
            setMemberRoomIds(new Set(membersRes.data.map((r) => r.room_id)));
          }
        });

      void Promise.resolve(
        supabase
          .from("posts")
          .select("room_id, created_at")
          .then((postsRes) => {
            const byRoom: Record<string, string> = {};
            (postsRes.data ?? []).forEach((p: { room_id: string; created_at: string }) => {
              const cur = byRoom[p.room_id];
              if (!cur || p.created_at > cur) byRoom[p.room_id] = p.created_at;
            });
            setLastActivity(byRoom);
          })
      ).finally(() => setLoading(false));
    });
  }, []);

  async function toggleMember(e: React.MouseEvent, roomId: string) {
    e.preventDefault();
    e.stopPropagation();
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setTogglingId(roomId);
    const isMember = memberRoomIds.has(roomId);

    if (isMember) {
      await supabase.from("room_members").delete().eq("room_id", roomId).eq("user_id", user.id);
      setMemberRoomIds((prev) => {
        const next = new Set(prev);
        next.delete(roomId);
        return next;
      });
    } else {
      await supabase.from("room_members").insert({ room_id: roomId, user_id: user.id });
      setMemberRoomIds((prev) => new Set(prev).add(roomId));
    }
    setTogglingId(null);
  }

  if (loading) {
    return (
      <div>
        <h1 className="page-lead">Rooms</h1>
        <p className="mt-2 text-muted">Loading…</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-lead">Explore Rooms</h1>
      <p className="section-copy">
        Click a cloud to enter. Read posts, visit profiles, and invite someone to chat when it
        feels right — no obligation to post.
      </p>

      <div className="rooms-web mt-10">
        {rooms.slice(0, ROOM_POSITIONS.length).map((room, i) => {
          const [left, top] = ROOM_POSITIONS[i];
          const isMember = memberRoomIds.has(room.id);
          return (
            <Link
              key={room.id}
              href={`/rooms/${room.slug}`}
              className="room-cloud"
              style={{ left: `${left}%`, top: `${top}%` }}
            >
              <div className="room-cloud-shape" aria-hidden>
                <div className="room-cloud-blob" style={{ width: 110, height: 70, top: 18, left: 32 }} />
                <div className="room-cloud-blob" style={{ width: 88, height: 58, top: 30, left: 84 }} />
                <div className="room-cloud-blob" style={{ width: 78, height: 54, top: 26, left: 110 }} />
                <div className="room-cloud-blob" style={{ width: 65, height: 44, top: 44, left: 62 }} />
              </div>
              <div className="room-cloud-label">
                <span>{room.name}</span>
              </div>
              <button
                type="button"
                onClick={(e) => toggleMember(e, room.id)}
                disabled={togglingId === room.id}
                className="room-cloud-add disabled:opacity-50"
                title={isMember ? "In your rooms" : "Add to My Rooms"}
                aria-label={isMember ? "Added to your rooms" : "Add to My Rooms"}
              >
                {togglingId === room.id ? "…" : isMember ? "✓" : "+"}
              </button>
            </Link>
          );
        })}
      </div>

      <div className="surface mt-24 p-4 text-sm text-muted">
        <p className="font-medium text-foreground mb-1">Activity</p>
        <ul className="space-y-1">
          {rooms.map((room) => (
            <li key={room.id}>
              <Link href={`/rooms/${room.slug}`} className="text-foreground hover:underline">
                {room.name}
              </Link>
              {" — "}
              {activityLabel(lastActivity[room.id] ?? null)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
