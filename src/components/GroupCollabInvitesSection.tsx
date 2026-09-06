"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ProfileAttribution } from "@/components/ProfileAttribution";
import { inviteResponseLabel } from "@/lib/i18n/labels";
import {
  cancelGroupCollabInvite,
  formatMemberNames,
  respondToGroupCollabInvite,
  type GroupCollabInviteWithMeta,
} from "@/lib/group-collaborations";

type Props = {
  received?: GroupCollabInviteWithMeta[];
  sent?: GroupCollabInviteWithMeta[];
  onResponded?: () => void;
};

export function GroupCollabInvitesSection({ received = [], sent = [], onResponded }: Props) {
  const t = useTranslations("collaborations");
  const tInvite = useTranslations("inviteResponses");
  const router = useRouter();
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (received.length === 0 && sent.length === 0) return null;

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

  async function cancel(inviteId: string) {
    setActingId(inviteId);
    setError(null);
    const result = await cancelGroupCollabInvite(inviteId);
    setActingId(null);

    if (result.error) {
      setError(result.error);
      return;
    }

    onResponded?.();
  }

  return (
    <>
      {received.length > 0 && (
        <section>
          <h2 className="section-heading">{t("groupInvites")}</h2>
          <p className="section-copy">{t("groupInvitesCopy")}</p>
          {error && (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <ul className="mt-4 space-y-3">
            {received.map((invite) => {
              const others = invite.recipients
                .filter((r) => r.user_id !== invite.creator_id)
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
                    {t("withMembers", { names: formatMemberNames(others), expires })}
                    {pendingCount > 0 ? ` · ${t("stillDeciding", { count: pendingCount })}` : ""}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => respond(invite.id, "interested")}
                      disabled={actingId === invite.id}
                      className="btn-primary btn-sm"
                    >
                      {tInvite("interested")}
                    </button>
                    <button
                      type="button"
                      onClick={() => respond(invite.id, "maybe")}
                      disabled={actingId === invite.id}
                      className="btn-secondary btn-sm"
                    >
                      {tInvite("maybeLater")}
                    </button>
                    <button
                      type="button"
                      onClick={() => respond(invite.id, "not_fit")}
                      disabled={actingId === invite.id}
                      className="btn-secondary btn-sm"
                    >
                      {tInvite("notFit")}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {sent.length > 0 && (
        <section>
          <h2 className="section-heading">{t("groupSent")}</h2>
          <p className="section-copy">{t("groupSentCopy")}</p>
          {error && received.length === 0 && (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <ul className="mt-4 space-y-3">
            {sent.map((invite) => {
              const expires = new Date(invite.expires_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              });
              const pendingCount = invite.recipients.filter((r) => r.status === "pending").length;

              return (
                <li key={invite.id} className="surface p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted">
                        {t("groupInviteLabel")}
                      </p>
                      <p className="mt-1 text-sm font-medium text-foreground">{invite.about}</p>
                      {invite.message && <p className="mt-1 text-sm text-muted">{invite.message}</p>}
                      <p className="mt-2 text-xs text-muted">
                        {t("invitedPeople", {
                          count: invite.recipients.length,
                          expires,
                        })}
                        {pendingCount > 0
                          ? ` · ${t("stillDeciding", { count: pendingCount })}`
                          : ` · ${t("everyoneResponded")}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => cancel(invite.id)}
                      disabled={actingId === invite.id}
                      className="btn-secondary btn-sm shrink-0"
                    >
                      {t("cancelGroupInvite")}
                    </button>
                  </div>
                  <ul className="mt-3 space-y-2 border-t border-foreground/10 pt-3">
                    {invite.recipients.map((recipient) => (
                      <li
                        key={recipient.id}
                        className="flex flex-wrap items-center justify-between gap-2 text-sm"
                      >
                        <ProfileAttribution profile={recipient.profile} />
                        <span className="text-xs text-muted">
                          {inviteResponseLabel(
                            recipient.status as "interested" | "maybe" | "not_fit" | "pending" | "waiting",
                            tInvite,
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}
