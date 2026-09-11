"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ProfileAttribution } from "@/components/ProfileAttribution";
import { createClient } from "@/lib/supabase";
import {
  hideCollaborationFromList,
  permanentlyDeleteCollaboration,
} from "@/lib/collaboration-archive";
import {
  collaborationFocusLine,
  isCollaborationQuiet,
  updateCollaborationStatus,
  type CollaborationPreview,
} from "@/lib/collaborations";
import { collaborationStatusLabel, translatePace } from "@/lib/i18n/labels";
import type { Profile } from "@/lib/types";
import { formatMemberNames } from "@/lib/group-collaborations";

type ModalKind = "remove" | "delete" | null;

type Props = {
  preview: CollaborationPreview;
  className?: string;
  showQuiet?: boolean;
  showActions?: boolean;
  showClosedActions?: boolean;
  unread?: boolean;
  onUpdated?: () => void;
};

export function CollaborationPreviewLink({
  preview,
  className = "",
  showQuiet = true,
  showActions = false,
  showClosedActions = false,
  unread = false,
  onUpdated,
}: Props) {
  const router = useRouter();
  const t = useTranslations("collaborations");
  const tc = useTranslations("common");
  const tPace = useTranslations("pace");
  const tStatus = useTranslations("status");
  const [acting, setActing] = useState(false);
  const [modal, setModal] = useState<ModalKind>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const pace = preview.isGroup ? preview.groupInvite?.pace : preview.invite?.pace;
  const tone = pace ? translatePace(pace, tPace) : null;
  const quietLine =
    showQuiet && preview.status !== "ended" && isCollaborationQuiet(preview.lastActivityAt)
      ? t("quietHint")
      : null;
  const focusLine = collaborationFocusLine(preview);
  const displayFocus =
    focusLine === "Collaboration" ? t("detailTitle") : focusLine;

  const showActionRow =
    showActions &&
    (preview.status === "paused" || (preview.status === "active" && quietLine));

  const showClosedActionRow = showClosedActions && preview.status === "ended";

  async function changeStatus(status: "active" | "paused") {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (status === "paused" && !window.confirm(t("pauseConfirm"))) {
      return;
    }

    setActing(true);
    const result = await updateCollaborationStatus(
      preview.id,
      status,
      user.id,
      preview.chat_invite_id,
    );
    setActing(false);

    if (result.error) return;

    onUpdated?.();
    if (status === "active") {
      router.push(`/collaborations/${preview.id}`);
    }
  }

  async function handleRemoveFromList() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setActing(true);
    setActionError(null);
    const { error } = await hideCollaborationFromList(user.id, preview.id);
    setActing(false);
    setModal(null);

    if (error) {
      setActionError(error);
      return;
    }

    onUpdated?.();
  }

  async function handleDeletePermanently() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setActing(true);
    setActionError(null);
    const { error } = await permanentlyDeleteCollaboration(user.id, preview.id);
    setActing(false);
    setModal(null);

    if (error) {
      setActionError(error);
      return;
    }

    onUpdated?.();
  }

  return (
    <>
      <div className={`surface text-foreground ${className}`.trim()}>
        <Link
          href={`/collaborations/${preview.id}`}
          className={`block px-4 py-3 transition-colors rounded-[1rem] hover:bg-white/30 ${
            unread ? "ring-1 ring-accent/15" : ""
          }`}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            {preview.isGroup ? (
              <span className="font-medium text-foreground">
                {t("groupWithMembers", {
                  names: formatMemberNames((preview.members ?? []) as Profile[]),
                })}
              </span>
            ) : (
              <ProfileAttribution profile={preview.other} className="font-medium" />
            )}
            <div className="flex items-center gap-2">
              {unread && (
                <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />
              )}
              <span className="text-xs text-muted">
                {collaborationStatusLabel(preview.status, tStatus)}
              </span>
            </div>
          </div>
          <p className={`mt-2 text-sm ${unread ? "font-medium text-foreground" : "text-foreground"}`}>
            {displayFocus}
          </p>
          {tone && <p className="mt-1 text-sm text-muted">{tone}</p>}
          {quietLine && <p className="mt-2 text-xs text-muted italic">{quietLine}</p>}
          <p className="mt-2 text-xs text-muted">
            {t("lastActivity", {
              date: new Date(preview.lastActivityAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              }),
            })}
          </p>
        </Link>

        {showActionRow && (
          <div className="flex flex-wrap gap-2 border-t border-foreground/10 px-4 py-3">
            {preview.status === "paused" && (
              <button
                type="button"
                onClick={() => changeStatus("active")}
                disabled={acting}
                className="btn-primary btn-sm"
              >
                {t("resume")}
              </button>
            )}
            {preview.status === "active" && quietLine && (
              <>
                <Link
                  href={`/collaborations/${preview.id}`}
                  className="btn-secondary btn-sm"
                >
                  {t("pickBackUp")}
                </Link>
                <button
                  type="button"
                  onClick={() => changeStatus("paused")}
                  disabled={acting}
                  className="btn-secondary btn-sm"
                >
                  {t("pause")}
                </button>
              </>
            )}
          </div>
        )}

        {showClosedActionRow && (
          <div className="space-y-2 border-t border-foreground/10 px-4 py-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setModal("remove")}
                disabled={acting}
                className="btn-secondary btn-sm"
              >
                {t("removeFromList")}
              </button>
              <button
                type="button"
                onClick={() => setModal("delete")}
                disabled={acting}
                className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
              >
                {t("deletePermanently")}
              </button>
            </div>
            {actionError && (
              <p className="text-sm text-red-600" role="alert">
                {actionError}
              </p>
            )}
          </div>
        )}
      </div>

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30"
          aria-modal="true"
          role="dialog"
        >
          <div className="surface max-w-md w-full p-6 shadow-lg">
            {modal === "remove" ? (
              <>
                <h2 className="section-heading">{t("removeTitle")}</h2>
                <p className="mt-3 text-sm text-muted leading-relaxed">{t("removeCopy")}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleRemoveFromList}
                    disabled={acting}
                    className="btn-primary"
                  >
                    {acting ? t("removing") : t("removeFromList")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setModal(null)}
                    className="btn-secondary"
                  >
                    {tc("cancel")}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="section-heading">{t("deleteTitle")}</h2>
                <p className="mt-3 text-sm text-muted leading-relaxed">{t("deleteCopy")}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleDeletePermanently}
                    disabled={acting}
                    className="rounded-md bg-red-800 px-4 py-2 text-sm font-medium text-white hover:bg-red-900 disabled:opacity-50"
                  >
                    {acting ? t("deleting") : t("deletePermanently")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setModal(null)}
                    className="btn-secondary"
                  >
                    {tc("cancel")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
