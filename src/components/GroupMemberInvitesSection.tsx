"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProfileAttribution } from "@/components/ProfileAttribution";
import { respondToGroupCollabMemberInvite } from "@/lib/group-collaborations";
import type { GroupCollabMemberInvite } from "@/lib/types";
import type { Profile } from "@/lib/types";

type InviteRow = GroupCollabMemberInvite & {
  inviter?: Profile;
  collaborationAbout?: string;
};

type Props = {
  invites: InviteRow[];
  onResponded?: () => void;
};

export function GroupMemberInvitesSection({ invites, onResponded }: Props) {
  const router = useRouter();
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (invites.length === 0) return null;

  async function respond(inviteId: string, response: "interested" | "maybe" | "not_fit") {
    setActingId(inviteId);
    setError(null);
    const result = await respondToGroupCollabMemberInvite(inviteId, response);
    setActingId(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    onResponded?.();
    if (result.collaborationId && response === "interested") {
      router.push(`/collaborations/${result.collaborationId}`);
    }
  }

  return (
    <section>
      <h2 className="section-heading">Join a group collab</h2>
      <p className="section-copy">Someone invited you to join an existing group workspace.</p>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <ul className="mt-4 space-y-3">
        {invites.map((invite) => (
          <li key={invite.id} className="surface p-4">
            <ProfileAttribution profile={invite.inviter} className="font-medium" />
            <p className="mt-2 text-sm text-foreground">{invite.collaborationAbout ?? "Group collaboration"}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => respond(invite.id, "interested")}
                disabled={actingId === invite.id}
                className="btn-primary btn-sm"
              >
                Join
              </button>
              <button
                type="button"
                onClick={() => respond(invite.id, "maybe")}
                disabled={actingId === invite.id}
                className="btn-secondary btn-sm"
              >
                Maybe later
              </button>
              <button
                type="button"
                onClick={() => respond(invite.id, "not_fit")}
                disabled={actingId === invite.id}
                className="btn-secondary btn-sm"
              >
                Not a fit
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
