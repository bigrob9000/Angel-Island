"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ProfileAttribution } from "@/components/ProfileAttribution";
import {
  confirmCollabAlignment,
  isCollabInviteFullyAligned,
  type CollaborationDetail,
} from "@/lib/collaborations";
import { translatePace, translateProfileOption } from "@/lib/i18n/labels";

type Props = {
  detail: CollaborationDetail;
  userId: string;
  onActivated: (detail: CollaborationDetail) => void;
};

export function CollabAlignmentPanel({ detail, userId, onActivated }: Props) {
  const t = useTranslations("collaborations");
  const tPace = useTranslations("pace");
  const tProfileOptions = useTranslations("profileOptions");
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invite = detail.invite;
  if (!invite || detail.isGroup) return null;
  const confirmedInvite = invite;

  const isInviter = confirmedInvite.sender_id === userId;
  const other = detail.other;
  const fullyAligned = isCollabInviteFullyAligned(confirmedInvite);
  const userConfirmed = isInviter
    ? Boolean(confirmedInvite.inviter_aligned_at)
    : Boolean(confirmedInvite.invitee_aligned_at);
  const waitingOnInviter =
    Boolean(confirmedInvite.invitee_aligned_at) && !confirmedInvite.inviter_aligned_at;

  async function handleConfirm() {
    setActing(true);
    setError(null);
    const result = await confirmCollabAlignment(confirmedInvite.id, userId, {
      about: confirmedInvite.about,
      role: confirmedInvite.role,
      pace: confirmedInvite.pace,
    });
    setActing(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.detail) {
      onActivated(result.detail);
    }
  }

  return (
    <div className="surface space-y-4 p-5 sm:p-6">
      <div>
        <h2 className="font-serif text-lg font-medium text-foreground">{t("alignmentTitle")}</h2>
        <p className="mt-1 text-sm text-muted">{t("alignmentCopy")}</p>
      </div>

      {other && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">{t("alignmentWith")}</p>
          <ProfileAttribution profile={other} className="mt-1 font-medium" />
        </div>
      )}

      <div className="space-y-2 text-sm">
        <p>
          <span className="font-medium text-foreground">{t("aboutLabel")}</span> {confirmedInvite.about}
        </p>
        {confirmedInvite.message && <p className="text-muted">{confirmedInvite.message}</p>}
        {confirmedInvite.role && (
          <p className="text-muted">
            {t("roleLabel")}: {translateProfileOption(confirmedInvite.role, tProfileOptions)}
          </p>
        )}
        {confirmedInvite.pace && (
          <p className="text-muted">
            {t("paceLabel")}: {translatePace(confirmedInvite.pace, tPace)}
          </p>
        )}
      </div>

      {fullyAligned ? (
        <p className="text-sm text-foreground">{t("alignmentComplete")}</p>
      ) : isInviter ? (
        <div className="space-y-3">
          {waitingOnInviter ? (
            <>
              <p className="text-sm text-muted">{t("alignmentInviterPrompt")}</p>
              <button type="button" onClick={handleConfirm} disabled={acting} className="btn-primary">
                {acting ? t("alignmentConfirming") : t("alignmentConfirm")}
              </button>
            </>
          ) : (
            <p className="text-sm text-muted italic">{t("alignmentWaitingInvitee")}</p>
          )}
        </div>
      ) : userConfirmed ? (
        <p className="text-sm text-muted italic">{t("alignmentWaitingInviter")}</p>
      ) : (
        <button type="button" onClick={handleConfirm} disabled={acting} className="btn-primary">
          {acting ? t("alignmentConfirming") : t("alignmentConfirm")}
        </button>
      )}

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
