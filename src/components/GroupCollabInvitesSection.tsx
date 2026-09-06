"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ProfileAttribution } from "@/components/ProfileAttribution";
import {
  formatMemberNames,
  respondToGroupCollabInvite,
  type GroupCollabInviteWithMeta,
} from "@/lib/group-collaborations";

type Props = {
  received: GroupCollabInviteWithMeta[];
  onResponded?: () => void;
};

export function GroupCollabInvitesSection({ received, onResponded }: Props) {
  const t = useTranslations("collaborations");
  const router = useRouter();
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (received.length === 0) return null;

  async function respond(inviteId: string, response: "interested" | "maybe" | "not_fit") {
    setActingId(inviteId);
    setError(null);
    const result = await respondToGroupCollabInvite(inviteId, response);
    setActingId(null);

    if (result.error) {
      setError(result.error);
      return;
    }

    onResponded?.();
    if (result.collaborationId) {
      router.push(`/collaborations/${result.collaborationId}`);
    }
  }

  return (
    <section>
      <h2 className="section-heading">{t("groupInvites")}</h2>
      <p className="section-copy">
        One invite, several people — everyone responds before the workspace opens.
      </p>
      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <ul className="mt-4 space-y-3">
        {received.map((invite) => {
          const others = invite.recipients
            .map((r) => r.profile)
            .filter(Boolean) as NonNullable<(typeof invite.recipients)[0]["profile"]>[];
          const pendingCount = invite.recipients.filter((r) => r.status === "pending").length;
          const expires = new Date(invite.expires_at).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          });

          return (
            <li key={invite.id} className="surface p-4">
              <ProfileAttribution profile={invite.creator} className="font-medium" />
              <p className="mt-2 text-sm font-medium text-foreground">{invite.about}</p>
              {invite.message && <p className="mt-1 text-sm text-muted">{invite.message}</p>}
              <p className="mt-2 text-xs text-muted">
                With {formatMemberNames(others)} · responds by {expires}
                {pendingCount > 0 ? ` · ${pendingCount} still deciding` : ""}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => respond(invite.id, "interested")}
                  disabled={actingId === invite.id}
                  className="btn-primary btn-sm"
                >
                  Interested
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
          );
        })}
      </ul>
    </section>
  );
}
